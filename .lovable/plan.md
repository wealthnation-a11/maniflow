

# Real Platform Integration — Making the Bot Work with WhatsApp, Instagram & Facebook

## Current State
- Social connections in Settings are UI-only (no real API calls)
- Inbox has hardcoded mock conversations
- Bot engine (`generateAIResponse`) runs client-side only
- No webhook infrastructure exists

## What Needs to Be Built

### 1. Database Tables
- **conversations** — stores each chat thread (platform, customer info, user_id, status)
- **messages** — stores individual messages (conversation_id, role, content, timestamp)
- **platform_connections** — stores each user's connected platform credentials (user_id, platform, access_token, page_id, phone_number_id, webhook_verify_token)
- **bot_configs** — moves bot config from localStorage to database (user_id, qa_rules, negotiation_rules, payment_details, bot_settings)

### 2. Edge Functions (Backend)
- **`whatsapp-webhook`** — receives incoming WhatsApp messages from Meta Cloud API, looks up the user's bot config, generates a response, sends reply via WhatsApp API
- **`meta-webhook`** — receives incoming Instagram/Facebook Messenger messages, same flow
- **`connect-platform`** — handles OAuth flow for Facebook/Instagram pages and WhatsApp Business API setup

### 3. Meta Developer Setup (User's Responsibility)
Each user would need a **Meta Business account** with:
- A WhatsApp Business API phone number
- An Instagram Professional account connected to a Facebook Page
- A Meta App with webhooks configured to point to your edge function URLs

### 4. Flow
```text
Customer sends message on WhatsApp/IG/FB
        │
        ▼
Meta sends webhook POST → Edge Function
        │
        ▼
Look up platform_connection → find user
        │
        ▼
Load bot_config for that user
        │
        ▼
Run generateAIResponse() server-side
        │
        ▼
Send reply via Meta API ← and store in messages table
        │
        ▼
User sees conversation in real-time Inbox (via Supabase Realtime)
```

### 5. Required Secrets
- Users will need to provide their **Meta App Secret** and **Page Access Tokens** (stored per-user in `platform_connections`, encrypted)
- A shared **Meta App ID** and **App Secret** for webhook verification (stored as edge function secrets)

### 6. UI Changes
- **Settings** — "Connect" buttons launch a real setup flow (enter WhatsApp Business phone number ID + access token, or Facebook Page OAuth)
- **Inbox** — fetches real conversations from database with Supabase Realtime subscriptions
- **Bot Config** — saves to database instead of localStorage

### 7. Implementation Order
1. Create database tables (conversations, messages, platform_connections, bot_configs)
2. Move bot config to database
3. Build real Inbox reading from database with Realtime
4. Build WhatsApp webhook edge function (most common platform)
5. Build Meta webhook for Instagram/Facebook
6. Update Settings with real connection flows
7. Add WhatsApp reply capability

### Important Consideration
This is a **large feature** requiring Meta API credentials and developer account setup. The Meta Business API approval process can take days/weeks. We can start building the infrastructure now and test with the WhatsApp Cloud API sandbox.

