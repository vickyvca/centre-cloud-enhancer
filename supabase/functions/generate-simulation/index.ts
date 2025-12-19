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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all items
    const { data: items, error: itemsError } = await supabase
      .from("items")
      .select("id, name, sell_price, buy_price, stock")
      .eq("is_active", true);

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Popular items weights (some items sell more than others)
    const popularItems = [
      "Aqua 600ml", "Indomie Goreng", "Gudang Garam Surya 12", "Sampoerna Mild 16",
      "Teh Botol Sosro 450ml", "Beng Beng 22g", "Chitato Original 68g", "Pop Mie Ayam"
    ];

    const getRandomItem = () => {
      // 60% chance to pick popular item
      if (Math.random() < 0.6) {
        const popularFiltered = items.filter(i => popularItems.some(p => i.name.includes(p.split(" ")[0])));
        if (popularFiltered.length > 0) {
          return popularFiltered[Math.floor(Math.random() * popularFiltered.length)];
        }
      }
      return items[Math.floor(Math.random() * items.length)];
    };

    const customerNames = [
      null, null, null, null, null, // Many anonymous customers
      "Pak Budi", "Bu Siti", "Mas Andi", "Mbak Rina", "Pak Joko",
      "Bu Dewi", "Pak Hendra", "Bu Wati", "Mas Deni", "Mbak Ani"
    ];

    const paymentMethods = ["cash", "cash", "cash", "cash", "transfer"]; // 80% cash

    let totalSalesCreated = 0;
    let totalItemsSold = 0;

    // Generate 30 days of data
    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
      const date = new Date();
      date.setDate(date.getDate() - dayOffset);
      const dateStr = date.toISOString().split("T")[0];

      // Random customers per day (20-100)
      const customersToday = Math.floor(Math.random() * 80) + 20;
      
      // Target daily sales (1-3 million)
      const targetDaily = (Math.random() * 2000000) + 1000000;
      let dailyTotal = 0;

      for (let c = 0; c < customersToday && dailyTotal < targetDaily * 1.2; c++) {
        // Each customer buys 1-8 items
        const itemsCount = Math.floor(Math.random() * 8) + 1;
        const cartItems: { item: any; qty: number }[] = [];
        
        for (let i = 0; i < itemsCount; i++) {
          const item = getRandomItem();
          const qty = Math.floor(Math.random() * 3) + 1;
          
          const existing = cartItems.find(ci => ci.item.id === item.id);
          if (existing) {
            existing.qty += qty;
          } else {
            cartItems.push({ item, qty });
          }
        }

        // Calculate totals
        let subtotal = 0;
        const saleItems: any[] = [];
        
        for (const ci of cartItems) {
          const price = Number(ci.item.sell_price);
          const itemSubtotal = price * ci.qty;
          subtotal += itemSubtotal;
          
          saleItems.push({
            item_id: ci.item.id,
            qty: ci.qty,
            price: price,
            discount_pct: 0,
            subtotal: itemSubtotal,
          });
        }

        const grandTotal = subtotal;
        const paidAmount = Math.ceil(grandTotal / 5000) * 5000; // Round up to nearest 5000
        const changeAmount = paidAmount - grandTotal;

        // Create invoice number
        const invoiceNo = `INV${dateStr.replace(/-/g, "")}-${String(c + 1).padStart(4, "0")}`;

        // Random time of day (7am - 10pm)
        const hour = Math.floor(Math.random() * 15) + 7;
        const minute = Math.floor(Math.random() * 60);
        const createdAt = new Date(date);
        createdAt.setHours(hour, minute, Math.floor(Math.random() * 60));

        // Insert sale
        const { data: sale, error: saleError } = await supabase
          .from("sales")
          .insert({
            invoice_no: invoiceNo,
            date: dateStr,
            customer_name: customerNames[Math.floor(Math.random() * customerNames.length)],
            price_level: 1,
            subtotal: subtotal,
            discount: 0,
            tax: 0,
            grand_total: grandTotal,
            payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
            paid_amount: paidAmount,
            change_amount: changeAmount,
            created_at: createdAt.toISOString(),
          })
          .select()
          .single();

        if (saleError) {
          console.error("Sale error:", saleError);
          continue;
        }

        // Insert sale items
        const itemsToInsert = saleItems.map(si => ({
          ...si,
          sale_id: sale.id,
        }));

        const { error: itemsInsertError } = await supabase
          .from("sale_items")
          .insert(itemsToInsert);

        if (itemsInsertError) {
          console.error("Sale items error:", itemsInsertError);
          continue;
        }

        // Insert stock moves
        const stockMoves = saleItems.map(si => ({
          item_id: si.item_id,
          qty: -si.qty,
          type: "sale",
          reference_id: sale.id,
          notes: `Penjualan ${invoiceNo}`,
          created_at: createdAt.toISOString(),
        }));

        await supabase.from("stock_moves").insert(stockMoves);

        dailyTotal += grandTotal;
        totalSalesCreated++;
        totalItemsSold += saleItems.length;
      }

      console.log(`Day ${dateStr}: ${customersToday} customers, Rp ${dailyTotal.toLocaleString()}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${totalSalesCreated} sales with ${totalItemsSold} items over 30 days`,
        totalSales: totalSalesCreated,
        totalItems: totalItemsSold,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
