# API Documentation

## WhatsApp Webhook

`GET /api/webhooks/whatsapp`

Meta webhook verification endpoint. Configure the verify token with `WHATSAPP_VERIFY_TOKEN`.

`POST /api/webhooks/whatsapp`

Accepts Meta WhatsApp Cloud API webhook payloads. Supported message types:

- `text`: hi, hello, menu, add item, quantity, remove item, clear cart, checkout, track, order again, note.
- `interactive`: button replies.
- `image` and `document`: payment screenshots or PDF receipts.
- Other message types are acknowledged with a safe fallback response.

The route deduplicates messages using `processed_webhooks.message_id`.

## Authentication

`POST /api/auth/login`

Request:

```json
{ "password": "dashboard password" }
```

Sets an httpOnly dashboard session cookie.

`POST /api/auth/logout`

Clears the dashboard session cookie.

## Orders Export

`GET /api/orders/export?status=preparing&from=2026-06-28&to=2026-06-29&search=roll`

Returns a CSV file containing order ID, customer, WhatsApp number, items, amount, status, and created time.
