import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createHmac } from "node:crypto";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) return new Response("Not configured", { status: 500 });

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  const expected = createHmac("sha512", secret).update(raw).digest("hex");
  if (signature !== expected) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }

  if (event?.event !== "charge.success") {
    return new Response("ok", { status: 200 });
  }

  const tx = event.data;
  const reference = tx?.reference as string | undefined;
  if (!reference) return new Response("ok", { status: 200 });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: existing } = await admin
    .from("payments")
    .select("id, user_id, plan, status")
    .eq("reference", reference)
    .maybeSingle();

  if (existing?.status === "success") {
    return new Response("ok", { status: 200 });
  }

  const plan = existing?.plan ?? (tx.metadata?.plan as string | undefined);
  const userId = existing?.user_id ?? (tx.metadata?.user_id as string | undefined);

  await admin
    .from("payments")
    .update({
      status: "success",
      verified_at: new Date().toISOString(),
      raw: tx,
      updated_at: new Date().toISOString(),
    })
    .eq("reference", reference);

  if (plan && userId) {
    await admin.rpc("grant_plan_credits", { p_user_id: userId, p_plan: plan });
  }

  return new Response("ok", { status: 200 });
});
