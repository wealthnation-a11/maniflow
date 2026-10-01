# Remaining Work on Maniflow

All requested features are built and the build is clean. Security scans show no open findings. What's left is verification and polish, plus the admin section you set aside earlier.

## 1. Admin section (deferred earlier)
- Admin dashboard to view all users/stores, credit balances, payments, and orders
- Admin actions: grant/adjust credits, resolve disputes, monitor payment proofs
- Role-based access using a `user_roles` table with an `admin` role

## 2. End-to-end verification (recommended before launch)
- Test the AI chatbot while signed in (earlier authenticated test was pending; a no-credit call correctly returned the "insufficient credits" response)
- Test the Meta OAuth connect flow on the published URL (maniflow.lovable.app) in a new tab — WhatsApp, Facebook, Instagram
- Place a real test order on a shared store link: add to cart, checkout, upload payment proof, owner approves, buyer tracks order
- Test a Paystack live payment with a store owner's secret key and confirm the webhook updates the order status

## 3. Store owner setup checklist (for real usage)
- Store owners must add the Paystack webhook URL in their Paystack dashboard so live payments auto-confirm
- Configure Google sign-in provider credentials (already integrated; needs provider keys enabled)

## 4. Optional polish
- Email templates for low-credit and trial-expiry notifications
- Custom domain for store links (e.g. maniflow.com/shopname instead of maniflow.lovable.app/shopname)

## Suggested order
1. Verify AI chat + Meta OAuth on the published URL
2. Test one full store purchase end-to-end
3. Build the admin section
4. Optional polish

## Technical details
- Admin section: new `public.user_roles` table (enum `app_role`), `has_role()` security-definer function, RLS policies on admin views, admin-only routes guarded by role check
- No database or security findings currently open
