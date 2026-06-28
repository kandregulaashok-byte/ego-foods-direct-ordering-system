# Testing Guide

## Local Checks

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

## WhatsApp Webhook Verification

1. Start the app with `npm run dev`.
2. Expose it with a secure tunnel.
3. Configure the tunnel URL in Meta.
4. Send `HI`, `MENU`, `add Paneer Roll`, `2`, `CHECKOUT`, and upload an image.
5. Verify the order appears in `/dashboard/orders`.

## Dashboard QA

- Login cookie is httpOnly and expires after 12 hours.
- Orders can be filtered and exported.
- Menu availability changes are reflected in WhatsApp menu responses.
- Settings changes update checkout text.
- Unknown WhatsApp messages receive a fallback response and do not crash.
