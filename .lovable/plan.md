

## Plan: Database Tables + Settings Persistence + ConfirmDialog Fix

### 1. Create database tables for Products, Orders, Customers, and Campaigns

**Migration** creates four new tables, all with `user_id` referencing `auth.uid()` and RLS policies:

**`products`** table:
- `id` (uuid, PK), `user_id` (uuid), `name` (text), `description` (text), `price` (numeric), `image_url` (text), `stock` (integer, default 0), `category` (text), `variants` (jsonb, default `[]`), `created_at`, `updated_at`

**`orders`** table:
- `id` (uuid, PK), `user_id` (uuid), `customer_name` (text), `customer_phone` (text), `product_name` (text), `amount` (numeric), `platform` (platform_type), `status` (new enum: `pending`, `processing`, `shipped`, `delivered`), `payment_status` (new enum: `pending`, `paid`, `failed`), `created_at`, `updated_at`

**`customers`** table:
- `id` (uuid, PK), `user_id` (uuid), `name` (text), `phone` (text), `email` (text), `platform` (platform_type), `total_orders` (integer, default 0), `total_spent` (numeric, default 0), `status` (new enum: `active`, `inactive`, `new`), `preferences` (text[], default `{}`), `first_seen` (timestamptz), `last_order_at` (timestamptz), `created_at`

**`campaigns`** table:
- `id` (uuid, PK), `user_id` (uuid), `name` (text), `message` (text), `platforms` (text[]), `audience` (text), `status` (new enum: `draft`, `scheduled`, `sent`, `active`), `recipients` (integer, default 0), `opened` (integer, default 0), `replied` (integer, default 0), `scheduled_at` (timestamptz), `sent_at` (timestamptz), `created_at`, `updated_at`

All tables get RLS: `authenticated` users can ALL where `user_id = auth.uid()`.

Also add a `payment_details` jsonb column to `profiles` for bank info, and add realtime for orders.

### 2. Connect Products page to database

- Replace `initialProducts` with a Supabase query
- CRUD operations (add, edit, delete) use Supabase inserts/updates/deletes
- Product type updated to use uuid IDs

### 3. Connect Orders page to database

- Replace `const orders = []` with a Supabase query
- Remove hardcoded type, use database rows
- Stats computed from real data

### 4. Connect Customers page to database

- Replace `const customers = []` with a Supabase query
- Stats computed from real data

### 5. Connect Campaigns page to database

- Replace `const mockCampaigns = []` with a Supabase query
- CRUD operations for creating/editing campaigns

### 6. Persist Settings to database

- On mount, load profile data from `profiles` table (ai_tone, business_name, timezone, currency, phone, logo_url)
- Populate form fields with loaded values
- "Save Changes" button writes all values back to `profiles` table via `supabase.update()`
- Payment details saved to `profiles.payment_details` jsonb or to `bot_configs.payment_details`
- Logo upload: create a `logos` storage bucket, upload file, save public URL to `profiles.logo_url`
- Remove dependency on `businessStore.ts` localStorage

### 7. Fix ConfirmDialog ref warning

- Wrap `ConfirmDialog` with `React.forwardRef` or wrap inner elements properly to suppress the console warning

### Technical Details

**Files to create/edit:**
- `supabase/migrations/...` -- new migration for 4 tables + enums + RLS + profiles column
- `src/pages/Products.tsx` -- replace local state with Supabase CRUD
- `src/pages/Orders.tsx` -- replace empty array with Supabase query
- `src/pages/Customers.tsx` -- replace empty array with Supabase query
- `src/pages/Campaigns.tsx` -- replace mock data with Supabase CRUD
- `src/pages/Settings.tsx` -- load/save profile data from database
- `src/components/ConfirmDialog.tsx` -- fix ref warning
- `src/store/businessStore.ts` -- update to sync with DB instead of localStorage

**Storage bucket:** Create `logos` bucket for logo uploads (public access).

