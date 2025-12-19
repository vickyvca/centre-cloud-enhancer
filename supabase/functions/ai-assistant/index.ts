import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client for data access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get context data for AI
    let contextData = "";
    
    if (type === "recommendation" || type === "chat") {
      // Get top selling items
      const { data: topItems } = await supabase
        .from("sale_items")
        .select("item_id, qty, items!inner(name, sell_price)")
        .order("qty", { ascending: false })
        .limit(10);
      
      // Get low stock items  
      const { data: lowStock } = await supabase
        .from("items")
        .select("name, stock, min_stock")
        .filter("stock", "lte", "min_stock")
        .limit(10);

      // Get today's sales
      const today = new Date().toISOString().split("T")[0];
      const { data: todaySales } = await supabase
        .from("sales")
        .select("grand_total, created_at")
        .eq("date", today);

      const totalToday = todaySales?.reduce((sum, s) => sum + Number(s.grand_total), 0) || 0;
      const trxCount = todaySales?.length || 0;

      contextData = `
DATA PENJUALAN HARI INI:
- Total Omzet: Rp ${totalToday.toLocaleString("id-ID")}
- Jumlah Transaksi: ${trxCount}

PRODUK TERLARIS:
${topItems?.map((i: any) => `- ${i.items.name}: ${i.qty} terjual`).join("\n") || "Belum ada data"}

STOK MENIPIS:
${lowStock?.map((i: any) => `- ${i.name}: ${i.stock} tersisa (min: ${i.min_stock})`).join("\n") || "Semua stok aman"}
`;
    }

    if (type === "anomaly") {
      // Get sales data for anomaly detection
      const { data: recentSales } = await supabase
        .from("sales")
        .select("invoice_no, grand_total, discount, customer_name, created_at, payment_method")
        .order("created_at", { ascending: false })
        .limit(50);

      // Get average transaction value
      const { data: avgData } = await supabase
        .from("sales")
        .select("grand_total");
      
      const avgValue = avgData?.length 
        ? avgData.reduce((sum, s) => sum + Number(s.grand_total), 0) / avgData.length 
        : 0;

      contextData = `
ANALISIS TRANSAKSI TERBARU:
Rata-rata nilai transaksi: Rp ${avgValue.toLocaleString("id-ID")}

DATA TRANSAKSI TERAKHIR:
${recentSales?.map((s: any) => 
  `- ${s.invoice_no}: Rp ${Number(s.grand_total).toLocaleString("id-ID")} | Diskon: ${s.discount || 0}% | ${s.payment_method}`
).join("\n") || "Tidak ada data"}

Tolong analisis apakah ada transaksi yang mencurigakan seperti:
- Transaksi dengan nilai jauh di atas/bawah rata-rata
- Pola diskon yang tidak wajar
- Transaksi pada jam yang tidak biasa
`;
    }

    const systemPrompt = `Kamu adalah NexaPOS AI Assistant, asisten cerdas untuk sistem Point of Sale.
Kamu membantu kasir dan admin toko dengan:
1. Menjawab pertanyaan tentang penjualan, stok, dan laporan
2. Memberikan rekomendasi produk untuk upsell
3. Mendeteksi anomali transaksi
4. Tips untuk meningkatkan penjualan

Gunakan bahasa Indonesia yang ramah dan profesional. Berikan jawaban yang singkat dan actionable.

${contextData}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit tercapai, coba lagi nanti." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Kredit AI habis, silakan top up." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("AI assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
