// Pushes the authenticated user's orders into a Google Sheet via the
// Lovable Google Sheets connector gateway. Creates the sheet on first call
// and rewrites the "Sales" tab each time so it always mirrors the DB.
//
// Requires:
//   - Google Sheets connector linked at workspace level
//   - env: LOVABLE_API_KEY, GOOGLE_SHEETS_API_KEY

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GOOGLE_SHEETS_API_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY");
  if (!LOVABLE_API_KEY || !GOOGLE_SHEETS_API_KEY) {
    return new Response(JSON.stringify({
      error: "Google Sheets connector not configured. Link a Google Sheets connection in Lovable to enable this.",
    }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Missing Authorization" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);
  const userId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: profile } = await admin.from("profiles").select("business_name, sales_sheet_id").eq("id", userId).maybeSingle();
  const businessName = profile?.business_name || "Maniflow";
  let spreadsheetId: string | null = (profile as any)?.sales_sheet_id ?? null;

  const body = await req.json().catch(() => ({}));
  if (body?.spreadsheetId) spreadsheetId = String(body.spreadsheetId);

  const { data: orders, error: ordersErr } = await admin
    .from("orders")
    .select("id, customer_name, customer_phone, product_name, amount, platform, status, payment_status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (ordersErr) return json({ error: ordersErr.message }, 500);

  const gwHeaders = {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": GOOGLE_SHEETS_API_KEY,
    "Content-Type": "application/json",
  };

  // Create spreadsheet if we don't already have one for this user.
  if (!spreadsheetId) {
    const createRes = await fetch(`${GATEWAY}/spreadsheets`, {
      method: "POST", headers: gwHeaders,
      body: JSON.stringify({
        properties: { title: `${businessName} — Sales (Auto)` },
        sheets: [{ properties: { title: "Sales" } }, { properties: { title: "Summary" } }],
      }),
    });
    if (!createRes.ok) {
      return json({ error: `Sheet create failed: ${createRes.status} ${await createRes.text()}` }, 502);
    }
    const created = await createRes.json();
    spreadsheetId = created.spreadsheetId as string;

    // Best-effort: persist sheet id on profile if column exists.
    try { await admin.from("profiles").update({ sales_sheet_id: spreadsheetId }).eq("id", userId); } catch (_) { /* column may not exist */ }
  }

  // Clear existing rows in Sales.
  await fetch(`${GATEWAY}/spreadsheets/${spreadsheetId}/values/Sales!A:L:clear`, {
    method: "POST", headers: gwHeaders, body: "{}",
  });

  const header = [
    "Order ID","Date","Customer","Phone","Product",
    "Amount","VAT 7.5%","Total","Running Total",
    "Platform","Status","Payment",
  ];
  const rows = orders ?? [];
  const values: (string | number)[][] = [header];
  rows.forEach((r: any, i: number) => {
    const excelRow = i + 2;
    values.push([
      r.id,
      r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : "",
      r.customer_name || "", r.customer_phone || "", r.product_name || "",
      Number(r.amount) || 0,
      `=ROUND(F${excelRow}*0.075,2)`,
      `=F${excelRow}+G${excelRow}`,
      i === 0 ? `=H${excelRow}` : `=I${excelRow - 1}+H${excelRow}`,
      r.platform, r.status, r.payment_status,
    ]);
  });

  const writeRes = await fetch(
    `${GATEWAY}/spreadsheets/${spreadsheetId}/values/Sales!A1?valueInputOption=USER_ENTERED`,
    { method: "PUT", headers: gwHeaders, body: JSON.stringify({ values }) },
  );
  if (!writeRes.ok) {
    return json({ error: `Sheet write failed: ${writeRes.status} ${await writeRes.text()}` }, 502);
  }

  // Summary tab.
  const lastRow = rows.length + 1;
  const summary: (string | number)[][] = [
    [`${businessName} — Sales Summary`, ""],
    ["Generated", new Date().toISOString().slice(0, 10)],
    ["", ""],
    ["Total orders", `=COUNTA(Sales!A2:A${lastRow})`],
    ["Gross revenue", `=SUM(Sales!F2:F${lastRow})`],
    ["VAT collected", `=SUM(Sales!G2:G${lastRow})`],
    ["Grand total", `=SUM(Sales!H2:H${lastRow})`],
    ["Average order value", `=IFERROR(AVERAGE(Sales!F2:F${lastRow}),0)`],
    ["Paid revenue", `=SUMIF(Sales!L2:L${lastRow},"paid",Sales!F2:F${lastRow})`],
    ["WhatsApp revenue", `=SUMIF(Sales!J2:J${lastRow},"whatsapp",Sales!F2:F${lastRow})`],
    ["Instagram revenue", `=SUMIF(Sales!J2:J${lastRow},"instagram",Sales!F2:F${lastRow})`],
    ["Facebook revenue", `=SUMIF(Sales!J2:J${lastRow},"facebook",Sales!F2:F${lastRow})`],
  ];
  await fetch(
    `${GATEWAY}/spreadsheets/${spreadsheetId}/values/Summary!A1?valueInputOption=USER_ENTERED`,
    { method: "PUT", headers: gwHeaders, body: JSON.stringify({ values: summary }) },
  );

  return json({
    spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    rows: rows.length,
  });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
