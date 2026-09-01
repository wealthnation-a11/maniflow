// Scheduled daily sales workbook export.
// Called by pg_cron with the anon key. Iterates every user that has orders
// and writes a fresh workbook to `sales-exports/<uid>/latest.xlsx`.
// Also drops a notification row so the user sees "your daily workbook is ready".

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Every user that has at least one order.
  const { data: userRows, error: uErr } = await admin
    .from("orders")
    .select("user_id")
    .limit(10000);
  if (uErr) {
    return new Response(JSON.stringify({ error: uErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userIds = Array.from(new Set((userRows ?? []).map((r: any) => r.user_id))).filter(Boolean);

  const results: any[] = [];
  for (const userId of userIds) {
    try {
      const { data: profile } = await admin.from("profiles").select("business_name").eq("id", userId).maybeSingle();
      const businessName = profile?.business_name || "Maniflow";

      const { data: orders } = await admin
        .from("orders")
        .select("id, customer_name, customer_phone, product_name, amount, platform, status, payment_status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      const rows = orders ?? [];

      const buffer = buildWorkbook(rows, businessName);
      const path = `${userId}/latest.xlsx`;
      const dated = `${userId}/sales-${new Date().toISOString().slice(0, 10)}.xlsx`;

      await admin.storage.from("sales-exports").upload(path, buffer, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });
      await admin.storage.from("sales-exports").upload(dated, buffer, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });

      // Notify user (best-effort; ignore if notifications table shape differs).
      try {
        await admin.from("notifications").insert({
          user_id: userId,
          type: "system",
          title: "Daily sales workbook ready",
          message: `Your automated Excel workbook with ${rows.length} orders is ready.`,
        });
      } catch (_) { /* ignore */ }

      results.push({ userId, rows: rows.length, path });
    } catch (e: any) {
      results.push({ userId, error: e?.message ?? String(e) });
    }
  }

  return new Response(JSON.stringify({ generated: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
  });
});

function buildWorkbook(rows: any[], businessName: string): Uint8Array {
  const wb = XLSX.utils.book_new();
  const header = [
    "Order ID","Date","Customer","Phone","Product",
    "Amount (NGN)","VAT 7.5% (NGN)","Total (NGN)","Running Total (NGN)",
    "Platform","Status","Payment",
  ];
  const salesAoA: any[][] = [header];
  rows.forEach((r, i) => {
    const excelRow = i + 2;
    salesAoA.push([
      r.id,
      r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : "",
      r.customer_name || "", r.customer_phone || "", r.product_name || "",
      Number(r.amount) || 0,
      { f: `ROUND(F${excelRow}*0.075,2)` },
      { f: `F${excelRow}+G${excelRow}` },
      i === 0 ? { f: `H${excelRow}` } : { f: `I${excelRow - 1}+H${excelRow}` },
      r.platform, r.status, r.payment_status,
    ]);
  });
  const lastRow = rows.length + 1;
  salesAoA.push(["TOTAL","","","","",
    { f: `SUM(F2:F${lastRow})` }, { f: `SUM(G2:G${lastRow})` }, { f: `SUM(H2:H${lastRow})` },
    "","","","",
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(salesAoA), "Sales");

  const salesRange = `Sales!F2:F${lastRow}`;
  const payRange = `Sales!L2:L${lastRow}`;
  const statusRange = `Sales!K2:K${lastRow}`;
  const summary: any[][] = [
    [businessName + " — Sales Summary", ""],
    ["Generated", new Date().toISOString().slice(0, 10)],
    ["", ""],
    ["Metric", "Value"],
    ["Total orders", { f: `COUNTA(Sales!A2:A${lastRow})` }],
    ["Gross revenue", { f: `SUM(${salesRange})` }],
    ["VAT collected", { f: `SUM(Sales!G2:G${lastRow})` }],
    ["Grand total incl. VAT", { f: `SUM(Sales!H2:H${lastRow})` }],
    ["Average order value", { f: `IFERROR(AVERAGE(${salesRange}),0)` }],
    ["", ""],
    ["Paid orders", { f: `COUNTIF(${payRange},"paid")` }],
    ["Pending payments", { f: `COUNTIF(${payRange},"pending")` }],
    ["Failed payments", { f: `COUNTIF(${payRange},"failed")` }],
    ["Paid revenue", { f: `SUMIF(${payRange},"paid",${salesRange})` }],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");

  const platforms = ["whatsapp","instagram","facebook"];
  const platformRange = `Sales!J2:J${lastRow}`;
  const byPlatform: any[][] = [
    ["Platform","Orders","Revenue","Paid Revenue"],
    ...platforms.map((p) => [
      p,
      { f: `COUNTIF(${platformRange},"${p}")` },
      { f: `SUMIF(${platformRange},"${p}",${salesRange})` },
      { f: `SUMIFS(${salesRange},${platformRange},"${p}",${payRange},"paid")` },
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(byPlatform), "By Platform");

  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
}
