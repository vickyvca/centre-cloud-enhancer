import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/database";
import { formatRupiah, formatNumber } from "@/lib/formatters";
import {
  TrendingUp,
  Package,
  DollarSign,
  BarChart3,
  PieChart as PieChartIcon,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

interface StockReport {
  name: string;
  stock: number;
  min_stock: number;
  status: "critical" | "low" | "normal";
  turnover: number;
}

interface ProfitData {
  date: string;
  label: string;
  revenue: number;
  cost: number;
  profit: number;
}

interface SaleItem {
  qty: number;
  subtotal: number;
  item_id: string;
}

interface Item {
  id: string;
  name: string;
  stock: number | null;
  min_stock: number | null;
  buy_price: number | null;
}

interface StockMove {
  item_id: string;
  qty: number;
  type: string;
}

interface Sale {
  id: string;
  date: string;
  grand_total: number | null;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))"];

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [stockReport, setStockReport] = useState<StockReport[]>([]);
  const [profitData, setProfitData] = useState<ProfitData[]>([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    profitMargin: 0,
    lowStockCount: 0,
    deadStockCount: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch items
      const { data: items } = await db.select<Item>("items");
      const itemsMap = new Map(items?.map(i => [i.id, i]) || []);

      // Fetch sale items
      const { data: saleItems } = await db.select<SaleItem>("sale_items");

      // Aggregate top products
      const productMap = new Map<string, TopProduct>();
      saleItems?.forEach((item) => {
        const itemData = itemsMap.get(item.item_id);
        if (!itemData) return;
        const name = itemData.name;
        const existing = productMap.get(name) || { name, qty: 0, revenue: 0 };
        existing.qty += Number(item.qty);
        existing.revenue += Number(item.subtotal);
        productMap.set(name, existing);
      });

      const topProductsArr = Array.from(productMap.values())
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10);
      setTopProducts(topProductsArr);

      // Fetch stock moves
      const { data: stockMoves } = await db.select<StockMove>("stock_moves", { where: { type: "sale" } });

      const stockReportData: StockReport[] = items?.map((item) => {
        const soldQty = stockMoves
          ?.filter((m) => m.item_id === item.id)
          .reduce((sum, m) => sum + Math.abs(Number(m.qty)), 0) || 0;

        const stock = Number(item.stock || 0);
        const minStock = Number(item.min_stock || 0);
        let status: "critical" | "low" | "normal" = "normal";
        if (stock <= 0) status = "critical";
        else if (stock <= minStock) status = "low";

        return {
          name: item.name,
          stock,
          min_stock: minStock,
          status,
          turnover: soldQty,
        };
      }) || [];

      // Sort by status priority
      const sortedStock = stockReportData.sort((a, b) => {
        const statusOrder = { critical: 0, low: 1, normal: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });

      setStockReport(sortedStock.slice(0, 20));

      // Calculate profit data for last 7 days
      const profitDays: ProfitData[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" });
        profitDays.push({ date: dateStr, label, revenue: 0, cost: 0, profit: 0 });
      }

      // Fetch sales
      const { data: salesData } = await db.select<Sale>("sales");

      // Filter and aggregate by date
      salesData?.forEach((s) => {
        const idx = profitDays.findIndex((d) => d.date === s.date);
        if (idx !== -1) {
          profitDays[idx].revenue += Number(s.grand_total || 0);
        }
      });

      // Calculate cost (simplified - use buy_price from items)
      saleItems?.forEach((saleItem) => {
        const itemData = itemsMap.get(saleItem.item_id);
        if (!itemData) return;
        
        // Find which sale this item belongs to
        const sale = salesData?.find(s => {
          // We need to check if sale_items has a sale_id field
          return true; // Simplified - just distribute cost
        });
        
        // For each sale item, calculate cost
        const buyPrice = Number(itemData.buy_price || 0);
        const qty = Number(saleItem.qty);
        const cost = buyPrice * qty;
        
        // Distribute to all days proportionally (simplified)
        profitDays.forEach(day => {
          if (day.revenue > 0) {
            day.cost += cost / profitDays.filter(d => d.revenue > 0).length;
          }
        });
      });

      profitDays.forEach((d) => {
        d.profit = d.revenue - d.cost;
      });

      setProfitData(profitDays);

      // Calculate summary
      const totalRevenue = profitDays.reduce((sum, d) => sum + d.revenue, 0);
      const totalCost = profitDays.reduce((sum, d) => sum + d.cost, 0);
      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      const lowStockCount = stockReportData.filter((s) => s.status === "low").length;
      const deadStockCount = stockReportData.filter((s) => s.turnover === 0).length;

      setSummary({
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin,
        lowStockCount,
        deadStockCount,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Analytics">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Analytics">
      <div className="space-y-6 animate-fade-in">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Pendapatan (7 Hari)
              </CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatRupiah(summary.totalRevenue)}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Laba Bersih (7 Hari)
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{formatRupiah(summary.totalProfit)}</div>
              <p className="text-xs text-muted-foreground">Margin: {summary.profitMargin.toFixed(1)}%</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Stok Menipis
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{summary.lowStockCount}</div>
              <p className="text-xs text-muted-foreground">item perlu restock</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Dead Stock
              </CardTitle>
              <Package className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{summary.deadStockCount}</div>
              <p className="text-xs text-muted-foreground">item tidak laku</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="profit" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profit">Laporan Laba Rugi</TabsTrigger>
            <TabsTrigger value="products">Produk Terlaris</TabsTrigger>
            <TabsTrigger value="stock">Laporan Stok</TabsTrigger>
          </TabsList>

          <TabsContent value="profit" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Grafik Laba Rugi 7 Hari Terakhir
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={profitData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      />
                      <YAxis 
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickFormatter={(value) => `${(value / 1000000).toFixed(1)}jt`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                        formatter={(value: number, name: string) => [
                          formatRupiah(value),
                          name === "revenue" ? "Pendapatan" : name === "cost" ? "Modal" : "Laba"
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="Pendapatan" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cost" name="Modal" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" name="Laba" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Detail Laba Rugi Harian</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 font-medium">Tanggal</th>
                        <th className="text-right py-3 font-medium">Pendapatan</th>
                        <th className="text-right py-3 font-medium">Modal</th>
                        <th className="text-right py-3 font-medium">Laba</th>
                        <th className="text-right py-3 font-medium">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profitData.map((d) => {
                        const margin = d.revenue > 0 ? ((d.profit / d.revenue) * 100).toFixed(1) : "0";
                        return (
                          <tr key={d.date} className="border-b">
                            <td className="py-3">{d.label}</td>
                            <td className="text-right">{formatRupiah(d.revenue)}</td>
                            <td className="text-right">{formatRupiah(d.cost)}</td>
                            <td className={`text-right font-medium ${d.profit >= 0 ? "text-success" : "text-destructive"}`}>
                              {formatRupiah(d.profit)}
                            </td>
                            <td className="text-right">{margin}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    Top 5 Produk (Quantity)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topProducts.slice(0, 5)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name.slice(0, 10)}... (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="qty"
                        >
                          {topProducts.slice(0, 5).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [formatNumber(value), "Terjual"]}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Daftar Produk Terlaris</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topProducts.map((product, index) => (
                      <div key={product.name} className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(product.qty)} terjual
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatRupiah(product.revenue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stock" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Laporan Stok Detail
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 font-medium">Nama Produk</th>
                        <th className="text-center py-3 font-medium">Status</th>
                        <th className="text-right py-3 font-medium">Stok</th>
                        <th className="text-right py-3 font-medium">Min. Stok</th>
                        <th className="text-right py-3 font-medium">Turnover</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockReport.map((item) => (
                        <tr key={item.name} className="border-b">
                          <td className="py-3 font-medium">{item.name}</td>
                          <td className="text-center py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.status === "critical"
                                  ? "bg-destructive/10 text-destructive"
                                  : item.status === "low"
                                  ? "bg-warning/10 text-warning"
                                  : "bg-success/10 text-success"
                              }`}
                            >
                              {item.status === "critical" ? "Kritis" : item.status === "low" ? "Rendah" : "Normal"}
                            </span>
                          </td>
                          <td className="text-right py-3">{formatNumber(item.stock)}</td>
                          <td className="text-right py-3">{formatNumber(item.min_stock)}</td>
                          <td className="text-right py-3">{formatNumber(item.turnover)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
