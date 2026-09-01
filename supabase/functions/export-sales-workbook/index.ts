// Server-side sales workbook exporter.
// Generates a live-formula Excel workbook (Sales / Summary / By Platform) for
// the authenticated user, uploads it to the private `sales-exports` bucket,
// and returns a 7-day signed URL.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Auth via caller JWT.
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "Missing Authorization" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Optional: business name from profile.
  const { data: profile } = await admin.from("profiles").select("business_name").eq("id", userId).maybeSingle();
  const businessName = profile?.business_name || "Maniflow";

  const { data: orders, error: ordersErr } = await admin
    .from("orders")
    .select("id, customer_name, customer_phone, product_name, amount, platform, status, payment_status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (ordersErr) {
    return new Response(JSON.stringify({ error: ordersErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = orders ?? [];
  const buffer = buildWorkbook(rows, businessName);

  const date = new Date().toISOString().slice(0, 10);
  const path = `${userId}/sales-${date}.xlsx`;

  const { error: uploadErr } = await admin.storage
    .from("sales-exports")
    .upload(path, buffer, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: true,
    });
  if (uploadErr) {
    return new Response(JSON.stringify({ error: uploadErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: signed, error: signErr } = await admin.storage
    .from("sales-exports")
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (signErr) {
    return new Response(JSON.stringify({ error: signErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    path, url: signed.signedUrl, rows: rows.length, businessName,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
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
      r.customer_name || "",
      r.customer_phone || "",
      r.product_name || "",
      Number(r.amount) || 0,
      { f: `ROUND(F${excelRow}*0.075,2)` },
      { f: `F${excelRow}+G${excelRow}` },
      i === 0 ? { f: `H${excelRow}` } : { f: `I${excelRow - 1}+H${excelRow}` },
      r.platform, r.status, r.payment_status,
    ]);
  });
  const lastRow = rows.length + 1;
  salesAoA.push([
    "TOTAL","","","","",
    { f: `SUM(F2:F${lastRow})` },
    { f: `SUM(G2:G${lastRow})` },
    { f: `SUM(H2:H${lastRow})` },
    "","","","",
  ]);
  const salesWs = XLSX.utils.aoa_to_sheet(salesAoA);
  XLSX.utils.book_append_sheet(wb, salesWs, "Sales");

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
    ["", ""],
    ["Delivered", { f: `COUNTIF(${statusRange},"delivered")` }],
    ["Shipped", { f: `COUNTIF(${statusRange},"shipped")` }],
    ["Processing", { f: `COUNTIF(${statusRange},"processing")` }],
    ["Pending", { f: `COUNTIF(${statusRange},"pending")` }],
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

  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Uint8Array(out);
}
