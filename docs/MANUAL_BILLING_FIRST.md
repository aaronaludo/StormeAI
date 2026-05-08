# Manual Billing First, Paddle Later

StormeAI can launch with manual billing first, then add Paddle later when pricing, positioning, and customer demand are validated.

This is the recommended MVP approach.

## Decision

Use **manual subscription management + bank transfer** for the first beta/MVP customers.

Keep **Paddle** in the architecture as the future automated billing provider.

## Why manual billing first is okay

Manual billing is a practical early-stage shortcut because:

- MVP can launch faster
- No need to wait for Paddle account/API approval
- First customers may prefer bank transfer
- Pricing can be tested before automating subscriptions
- Fewer billing edge cases during product discovery
- Easier to onboard clinics personally

This does not remove Paddle from the product. It simply delays automated billing until the product has real paying users.

## MVP billing flow

```txt
Clinic signs up
→ Clinic chooses a plan
→ Admin sends payment instructions manually
→ Clinic pays by bank transfer
→ Admin verifies payment
→ Admin marks subscription as active
→ Clinic gets access based on plan limits
```

## Manual payment channels

Possible manual payment methods:

- Bank transfer
- GCash / Maya, if applicable
- Manual invoice
- Direct business account deposit

For professional clinic customers, bank transfer/manual invoice is usually acceptable during beta.

## What the app should support now

Even before Paddle is active, the app should include billing-ready fields.

Recommended subscription fields:

```txt
billing_provider
subscription_status
plan
billing_period_start
billing_period_end
trial_ends_at
manual_payment_reference
manual_payment_notes
manual_payment_confirmed_at
paddle_customer_id
paddle_subscription_id
paddle_price_id
paddle_product_id
```

Recommended values:

```txt
billing_provider = manual | paddle
subscription_status = trial | active | past_due | canceled | expired
plan = starter | pro | clinic_plus | enterprise
```

## Admin actions needed

The admin dashboard should eventually allow the owner/team to:

- view clinic billing status
- set plan manually
- activate subscription manually
- set billing period start/end
- record payment reference
- pause or cancel subscription
- upgrade/downgrade plan
- view usage limits

## Plan limits still matter

Even with manual billing, the system should enforce limits by plan.

Example limits:

| Feature | Starter | Pro | Clinic Plus |
| --- | --- | --- | --- |
| Clinics | 1 | 1 | Multiple branches |
| AI receptionist | 1 | 1-3 | Multiple |
| Monthly conversations | Limited | Higher | Custom |
| Knowledge documents | Limited | Higher | Custom |
| Appointment bookings | Limited | Higher | Custom |
| n8n workflows | Basic | Included | Advanced |
| Staff users | 1-2 | More | Custom |

The billing method should not control feature access directly. The app should control access using the clinic's saved plan and subscription status.

## Later Paddle migration

When ready, Paddle can replace manual billing for automated subscription management.

Future Paddle flow:

```txt
Clinic clicks upgrade
→ Paddle checkout opens
→ Payment succeeds
→ Paddle webhook fires
→ App updates subscription status
→ Clinic gets plan access automatically
```

Paddle should eventually handle:

- checkout
- recurring subscriptions
- invoices
- failed payments
- tax/VAT handling
- customer billing portal
- plan upgrades/downgrades
- subscription cancellations

## Migration strategy

When moving manual customers to Paddle:

1. Keep existing manual subscriptions active.
2. Add Paddle checkout for new customers first.
3. Offer existing customers a migration link.
4. Preserve their clinic account and plan.
5. Update `billing_provider` from `manual` to `paddle` after successful checkout.
6. Keep manual fallback for enterprise/custom accounts.

## Recommended MVP billing priority

For MVP, build in this order:

1. Manual plan/status fields in database
2. Admin ability to activate/deactivate clinics
3. Plan limit enforcement
4. Billing status display in clinic dashboard
5. Manual payment notes/reference tracking
6. Paddle integration later

## Final recommendation

Use manual billing first.

Do not block the StormeAI MVP on Paddle.

Paddle is still the right long-term billing provider, but the first priority is proving that clinics want and use the chat-only AI receptionist.