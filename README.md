# Outreach Desk — Vercel edition

A private Next.js dashboard for Aston Rodrigues. Each business has a prepared email with its researched website issue, a proposed improvement and a portfolio link. You review and click Send; nothing sends automatically.

## Deploy on Vercel

1. Import this GitHub repository into Vercel. Select **Next.js**, root directory `./`, default build/output settings and Node.js **22.x**.
2. Add a **Neon Postgres** database through **Storage / Marketplace**, and connect it to this project. Confirm Vercel sets `DATABASE_URL`.
3. In Google Cloud, enable **Gmail API** and configure an OAuth consent screen. Add **astonajoy77@gmail.com** as a test user if the consent app is in Testing.
4. Create an OAuth **Web application** client. Set `GOOGLE_CLIENT_ID` in Vercel to its client ID. No Google client secret is needed.
5. Deploy. Add your final Vercel origin (for example `https://your-project.vercel.app`, without a path) to that Google client's **Authorised JavaScript origins**. For local work also allow `http://localhost:3000`.
6. Redeploy after changing environment variables. Open the dashboard, sign in with the authorised Gmail account, then click **Connect Gmail** and approve sending.

You can deploy before configuring the services: the site shows a locked setup screen, not a public business list. Google sign-in works only after `GOOGLE_CLIENT_ID` and its allowed origin are configured. Sending also requires the database. The app creates its own `outreach_deliveries` table on the first authenticated database operation; no manual SQL is needed. Do not choose a read-only database role.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Required Google Web OAuth client ID; used for both sign-in and Gmail permission. |
| `DATABASE_URL` | Required Neon Postgres connection string; server-only secret injected by the integration. |
| `APP_URL` | Optional fixed production origin for additional origin checking. If set, it must match the address you open. Omit for separate preview origins. |

Set these for Production. Preview deployments need their own allowed Google origins and preferably a separate database. Do not send real campaigns from both preview and production.

## What's included

100 researched businesses: 66 ready, two previously sent, one known bounce, 31 held for verification. Messages for held entries intentionally remain unavailable until their contact/finding is confirmed. Gmail sending uses the official API. The portfolio is a link, not an attachment.

Google ID tokens are verified server-side for signature, issuer, audience, expiry and verified email. Only `astonajoy77@gmail.com` is admitted. Sign-in uses a short-lived nonce and an HttpOnly, SameSite cookie (Secure in production). No OpenAI/Cloudflare identity headers are trusted. Unauthenticated visitors cannot receive business data.

Gmail access tokens remain in memory; passwords, refresh tokens and access tokens are not stored in the database. The sign-in cookie contains a Google-signed ID token and expires within an hour. You may need to sign in/connect again after expiration or a reload.

Every send is reserved atomically in Postgres before contacting Gmail. Repeated/concurrent clicks cannot silently resend. Ambiguous/failed attempts remain blocked for manual investigation. Sent means accepted by Gmail, not proof of delivery. Bounces and opt-outs are marked manually; the inbox is not read.

## Moving from the older Sites version

This branch now targets Vercel, not Cloudflare Sites. The earlier source is preserved in Git history; the existing Sites deployment has not been changed. The known two sends and one bounce remain blocked in source. Any additional history accumulated in the old live app is **not automatically migrated**. If you have used that app since its initial creation, reconcile its history before sending here. Stop using the old app for sending when you switch.

## Local checks

```sh
npm ci
npm test
npm run build
npm run dev
```

Copy `.env.example` to an ignored `.env.local` and supply your service settings for authenticated local use.

Automated checks mock Google and the database and send no email. A production build is checked without secrets. Real Google sign-in, a live Neon database and actual email delivery still require your configured services and consent; they are not claimed as end-to-end tested. Browser UI QA and optional WebMCP runtime validation have not been performed.

References: [Google ID token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [Gmail permission model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs).
