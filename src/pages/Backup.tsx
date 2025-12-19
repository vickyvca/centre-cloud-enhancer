import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  Upload,
  HardDrive,
  FileJson,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function Backup() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const { role } = useAuth();
  const { toast } = useToast();

  const handleExport = async () => {
    if (role !== "admin") {
      toast({ variant: "destructive", title: "Akses ditolak", description: "Hanya admin yang bisa export data" });
      return;
    }

    setExporting(true);
    try {
      // Fetch all data
      const [
        { data: categories },
        { data: suppliers },
        { data: items },
        { data: sales },
        { data: saleItems },
        { data: purchases },
        { data: purchaseItems },
        { data: returns },
        { data: returnItems },
      ] = await Promise.all([
        supabase.from("categories").select("*"),
        supabase.from("suppliers").select("*"),
        supabase.from("items").select("*"),
        supabase.from("sales").select("*"),
        supabase.from("sale_items").select("*"),
        supabase.from("purchases").select("*"),
        supabase.from("purchase_items").select("*"),
        supabase.from("returns").select("*"),
        supabase.from("return_items").select("*"),
      ]);

      const backupData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        data: {
          categories,
          suppliers,
          items,
          sales,
          saleItems,
          purchases,
          purchaseItems,
          returns,
          returnItems,
        },
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nexapos-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export berhasil",
        description: "Data telah diunduh sebagai file JSON",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (role !== "admin") {
      toast({ variant: "destructive", title: "Akses ditolak", description: "Hanya admin yang bisa import data" });
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.version || !backupData.data) {
        throw new Error("Format file backup tidak valid");
      }

      // Import categories
      if (backupData.data.categories?.length > 0) {
        const { error } = await supabase.from("categories").upsert(
          backupData.data.categories.map((c: any) => ({
            id: c.id,
            name: c.name,
            created_at: c.created_at,
          })),
          { onConflict: "id" }
        );
        if (error) throw error;
      }

      // Import suppliers
      if (backupData.data.suppliers?.length > 0) {
        const { error } = await supabase.from("suppliers").upsert(
          backupData.data.suppliers.map((s: any) => ({
            id: s.id,
            name: s.name,
            phone: s.phone,
            address: s.address,
            created_at: s.created_at,
          })),
          { onConflict: "id" }
        );
        if (error) throw error;
      }

      // Import items
      if (backupData.data.items?.length > 0) {
        const { error } = await supabase.from("items").upsert(
          backupData.data.items.map((i: any) => ({
            id: i.id,
            code: i.code,
            barcode: i.barcode,
            name: i.name,
            category_id: i.category_id,
            unit: i.unit,
            buy_price: i.buy_price,
            sell_price: i.sell_price,
            sell_price_lv2: i.sell_price_lv2,
            sell_price_lv3: i.sell_price_lv3,
            discount_pct: i.discount_pct,
            stock: i.stock,
            min_stock: i.min_stock,
            is_active: i.is_active,
            created_at: i.created_at,
            updated_at: i.updated_at,
          })),
          { onConflict: "id" }
        );
        if (error) throw error;
      }

      toast({
        title: "Import berhasil",
        description: "Data master telah diimpor. Transaksi tidak diimpor untuk menghindari duplikasi.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const isAdmin = role === "admin";

  return (
    <AppLayout title="Backup & Restore">
      <div className="space-y-6 animate-fade-in">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Backup & Restore Data
            </CardTitle>
            <CardDescription>
              Export atau import data untuk backup atau migrasi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-2 border-dashed">
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
                    <Download className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Export Data</h3>
                    <p className="text-sm text-muted-foreground">
                      Download semua data dalam format JSON
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={handleExport}
                      disabled={exporting || !isAdmin}
                    >
                      {exporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download Backup
                    </Button>
                    {!isAdmin && (
                      <p className="text-xs text-destructive">Hanya admin yang bisa export</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-dashed">
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="p-4 rounded-full bg-accent/10 w-fit mx-auto">
                    <Upload className="h-8 w-8 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Import Data</h3>
                    <p className="text-sm text-muted-foreground">
                      Restore data dari file backup (hanya master data)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backup-file" className="cursor-pointer">
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={importing || !isAdmin}
                        asChild
                      >
                        <span>
                          {importing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          Pilih File Backup
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="backup-file"
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleImport}
                      disabled={importing || !isAdmin}
                    />
                    {!isAdmin && (
                      <p className="text-xs text-destructive">Hanya admin yang bisa import</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                Informasi Backup
              </h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                  Export mencakup: Kategori, Supplier, Barang, Penjualan, Pembelian, Retur
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                  Import hanya memproses master data (Kategori, Supplier, Barang)
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                  Data transaksi tidak diimpor untuk menghindari duplikasi
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                  Hanya admin yang dapat melakukan backup & restore
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
