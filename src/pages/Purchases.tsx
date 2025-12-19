import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { db, isElectron } from "@/lib/database";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { formatRupiah, formatDate, generateInvoiceNo } from "@/lib/formatters";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  Search,
  Loader2,
  CheckCircle,
} from "lucide-react";

interface Purchase {
  id: string;
  invoice_no: string;
  date: string;
  supplier_id: string | null;
  status: string;
  total: number;
  notes: string | null;
  suppliers?: { name: string } | null;
}

interface Supplier {
  id: string;
  name: string;
}

interface Item {
  id: string;
  code: string | null;
  name: string;
  buy_price: number;
  stock: number;
}

interface PurchaseItem {
  item_id: string;
  item_name: string;
  qty: number;
  price: number;
  subtotal: number;
}

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    supplier_id: "",
    notes: "",
  });
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [saving, setSaving] = useState(false);
  const { role, user } = useAuth();
  const { toast } = useToast();

  const isAdmin = role === "admin";

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
    fetchItems();
  }, []);

  const fetchPurchases = async () => {
    try {
      if (isElectron) {
        const { data, error } = await db.select<Purchase>("purchases_with_supplier");
        if (error) throw error;
        setPurchases(data || []);
      } else {
        const { data, error } = await db.select<Purchase>("purchases", { 
          select: "*, suppliers(name)", 
          orderBy: "created_at",
          orderAsc: false 
        });
        if (error) throw error;
        setPurchases(data || []);
      }
    } catch (error) {
      console.error("Error fetching purchases:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    const { data } = await db.select<Supplier>("suppliers", { orderBy: "name" });
    setSuppliers(data || []);
  };

  const fetchItems = async () => {
    const { data } = await db.select<Item>("items", { where: { is_active: true }, orderBy: "name" });
    setItems(data || []);
  };

  const addPurchaseItem = (item: Item) => {
    const existing = purchaseItems.find((p) => p.item_id === item.id);
    if (existing) {
      setPurchaseItems(
        purchaseItems.map((p) =>
          p.item_id === item.id
            ? { ...p, qty: p.qty + 1, subtotal: (p.qty + 1) * p.price }
            : p
        )
      );
    } else {
      setPurchaseItems([
        ...purchaseItems,
        {
          item_id: item.id,
          item_name: item.name,
          qty: 1,
          price: Number(item.buy_price),
          subtotal: Number(item.buy_price),
        },
      ]);
    }
  };

  const updatePurchaseItem = (index: number, field: string, value: number) => {
    const newItems = [...purchaseItems];
    (newItems[index] as any)[field] = value;
    newItems[index].subtotal = newItems[index].qty * newItems[index].price;
    setPurchaseItems(newItems);
  };

  const removePurchaseItem = (index: number) => {
    const newItems = [...purchaseItems];
    newItems.splice(index, 1);
    setPurchaseItems(newItems);
  };

  const total = purchaseItems.reduce((sum, p) => sum + p.subtotal, 0);

  const handleSubmit = async (e: React.FormEvent, status: string) => {
    e.preventDefault();
    if (purchaseItems.length === 0) {
      toast({ variant: "destructive", title: "Tambahkan item" });
      return;
    }

    setSaving(true);
    try {
      const invoiceNo = generateInvoiceNo("PO");

      const { data: purchase, error: purchaseError } = await db.insert<any>("purchases", {
        invoice_no: invoiceNo,
        supplier_id: formData.supplier_id || null,
        status,
        total,
        notes: formData.notes || null,
        created_by: user?.id,
      });

      if (purchaseError) throw purchaseError;

      // Insert purchase items
      for (const p of purchaseItems) {
        await db.insert("purchase_items", {
          purchase_id: purchase!.id,
          item_id: p.item_id,
          qty: p.qty,
          price: p.price,
          subtotal: p.subtotal,
        });
      }

      // If posted, update stock
      if (status === "posted") {
        for (const p of purchaseItems) {
          const { data: item } = await db.selectOne<Item>("items", { id: p.item_id });
          if (item) {
            await db.update("items", { stock: Number(item.stock) + p.qty }, { id: p.item_id });
            await db.insert("stock_moves", {
              item_id: p.item_id,
              qty: p.qty,
              type: "purchase",
              reference_id: purchase!.id,
              notes: `Pembelian ${invoiceNo}`,
            });
          }
        }
      }

      toast({
        title: status === "posted" ? "Pembelian berhasil diposting" : "Draft tersimpan",
      });

      setIsOpen(false);
      setFormData({ supplier_id: "", notes: "" });
      setPurchaseItems([]);
      fetchPurchases();
      fetchItems();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePost = async (purchase: Purchase) => {
    if (purchase.status === "posted") return;

    try {
      // Get purchase items
      const { data: pItems } = await db.select<any>("purchase_items", { where: { purchase_id: purchase.id } });

      // Update stock
      for (const p of pItems || []) {
        const { data: item } = await db.selectOne<Item>("items", { id: p.item_id });
        if (item) {
          await db.update("items", { stock: Number(item.stock) + Number(p.qty) }, { id: p.item_id });
          await db.insert("stock_moves", {
            item_id: p.item_id,
            qty: p.qty,
            type: "purchase",
            reference_id: purchase.id,
            notes: `Pembelian ${purchase.invoice_no}`,
          });
        }
      }

      await db.update("purchases", { status: "posted" }, { id: purchase.id });

      toast({ title: "Pembelian berhasil diposting" });
      fetchPurchases();
      fetchItems();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const filteredPurchases = purchases.filter(
    (p) =>
      p.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
      p.suppliers?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout title="Pembelian">
      <div className="space-y-4 animate-fade-in">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Daftar Pembelian</CardTitle>
            {isAdmin && (
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setFormData({ supplier_id: "", notes: "" });
                      setPurchaseItems([]);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Pembelian
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Tambah Pembelian</DialogTitle>
                  </DialogHeader>
                  <form className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Supplier</Label>
                        <Select
                          value={formData.supplier_id}
                          onValueChange={(v) =>
                            setFormData({ ...formData, supplier_id: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih supplier" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Catatan</Label>
                        <Input
                          value={formData.notes}
                          onChange={(e) =>
                            setFormData({ ...formData, notes: e.target.value })
                          }
                          placeholder="Catatan pembelian"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Tambah Barang</Label>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
                        {items.map((item) => (
                          <Button
                            type="button"
                            key={item.id}
                            variant="outline"
                            size="sm"
                            onClick={() => addPurchaseItem(item)}
                          >
                            {item.name}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Barang</TableHead>
                            <TableHead className="w-24">Qty</TableHead>
                            <TableHead className="w-32">Harga</TableHead>
                            <TableHead className="w-32 text-right">Subtotal</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseItems.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                Belum ada item
                              </TableCell>
                            </TableRow>
                          ) : (
                            purchaseItems.map((p, index) => (
                              <TableRow key={p.item_id}>
                                <TableCell>{p.item_name}</TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={p.qty}
                                    onChange={(e) =>
                                      updatePurchaseItem(index, "qty", Number(e.target.value))
                                    }
                                    className="w-20"
                                    min={1}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={p.price}
                                    onChange={(e) =>
                                      updatePurchaseItem(index, "price", Number(e.target.value))
                                    }
                                    className="w-28"
                                  />
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatRupiah(p.subtotal)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() => removePurchaseItem(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-lg font-bold">
                        Total: {formatRupiah(total)}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => handleSubmit(e, "draft")}
                          disabled={saving}
                        >
                          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Simpan Draft
                        </Button>
                        <Button
                          type="button"
                          onClick={(e) => handleSubmit(e, "posted")}
                          disabled={saving}
                        >
                          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Posting
                        </Button>
                      </div>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari pembelian..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="w-24">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredPurchases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Tidak ada data
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPurchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-mono text-sm">
                          {purchase.invoice_no}
                        </TableCell>
                        <TableCell>{formatDate(purchase.date)}</TableCell>
                        <TableCell>{purchase.suppliers?.name || "-"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatRupiah(Number(purchase.total))}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={purchase.status === "posted" ? "default" : "secondary"}
                          >
                            {purchase.status === "posted" ? "Posted" : "Draft"}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            {purchase.status === "draft" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePost(purchase)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Post
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
