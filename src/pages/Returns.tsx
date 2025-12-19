import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { formatRupiah, formatDate, generateInvoiceNo } from "@/lib/formatters";
import {
  RotateCcw,
  Plus,
  Search,
  Loader2,
  Trash2,
} from "lucide-react";

interface ReturnItem {
  id: string;
  return_no: string;
  date: string;
  total: number;
  notes: string | null;
  sale_id: string | null;
  created_at: string;
}

interface SaleItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  returnQty: number;
}

export default function Returns() {
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [notes, setNotes] = useState("");
  const [saleId, setSaleId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const { data, error } = await supabase
        .from("returns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReturns(data || []);
    } catch (error) {
      console.error("Error fetching returns:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchInvoice = async () => {
    if (!invoiceNo.trim()) return;

    try {
      const { data: sale, error } = await supabase
        .from("sales")
        .select(`
          id, invoice_no,
          sale_items (
            id, qty, price,
            items!inner(id, name)
          )
        `)
        .eq("invoice_no", invoiceNo.trim())
        .single();

      if (error || !sale) {
        toast({
          variant: "destructive",
          title: "Invoice tidak ditemukan",
        });
        return;
      }

      setSaleId(sale.id);
      setSaleItems(
        sale.sale_items.map((item: any) => ({
          id: item.items.id,
          name: item.items.name,
          qty: Number(item.qty),
          price: Number(item.price),
          returnQty: 0,
        }))
      );
    } catch (error) {
      console.error("Error searching invoice:", error);
    }
  };

  const updateReturnQty = (index: number, qty: number) => {
    const newItems = [...saleItems];
    newItems[index].returnQty = Math.min(qty, newItems[index].qty);
    setSaleItems(newItems);
  };

  const totalReturn = saleItems.reduce(
    (sum, item) => sum + item.returnQty * item.price,
    0
  );

  const handleSubmit = async () => {
    const itemsToReturn = saleItems.filter((item) => item.returnQty > 0);
    
    if (itemsToReturn.length === 0) {
      toast({ variant: "destructive", title: "Pilih item yang akan diretur" });
      return;
    }

    setProcessing(true);
    try {
      const returnNo = generateInvoiceNo("RTN");

      const { data: returnData, error: returnError } = await supabase
        .from("returns")
        .insert({
          return_no: returnNo,
          sale_id: saleId,
          total: totalReturn,
          notes,
          created_by: user?.id,
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items
      const returnItems = itemsToReturn.map((item) => ({
        return_id: returnData.id,
        item_id: item.id,
        qty: item.returnQty,
        price: item.price,
        subtotal: item.returnQty * item.price,
      }));

      const { error: itemsError } = await supabase
        .from("return_items")
        .insert(returnItems);

      if (itemsError) throw itemsError;

      // Update stock (add back)
      for (const item of itemsToReturn) {
        const { data: currentItem } = await supabase
          .from("items")
          .select("stock")
          .eq("id", item.id)
          .single();

        if (currentItem) {
          await supabase
            .from("items")
            .update({ stock: Number(currentItem.stock) + item.returnQty })
            .eq("id", item.id);

          await supabase.from("stock_moves").insert({
            item_id: item.id,
            qty: item.returnQty,
            type: "return",
            reference_id: returnData.id,
            notes: `Retur ${returnNo}`,
          });
        }
      }

      toast({ title: "Retur berhasil dibuat", description: returnNo });
      setIsDialogOpen(false);
      resetForm();
      fetchReturns();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setInvoiceNo("");
    setSaleItems([]);
    setSaleId(null);
    setNotes("");
  };

  const filteredReturns = returns.filter(
    (r) => r.return_no.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout title="Retur">
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nomor retur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Retur Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Buat Retur Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label>Nomor Invoice</Label>
                    <Input
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      placeholder="INV-XXXXXXXX-XXXX"
                    />
                  </div>
                  <Button onClick={searchInvoice} className="mt-6">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {saleItems.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produk</TableHead>
                          <TableHead className="text-center">Qty Beli</TableHead>
                          <TableHead className="text-center">Qty Retur</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {saleItems.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-center">{item.qty}</TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                min={0}
                                max={item.qty}
                                value={item.returnQty}
                                onChange={(e) =>
                                  updateReturnQty(index, Number(e.target.value))
                                }
                                className="w-20 text-center mx-auto"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {formatRupiah(item.returnQty * item.price)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div>
                  <Label>Catatan</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Alasan retur..."
                  />
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-lg font-bold">
                    Total Retur: <span className="text-primary">{formatRupiah(totalReturn)}</span>
                  </div>
                  <Button onClick={handleSubmit} disabled={processing || saleItems.length === 0}>
                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Proses Retur
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Daftar Retur
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredReturns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <RotateCcw className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Belum ada data retur</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Retur</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Catatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReturns.map((ret) => (
                      <TableRow key={ret.id}>
                        <TableCell className="font-medium">{ret.return_no}</TableCell>
                        <TableCell>{formatDate(ret.date)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatRupiah(Number(ret.total))}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ret.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
