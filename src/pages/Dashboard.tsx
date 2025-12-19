import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah, formatNumber } from "@/lib/formatters";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Package,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface DashboardStats {
  omzetToday: number;
  omzetMonth: number;
  trxCount: number;
  buyToday: number;
  grossToday: number;
  lowStockCount: number;
}

interface ChartData {
  date: string;
  label: string;
  sales: number;
  purchases: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    omzetToday: 0,
    omzetMonth: 0,
    trxCount: 0,
    buyToday: 0,
    grossToday: 0,
    lowStockCount: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split("T")[0];

      // Fetch sales today
      const { data: salesToday } = await supabase
        .from("sales")
        .select("grand_total")
        .eq("date", today);

      const omzetToday = salesToday?.reduce((sum, s) => sum + Number(s.grand_total), 0) || 0;

      // Fetch sales this month
      const { data: salesMonth } = await supabase
        .from("sales")
        .select("grand_total")
        .gte("date", monthStart)
        .lte("date", today);

      const omzetMonth = salesMonth?.reduce((sum, s) => sum + Number(s.grand_total), 0) || 0;

      // Fetch transaction count today
      const { count: trxCount } = await supabase
        .from("sales")
        .select("*", { count: "exact", head: true })
        .eq("date", today);

      // Fetch purchases today
      const { data: purchasesToday } = await supabase
        .from("purchases")
        .select("total")
        .eq("date", today)
        .eq("status", "posted");

      const buyToday = purchasesToday?.reduce((sum, p) => sum + Number(p.total), 0) || 0;

      // Fetch low stock count
      const { data: items } = await supabase
        .from("items")
        .select("stock, min_stock");

      const lowStockCount = items?.filter(i => Number(i.stock) <= Number(i.min_stock)).length || 0;

      // Gross profit calculation would need sale_items with buy_price - simplified for now
      const grossToday = omzetToday * 0.25; // Placeholder: assume 25% margin

      setStats({
        omzetToday,
        omzetMonth,
        trxCount: trxCount || 0,
        buyToday,
        grossToday,
        lowStockCount,
      });

      // Fetch chart data (last 7 days)
      const dates: ChartData[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" });
        dates.push({ date: dateStr, label, sales: 0, purchases: 0 });
      }

      const startDate = dates[0].date;
      const endDate = dates[dates.length - 1].date;

      const { data: salesData } = await supabase
        .from("sales")
        .select("date, grand_total")
        .gte("date", startDate)
        .lte("date", endDate);

      const { data: purchasesData } = await supabase
        .from("purchases")
        .select("date, total")
        .gte("date", startDate)
        .lte("date", endDate)
        .eq("status", "posted");

      salesData?.forEach((s) => {
        const idx = dates.findIndex((d) => d.date === s.date);
        if (idx !== -1) {
          dates[idx].sales += Number(s.grand_total);
        }
      });

      purchasesData?.forEach((p) => {
        const idx = dates.findIndex((d) => d.date === p.date);
        if (idx !== -1) {
          dates[idx].purchases += Number(p.total);
        }
      });

      setChartData(dates);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = [
    {
      title: "Omzet Hari Ini",
      value: formatRupiah(stats.omzetToday),
      icon: DollarSign,
      trend: "+12%",
      trendUp: true,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Omzet Bulan Ini",
      value: formatRupiah(stats.omzetMonth),
      icon: TrendingUp,
      trend: "+8%",
      trendUp: true,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Transaksi Hari Ini",
      value: formatNumber(stats.trxCount),
      icon: ShoppingCart,
      trend: "+5",
      trendUp: true,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Pembelian Hari Ini",
      value: formatRupiah(stats.buyToday),
      icon: Package,
      trend: "-3%",
      trendUp: false,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Laba Kotor Hari Ini",
      value: formatRupiah(stats.grossToday),
      icon: TrendingUp,
      trend: "+15%",
      trendUp: true,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Stok Menipis",
      value: formatNumber(stats.lowStockCount),
      icon: AlertTriangle,
      trend: "item",
      trendUp: false,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6 animate-fade-in">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpiCards.map((card, index) => (
            <Card key={index} className="shadow-card hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{card.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  {card.trendUp ? (
                    <ArrowUpRight className="h-3 w-3 text-success" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-destructive" />
                  )}
                  <span
                    className={`text-xs ${
                      card.trendUp ? "text-success" : "text-destructive"
                    }`}
                  >
                    {card.trend}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Penjualan 7 Hari Terakhir</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="label" 
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}jt`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                      formatter={(value: number) => [formatRupiah(value), "Penjualan"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Perbandingan Penjualan & Pembelian</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="label" 
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
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
                        name === "sales" ? "Penjualan" : "Pembelian"
                      ]}
                    />
                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="purchases" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
