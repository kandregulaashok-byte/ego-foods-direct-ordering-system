# Deployment Guide

## Supabase

1. Create a Supabase project.
2. Install the Supabase CLI locally.
3. From this repository, run:

```bash
supabase link --project-ref <project-ref>
supabase db push
supabase db reset
```

4. Confirm the `payment-screenshots` storage bucket exists.
5. Copy the project URL, anon key, and service-role key into Vercel environment variables.

## Meta WhatsApp Cloud API

1. Create a Meta app with WhatsApp enabled.
2. Add the restaurant phone number.
3. Set the webhook callback URL to:

```text
https://<vercel-domain>/api/webhooks/whatsapp
```

4. Use `WHATSAPP_VERIFY_TOKEN` as the webhook verify token.
5. Subscribe to `messages`.
6. Add `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` to Vercel.

## Vercel

1. Import the repository.
2. Add all variables from `.env.example`.
3. Deploy.
4. Open `/dashboard` and sign in with `DASHBOARD_PASSWORD`.

## Rollback

Use Vercel's deployment rollback for application issues. For database rollback, create a forward migration that reverses the faulty change; avoid dropping production data.
