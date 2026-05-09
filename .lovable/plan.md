# Plan: Credit-Based Pricing & AI Message Billing

## New Pricing Structure


| Plan     | Price   | Type        | Credits        | Notes                                                                               |
| -------- | ------- | ----------- | -------------- | ----------------------------------------------------------------------------------- |
| Free     | ₦0      | 3-day trial | 100 (trial)    | Auto-expires after 3 days                                                           |
| Growth   | ₦10,000 | One-time    | 7,000 credits  | Credits expires after the credit is finish and the user is prompted to resubscribed |
| Business | ₦30,000 | One-time    | 20,000 credits | Credits expires after the credit is finish and the user is prompted to resubscribed |


**Credit cost per AI reply sent to a customer: 20 credits**
(7,000 credits ≈ 350 AI replies; 20,000 credits ≈ 1,000 AI replies)

## What Will Change

### 1. Database (migration)

Add to `profiles` table:

- `plan` (text: `free` | `growth` | `business`, default `free`)
- `credits_balance` (integer, default 100)
- `trial_ends_at` (timestamptz, default `now() + 3 days` for new users)
- `plan_purchased_at` (timestamptz, nullable)

New table `credit_transactions`:

- `user_id`, `amount` (signed int), `reason` (text: `trial_grant` | `purchase` | `ai_reply`), `conversation_id` (nullable), `created_at`

Update `handle_new_user()` to seed `plan='free'`, `credits_balance=100`, `trial_ends_at = now() + interval '3 days'`.

DB function `deduct_credits(p_user_id, p_amount, p_reason, p_conversation_id)`:

- Atomically checks balance, decrements, logs transaction. Returns success boolean.

### 2. AI Bot Engine — enforce credits

Wherever an AI reply is generated and sent (the AI response engine in webhooks / chat / bot test simulator), before sending:

1. Check if user has active access: `plan != 'free'` OR `trial_ends_at > now()`.
2. Check `credits_balance >= 20`.
3. If both pass → send reply, then call `deduct_credits(user_id, 20, 'ai_reply', conversation_id)`.
4. If not → skip AI reply (optionally log a "credits exhausted" system message; do not send to customer).

Files affected: `supabase/functions/chat/index.ts`, `supabase/functions/whatsapp-webhook/index.ts`, `supabase/functions/meta-webhook/index.ts`, and any bot-config test handler.

### 3. Pricing Page (`src/pages/Pricing.tsx`)

Rewrite the three plan cards:

- **Free** — "₦0 · 3-day trial" — 100 credits, all features, expires in 3 days. CTA: "Start Free Trial".
- **Growth** — "₦10,000 one-time" — 7,000 credits (~350 AI replies), no expiry. CTA: "Buy Growth".
- **Business** — "₦30,000 one-time" — 20,000 credits (~1,000 AI replies), no expiry. CTA: "Buy Business". Marked highlighted.

Add a small note: "Each AI reply costs 20 credits. Credits never expire on paid plans."

### 4. Checkout / Payment

**Question for you:** how should users actually pay for Growth / Business?

Options (pick one — see questions below):

- **A. Lovable Cloud Payments (Paddle/Stripe)** — proper checkout, requires enabling payments integration (Pro plan required on Lovable).
- **B. Manual bank transfer** — show your bank details, user uploads proof, you/admin manually credit them in DB.
- **C. Placeholder for now** — just wire the UI + credit logic; payment hooked up later.

On successful payment: set `plan`, add credits via `credit_transactions` (+7000 or +20000), set `plan_purchased_at`.

### 5. UI surfacing

- Show **credits balance** in the sidebar / topbar (small badge).
- On Dashboard, add a "Credits remaining" stat card.
- When trial expired or balance < 20, show a banner: "Top up to keep your AI bot replying" → links to /pricing.
- In Settings, add a "Plan & Credits" section showing current plan, balance, and a transactions list.

### 6. Files Touched

- `supabase/migrations/<new>.sql` (schema + function + trigger update)
- `supabase/functions/chat/index.ts`, `whatsapp-webhook/index.ts`, `meta-webhook/index.ts` (credit gate + deduct)
- `src/pages/Pricing.tsx` (new plan cards)
- `src/pages/Settings.tsx` (plan & credits section, top-up button)
- `src/components/AppSidebar.tsx` or topbar (credits badge)
- `src/pages/Dashboard.tsx` (credits stat + trial/low-balance banner)
- `src/hooks/useCredits.ts` (new) — fetch balance + realtime subscribe

---

## Please confirm before I implement: