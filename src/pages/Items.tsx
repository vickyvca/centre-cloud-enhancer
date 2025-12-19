import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { formatRupiah } from "@/lib/formatters";
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
import { Plus, Pencil, Trash2, Search, Loader2, AlertTriangle } from "lucide-react";

interface Item {
  id: string;
  code: string | null;
  barcode: string | null;
  name: string;
  category_id: string | null;
  unit: string | null;
  buy_price: number;
  sell_price: number;
  sell_price_lv2: number;
  sell_price_lv3: number;
  discount_pct: number;
  stock: number;
  min_stock: number;
  is_active: boolean;
  categories?: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

export default function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    barcode: "",
    name: "",
    category_id: "",
    unit: "pcs",
    buy_price: 0,
    sell_price: 0,
    sell_price_lv2: 0,
    sell_price_lv3: 0,
    discount_pct: 0,
    stock: 0,
    min_stock: 0,
  });
  const [saving, setSaving] = useState(false);
  const { role } = useAuth();
  const { toast } = useToast();

  const isAdmin = role === "admin";

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*, categories(name)")
        .order("name");

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name").order("name");
    setCategories(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        code: formData.code.trim() || null,
        barcode: formData.barcode.trim() || null,
        name: formData.name.trim(),
        category_id: formData.category_id || null,
        unit: formData.unit || "pcs",
        buy_price: formData.buy_price,
        sell_price: formData.sell_price,
        sell_price_lv2: formData.sell_price_lv2,
        sell_price_lv3: formData.sell_price_lv3,
        discount_pct: formData.discount_pct,
        stock: formData.stock,
        min_stock: formData.min_stock,
      };

      if (editingId) {
        const { error } = await supabase.from("items").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Barang berhasil diperbarui" });
      } else {
        const { error } = await supabase.from("items").insert(payload);
        if (error) throw error;
        toast({ title: "Barang berhasil ditambahkan" });
      }

      setIsOpen(false);
      resetForm();
      fetchItems();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      barcode: "",
      name: "",
      category_id: "",
      unit: "pcs",
      buy_price: 0,
      sell_price: 0,
      sell_price_lv2: 0,
      sell_price_lv3: 0,
      discount_pct: 0,
      stock: 0,
      min_stock: 0,
    });
    setEditingId(null);
  };

  const handleEdit = (item: Item) => {
    setEditingId(item.id);
    setFormData({
      code: item.code || "",
      barcode: item.barcode || "",
      name: item.name,
      category_id: item.category_id || "",
      unit: item.unit || "pcs",
      buy_price: Number(item.buy_price),
      sell_price: Number(item.sell_price),
      sell_price_lv2: Number(item.sell_price_lv2),
      sell_price_lv3: Number(item.sell_price_lv3),
      discount_pct: Number(item.discount_pct),
      stock: Number(item.stock),
      min_stock: Number(item.min_stock),
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus barang ini?")) return;
    try {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Barang berhasil dihapus" });
      fetchItems();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.code?.toLowerCase().includes(search.toLowerCase()) ||
      i.barcode?.includes(search)
  );

  return (
    <AppLayout title="Barang">
      <div className="space-y-4 animate-fade-in">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Daftar Barang</CardTitle>
            {isAdmin && (
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Barang
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingId ? "Edit Barang" : "Tambah Barang"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="code">Kode</Label>
                        <Input
                          id="code"
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                          placeholder="ITM001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="barcode">Barcode</Label>
                        <Input
                          id="barcode"
                          value={formData.barcode}
                          onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                          placeholder="8991234567890"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nama Barang *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Nama barang"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Kategori</Label>
                        <Select
                          value={formData.category_id}
                          onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unit">Satuan</Label>
                        <Input
                          id="unit"
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          placeholder="pcs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="buy_price">Harga Beli</Label>
                        <Input
                          id="buy_price"
                          type="number"
                          value={formData.buy_price}
                          onChange={(e) =>
                            setFormData({ ...formData, buy_price: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sell_price">Harga Jual (Lv1)</Label>
                        <Input
                          id="sell_price"
                          type="number"
                          value={formData.sell_price}
                          onChange={(e) =>
                            setFormData({ ...formData, sell_price: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sell_price_lv2">Harga Lv2</Label>
                        <Input
                          id="sell_price_lv2"
                          type="number"
                          value={formData.sell_price_lv2}
                          onChange={(e) =>
                            setFormData({ ...formData, sell_price_lv2: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sell_price_lv3">Harga Lv3</Label>
                        <Input
                          id="sell_price_lv3"
                          type="number"
                          value={formData.sell_price_lv3}
                          onChange={(e) =>
                            setFormData({ ...formData, sell_price_lv3: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="discount_pct">Diskon (%)</Label>
                        <Input
                          id="discount_pct"
                          type="number"
                          step="0.01"
                          value={formData.discount_pct}
                          onChange={(e) =>
                            setFormData({ ...formData, discount_pct: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="stock">Stok Awal</Label>
                        <Input
                          id="stock"
                          type="number"
                          value={formData.stock}
                          onChange={(e) =>
                            setFormData({ ...formData, stock: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="min_stock">Stok Minimum</Label>
                        <Input
                          id="min_stock"
                          type="number"
                          value={formData.min_stock}
                          onChange={(e) =>
                            setFormData({ ...formData, min_stock: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                        Batal
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingId ? "Perbarui" : "Simpan"}
                      </Button>
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
                  placeholder="Cari barang..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead className="hidden md:table-cell">Kategori</TableHead>
                    <TableHead className="text-right">Harga Jual</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                    {isAdmin && <TableHead className="w-24">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Tidak ada data
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.code || "-"}
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {item.categories?.name || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatRupiah(Number(item.sell_price))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {Number(item.stock) <= Number(item.min_stock) && (
                              <AlertTriangle className="h-4 w-4 text-warning" />
                            )}
                            <Badge
                              variant={
                                Number(item.stock) <= Number(item.min_stock)
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {Number(item.stock)}
                            </Badge>
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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
