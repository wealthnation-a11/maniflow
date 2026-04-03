

## Simplified Social Platform Connection Flow

### What You Want
- WhatsApp: connect using just a phone number
- Facebook & TikTok: one-click OAuth "Connect" buttons
- All channels feed into the Inbox for manual or AI-powered replies

### Important Reality Check

These platforms require **developer API credentials** to send/receive messages programmatically. Here's what's feasible:

**WhatsApp** -- Meta's WhatsApp Cloud API requires a Meta Business account, an App, and API tokens. We *cannot* connect with just a phone number. However, Meta offers an **Embedded Signup** flow that simplifies onboarding: the user clicks "Connect WhatsApp," a Meta popup walks them through authorization, and we receive the tokens automatically. This is the simplest experience possible.

**Facebook** -- We can implement **Facebook Login OAuth**. User clicks "Connect," authorizes page messaging permissions in a Meta popup, and we receive page tokens automatically. No manual token/page ID entry needed.

**TikTok** -- TikTok's messaging API is **very limited** and not openly available for third-party inbox tools. TikTok for Business API focuses on ads/analytics, not DM management. This is not feasible to implement currently.

### Proposed Plan

#### 1. Add Meta App credentials as secrets
- Store `META_APP_ID` and `META_APP_SECRET` as backend secrets
- These are needed for both WhatsApp Embedded Signup and Facebook OAuth

#### 2. Create an OAuth edge function (`meta-oauth`)
- Handles the OAuth callback from Meta
- Exchanges auth codes for long-lived page/WhatsApp tokens
- Stores tokens in `platform_connections` automatically

#### 3. Simplify WhatsApp connection UI
- Replace the manual form with a "Connect WhatsApp" button
- Opens Meta's Embedded Signup flow (or simplified OAuth)
- User authorizes their WhatsApp Business account in the popup
- Tokens and phone_number_id are saved automatically

#### 4. Simplify Facebook connection UI
- Replace the manual form with a "Connect Facebook" button
- Opens Facebook Login OAuth popup requesting `pages_messaging` permission
- User selects their page, tokens are saved automatically

#### 5. Update Settings page UI
- Each platform shows a card with a single "Connect" button
- Connected platforms show status + "Disconnect" option
- Remove manual token/page ID input fields

#### 6. Add TikTok as "Coming Soon"
- Show TikTok card with a disabled "Coming Soon" badge
- No implementation until TikTok opens their messaging API

### Technical Details

**Database**: Add `tiktok` to the `platform_type` enum for future use. No other schema changes needed -- `platform_connections` already has the right columns.

**Edge Function** (`supabase/functions/meta-oauth/index.ts`):
- Receives OAuth redirect with auth code
- Calls Meta Graph API to exchange for access token
- Fetches user's pages/WhatsApp accounts
- Inserts into `platform_connections`
- Redirects back to Settings page with success status

**Frontend OAuth flow**:
- Opens `https://www.facebook.com/v18.0/dialog/oauth?client_id=...&redirect_uri=...&scope=pages_messaging,whatsapp_business_management`
- Redirect URI points to the meta-oauth edge function
- Edge function processes and redirects back to app

**Files to create**: `supabase/functions/meta-oauth/index.ts`
**Files to edit**: `src/pages/Settings.tsx`

### Prerequisites
You'll need to provide:
1. A **Meta App ID** from developers.facebook.com
2. A **Meta App Secret** from the same dashboard

These are required for any OAuth-based connection with Meta platforms.

