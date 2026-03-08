

# Configurable AI Sales Bot with Q&A, Negotiation & Payment Collection

## Overview

Transform AutoServe from a demo with hardcoded AI responses into a configurable chatbot platform where users define their own Q&A pairs, set negotiable prices, and collect payment details automatically.

## What We'll Build

### 1. Bot Configuration Page (`/bot-config`)
A new page where users set up their chatbot behavior:

- **Q&A Pairs Manager** — Add/edit/delete question-answer pairs (e.g., "What's your delivery time?" → "We deliver in 2-3 days"). Each pair has a keyword trigger and a response.
- **Products & Pricing with Negotiation Rules** — For each product, set:
  - Fixed price (non-negotiable) OR a price range (min/max) for negotiable items
  - A flag: "Open for negotiation" yes/no
  - Auto-accept threshold (e.g., accept any offer above ₦12,000)
- **Payment Details Section** — Configure bank account details (bank name, account number, account name) that the bot shares after a deal is agreed upon.
- **Business greeting & fallback message** — Custom welcome message and "I don't understand" fallback.

### 2. Enhanced AI Response Engine (in `Inbox.tsx`)
Replace the hardcoded `getAIResponse` function with a dynamic engine that:

1. Matches incoming messages against configured Q&A keyword triggers
2. For price queries → checks the product catalog and shows prices
3. For negotiation ("Can you do ₦10,000?") → compares against min/max range:
   - If within range → accepts and shares payment details
   - If below minimum → counter-offers with the minimum price
   - If product is non-negotiable → politely declines
4. After agreement → automatically sends configured bank/payment details
5. Falls back to the custom fallback message for unmatched queries

### 3. Negotiation Flow in Chat
The conversation flow will be:
```text
Customer: "How much is the Hair Cream Set?"
Bot: "The Hair Cream Set is ₦15,000. Would you like to order?"
Customer: "Can you do ₦12,000?"
Bot: "I can offer ₦13,000 as our best price. Deal? 😊"
Customer: "Deal!"
Bot: "Great! Please make payment to:
      Bank: GTBank
      Account: 0123456789
      Name: My Business Ltd
      Amount: ₦13,000
      Send confirmation after payment! ✅"
```

### 4. Settings Page Updates
- Add payment/bank details fields to the existing Settings page (Payment Integration section)
- These details are referenced by the bot config

## Technical Approach

### New Files
- `src/pages/BotConfig.tsx` — Main configuration page with tabs: Q&A Pairs, Negotiation Rules, Payment Details, Preview/Test

### Modified Files
- `src/pages/Inbox.tsx` — Replace `getAIResponse()` with dynamic matching engine that reads from config state
- `src/pages/Settings.tsx` — Add bank account details fields
- `src/components/AppSidebar.tsx` — Add "Bot Config" nav item
- `src/App.tsx` — Add `/bot-config` route

### State Management
All configuration stored in React state (localStorage-persisted) since there's no backend yet. A shared context or simple store pattern will hold:
- `qaRules: { id, keywords: string[], response: string }[]`
- `negotiationRules: { productId, minPrice, maxPrice, negotiable: boolean }[]`
- `paymentDetails: { bankName, accountNumber, accountName }`
- `botSettings: { greeting, fallback, tone }`

### Dynamic Response Engine
The `getAIResponse` function becomes a priority-based matcher:
1. Check greeting keywords → return custom greeting
2. Check Q&A pairs by keyword match → return configured answer
3. Check product/price queries → return product info with negotiation status
4. Detect negotiation attempt (price offer) → run negotiation logic
5. Detect agreement ("deal", "yes", "ok") → share payment details
6. Fallback → custom fallback message

## Files Changed Summary
| File | Change |
|------|--------|
| `src/pages/BotConfig.tsx` | New — full config UI with Q&A, negotiation, payment tabs |
| `src/pages/Inbox.tsx` | Modified — dynamic AI engine using config |
| `src/pages/Settings.tsx` | Modified — bank account fields |
| `src/components/AppSidebar.tsx` | Modified — add Bot Config nav |
| `src/App.tsx` | Modified — add route |

