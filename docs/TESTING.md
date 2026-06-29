# Testing Guide

## QA Team

- QA Lead: owns release sign-off, bug priority, and this checklist.
- Manual QA: runs WhatsApp, dashboard, mobile, and restaurant workflow tests.
- Automation QA: maintains repeatable webhook, parser, dashboard, and regression tests.
- Security reviewer: checks auth, secrets, webhook abuse, rate limits, and exposed diagnostics before launch.
- Restaurant workflow reviewer: tests rush-hour usage, staff mistakes, order handling, and customer confusion.

## Release Gate

Every production release must pass:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

Then run one production smoke test:

1. Send `MENU` from a real WhatsApp test user.
2. Add one item with quantity.
3. Checkout.
4. Upload a payment screenshot.
5. Confirm the bot replies with an order code.
6. Confirm the order appears in `/dashboard/orders`.
7. Confirm live refresh updates within 10 seconds.
8. Confirm sound alert works after clicking `Enable sound`.
9. Change order status to `ready`, then `completed`.
10. Export orders CSV.

## WhatsApp Ordering Tests

- `HI` shows welcome buttons.
- `MENU` shows category list.
- Category selection shows item list.
- Item selection adds to cart.
- Quantity buttons `1`, `2`, `3` update the last item.
- `Add more` returns to menu.
- `Checkout` shows total, UPI, maps link, and screenshot instruction.
- Screenshot after checkout creates an order and clears the cart.
- `TRACK` returns latest order status.
- `ORDER AGAIN` repeats the last order.
- `CLEAR` clears the cart.
- Unknown text receives a helpful fallback.

## Dashboard QA

- Dashboard loads without manual refresh.
- Last updated time changes every 10 seconds.
- Pause stops auto refresh.
- Refresh button updates immediately.
- Sound button enables alerts after user click.
- New orders highlight briefly.
- Orders can be filtered by status, date, and search.
- Order status can be changed.
- Reports page totals match visible orders.
- Menu page can mark items unavailable.
- Unavailable items disappear from WhatsApp menu.
- Settings changes update checkout text.
- CSV export downloads successfully.
- Mobile dashboard remains usable.

## Payment OCR Tests

- Correct amount and correct UPI shows matched OCR data when readable.
- Wrong amount is flagged.
- Wrong UPI is flagged.
- Blurry screenshot does not block order creation.
- Non-payment image does not crash webhook.
- Missing `OPENAI_API_KEY` does not block order creation.
- Missing `payment_ocr` column should be fixed before launch with:

```sql
alter table orders add column if not exists payment_ocr jsonb;
```

## Edge Cases

- Customer sends screenshot before checkout.
- Customer sends document instead of image.
- Customer sends duplicate screenshot.
- Meta retries the same webhook message.
- WhatsApp access token expires.
- Supabase request fails.
- Vercel redeploy happens during an order.
- Restaurant is closed while customer sends `MENU`.
- Menu item becomes unavailable mid-order.
- Multiple staff keep dashboard open at the same time.
- Staff edits a status while auto refresh runs.
- Browser blocks sound until user interaction.
- Very large order has many line items.
- Customer sends Telugu/Hindi/mixed text.
- Customer sends payment screenshot with no transaction ID visible.

## Security Checks

- Rotate any key pasted into chat or stored outside Vercel/Supabase.
- Remove `/api/diagnostics` before public launch.
- Restore dashboard password or staff login before public launch.
- Remove hardcoded WhatsApp verify token fallback before public launch.
- Confirm service role key is never exposed to browser code.
- Confirm webhook rate limit is enabled.
- Confirm Supabase RLS is enabled on private tables.
- Confirm Vercel environment variables exist for production and preview.

## Bug Severity

- P0: order cannot be placed, dashboard cannot load, payment/order data exposed.
- P1: order can be lost, duplicate charged order, staff cannot update status, WhatsApp bot silent.
- P2: OCR wrong/unreadable, filters broken, export wrong, live refresh/sound broken.
- P3: visual polish, copy issues, spacing, non-critical usability.

## Test Accounts

Track each run with:

- tester name
- date/time
- deployment URL
- phone number used
- order code
- pass/fail result
- screenshots for failures
