import { supabase } from "@/integrations/supabase/client";

export type VerifyResult = {
  status?: string;
  plan?: string;
  credits?: number;
  reference?: string;
  gateway_response?: string | null;
  already?: boolean;
  mode?: "live" | "test";
  error?: string;
  retryable?: boolean;
};

/** Turns any verification failure into a message a business owner can act on. */
export function explainPaymentError(raw: string | undefined | null): string {
  const m = (raw ?? "").toLowerCase();
  if (!m) return "We couldn't reach the payment service. Check your connection and retry.";
  if (m.includes("failed to fetch") || m.includes("network")) {
    return "Network error while contacting Paystack. Check your connection and press Retry.";
  }
  if (m.includes("not configured")) {
    return "Payments aren't configured yet — the Paystack key is missing. Contact support.";
  }
  if (m.includes("reference not found") || m.includes("invalid reference")) {
    return "Paystack doesn't recognise this reference. If money left your account, contact support with the reference.";
  }
  if (m.includes("credits grant failed")) {
    return "Payment succeeded but crediting your account failed. Press Retry — it's safe and won't double-charge.";
  }
  if (m.includes("unauthorized") || m.includes("401")) {
    return "Your session expired. Sign in again, then press Retry.";
  }
  if (m.includes("non-2xx") || m.includes("500")) {
    return "The verification service returned an error. Press Retry in a moment.";
  }
  return raw!;
}

/** Invokes paystack-verify and always surfaces the real server error message. */
export async function verifyPayment(reference: string): Promise<VerifyResult> {
  const { data, error } = await supabase.functions.invoke("paystack-verify", {
    body: { reference },
  });

  if (error) {
    let serverMsg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.error) serverMsg = body.error;
        return { ...body, error: explainPaymentError(serverMsg) };
      }
    } catch {
      /* fall through to generic message */
    }
    return { error: explainPaymentError(serverMsg), retryable: true, reference };
  }

  if (data?.error) return { ...data, error: explainPaymentError(data.error) };
  return { ...(data as VerifyResult), reference };
}
