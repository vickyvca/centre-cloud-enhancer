import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { db } from "@/lib/database";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { formatRupiah, generateInvoiceNo } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Loader2,
  ShoppingCart,
} from "lucide-react";
import { ReceiptDialog } from "@/components/pos/ReceiptDialog";

interface Item {
  id: string;
  code: string | null;
  barcode: string | null;
  name: string;
  sell_price: number;
  sell_price_lv2: number;
  sell_price_lv3: number;
  discount_pct: number;
  stock: number;
  unit: string | null;
}

interface CartItem {
  item: Item;
  qty: number;
  price: number;
  discount_pct: number;
  subtotal: number;
}

interface ReceiptData {
  invoiceNo: string;
  date: Date;
  customerName?: string;
  cashierName?: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
    discount_pct: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: string;
}

export default function POS() {
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [priceLevel, setPriceLevel] = useState("1");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await db.select<Item>("items", {
        where: { is_active: true },
        orderBy: "name",
      });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (item: Item, level: string) => {
    switch (level) {
      case "2":
        return Number(item.sell_price_lv2) || Number(item.sell_price);
      case "3":
        return Number(item.sell_price_lv3) || Number(item.sell_price);
      default:
        return Number(item.sell_price);
    }
  };

  const addToCart = (item: Item) => {
    const existingIndex = cart.findIndex((c) => c.item.id === item.id);
    const price = getPrice(item, priceLevel);
    const discount = Number(item.discount_pct);

    if (existingIndex >= 0) {
      const newQty = cart[existingIndex].qty + 1;
      if (newQty > Number(item.stock)) {
        toast({
          variant: "destructive",
          title: "Stok tidak cukup",
          description: `Stok ${item.name} hanya ${item.stock}`,
        });
        return;
      }
      const newCart = [...cart];
      newCart[existingIndex].qty = newQty;
      newCart[existingIndex].subtotal = newQty * price * (1 - discount / 100);
      setCart(newCart);
    } else {
      if (Number(item.stock) < 1) {
        toast({
          variant: "destructive",
          title: "Stok habis",
          description: `${item.name} tidak tersedia`,
        });
        return;
      }
      setCart([
        ...cart,
        {
          item,
          qty: 1,
          price,
          discount_pct: discount,
          subtotal: price * (1 - discount / 100),
        },
      ]);
    }
    setSearch("");
    searchRef.current?.focus();
  };

  const updateQty = (index: number, delta: number) => {
    const newCart = [...cart];
    const newQty = newCart[index].qty + delta;

    if (newQty <= 0) {
      newCart.splice(index, 1);
    } else if (newQty > Number(newCart[index].item.stock)) {
      toast({
        variant: "destructive",
        title: "Stok tidak cukup",
      });
      return;
    } else {
      newCart[index].qty = newQty;
      newCart[index].subtotal =
        newQty * newCart[index].price * (1 - newCart[index].discount_pct / 100);
    }
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const subtotal = cart.reduce((sum, c) => sum + c.subtotal, 0);
  const grandTotal = subtotal;
  const changeAmount = Math.max(0, paidAmount - grandTotal);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ variant: "destructive", title: "Keranjang kosong" });
      return;
    }

    if (paidAmount < grandTotal) {
      toast({ variant: "destructive", title: "Pembayaran kurang" });
      return;
    }

    setProcessing(true);
    try {
      const invoiceNo = generateInvoiceNo("INV");

      // Create sale
      const { data: sale, error: saleError } = await db.insert<any>("sales", {
        invoice_no: invoiceNo,
        customer_name: customerName || null,
        price_level: Number(priceLevel),
        subtotal,
        discount: 0,
        tax: 0,
        grand_total: grandTotal,
        payment_method: paymentMethod,
        paid_amount: paidAmount,
        change_amount: changeAmount,
        cashier_id: user?.id,
      });

      if (saleError) throw saleError;

      // Create sale items
      for (const c of cart) {
        const { error: itemError } = await db.insert<any>("sale_items", {
          sale_id: sale.id,
          item_id: c.item.id,
          qty: c.qty,
          price: c.price,
          discount_pct: c.discount_pct,
          subtotal: c.subtotal,
        });
        if (itemError) throw itemError;

        // Update stock
        const newStock = Number(c.item.stock) - c.qty;
        const { error: stockError } = await db.update<any>(
          "items",
          { stock: newStock },
          { id: c.item.id }
        );
        if (stockError) throw stockError;

        // Record stock move
        await db.insert<any>("stock_moves", {
          item_id: c.item.id,
          qty: -c.qty,
          type: "sale",
          reference_id: sale.id,
          notes: `Penjualan ${invoiceNo}`,
        });
      }

      // Prepare receipt data
      const receipt: ReceiptData = {
        invoiceNo,
        date: new Date(),
        customerName: customerName || undefined,
        cashierName: profile?.full_name || profile?.username || undefined,
        items: cart.map((c) => ({
          name: c.item.name,
          qty: c.qty,
          price: c.price,
          discount_pct: c.discount_pct,
          subtotal: c.subtotal,
        })),
        subtotal,
        discount: 0,
        tax: 0,
        grandTotal,
        paidAmount,
        changeAmount,
        paymentMethod,
      };

      setReceiptData(receipt);
      setShowReceipt(true);

      toast({
        title: "Transaksi Berhasil",
        description: `Invoice: ${invoiceNo} | Kembalian: ${formatRupiah(changeAmount)}`,
      });

      // Reset
      setCart([]);
      setCustomerName("");
      setPaidAmount(0);
      fetchItems();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.code?.toLowerCase().includes(search.toLowerCase()) ||
      i.barcode?.includes(search)
  );

  return (
    <AppLayout title="POS / Kasir">
      <div className="grid lg:grid-cols-3 gap-4 h-[calc(100vh-120px)] animate-fade-in">
        {/* Product List */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col shadow-card overflow-hidden">
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchRef}
                    placeholder="Cari barang atau scan barcode..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                <Select value={priceLevel} onValueChange={setPriceLevel}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Level Harga" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Harga Lv1</SelectItem>
                    <SelectItem value="2">Harga Lv2</SelectItem>
                    <SelectItem value="3">Harga Lv3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left group"
                    >
                      <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{item.code}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-semibold text-primary">
                          {formatRupiah(getPrice(item, priceLevel))}
                        </span>
                        <Badge variant={Number(item.stock) > 0 ? "secondary" : "destructive"}>
                          {Number(item.stock)}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cart */}
        <div className="flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col shadow-card overflow-hidden">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Keranjang
                {cart.length > 0 && (
                  <Badge variant="secondary">{cart.length} item</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
              {/* Cart Items - Scrollable */}
              <div className="flex-1 overflow-y-auto px-6 space-y-2 min-h-0">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Keranjang kosong</p>
                  </div>
                ) : (
                  cart.map((c, index) => (
                    <div
                      key={c.item.id}
                      className="p-3 rounded-lg border bg-muted/30 space-y-2"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium text-sm line-clamp-1">
                          {c.item.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => removeFromCart(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQty(index, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{c.qty}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQty(index, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="font-semibold">{formatRupiah(c.subtotal)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Payment Section - Sticky at bottom */}
              <div className="flex-shrink-0 border-t bg-card px-6 py-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nama Pelanggan (opsional)</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama pelanggan"
                    className="h-9"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={paymentMethod === "cash" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setPaymentMethod("cash")}
                  >
                    <Banknote className="mr-1 h-4 w-4" />
                    Cash
                  </Button>
                  <Button
                    variant={paymentMethod === "transfer" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setPaymentMethod("transfer")}
                  >
                    <CreditCard className="mr-1 h-4 w-4" />
                    Transfer
                  </Button>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Bayar</Label>
                  <Input
                    type="number"
                    value={paidAmount || ""}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    placeholder="0"
                    className="h-9 text-right font-mono"
                  />
                </div>

                <Separator />

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatRupiah(subtotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{formatRupiah(grandTotal)}</span>
                  </div>
                  {paidAmount > 0 && (
                    <div className="flex justify-between text-success font-medium">
                      <span>Kembalian</span>
                      <span>{formatRupiah(changeAmount)}</span>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={processing || cart.length === 0}
                >
                  {processing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="mr-2 h-4 w-4" />
                  )}
                  Bayar {formatRupiah(grandTotal)}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ReceiptDialog
        open={showReceipt}
        onOpenChange={setShowReceipt}
        data={receiptData}
      />
    </AppLayout>
  );
}
