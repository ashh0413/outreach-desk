# Outreach Desk

Private Sites dashboard for Aston Rodrigues. Imports 100 researched businesses, 66 unsent ready messages, two previously sent emails, one known bounce and 31 held records. No emails were sent while developing this app.

## Gmail activation

Enable Gmail API in a Google Cloud project. Configure OAuth consent and add astonajoy77@gmail.com as a test user if in Testing. Create a Web OAuth client with the deployed origin https://aston-outreach-desk.rvsatish.chatgpt.site as an authorized JavaScript origin. Enter its client ID in Setup. No secret or password is required. Then connect Gmail and consent to gmail.send plus userinfo.email. The sender is enforced on the server.

Token-model OAuth: short-lived access tokens are held in memory only, passed to the send endpoint and never persisted or logged. Reconnect after expiration or page reload. Gmail sending is implemented but cannot be tested end-to-end until the user configures OAuth and grants consent. See https://developers.google.com/identity/oauth2/web/guides/use-token-model and https://developers.google.com/workspace/gmail/api/guides/sending.

## Safety and status

D1 reserves every attempt before contacting Gmail. Concurrent clicks and ambiguous network failures cannot silently resend. Uncertain/failed attempts stay blocked for manual investigation. Do not reset rows until Gmail Sent has been checked. Sent means Gmail accepted the request, not proof of delivery. The app does not read the inbox; bounce and opt-out labels are manual. Historical sent/bounced records are blocked in source as well as UI. Each action checks platform identity and POST origin. Keep Site access owner-only.

Messages use researched text excerpts and a portfolio link, not a file attachment. Held records intentionally have no send-ready email; do not invent claims. Source text can include hidden page content and findings may become stale. Refresh research before a later campaign.

## Verification

Run node --test tests/send.test.cjs, npx tsc --noEmit and npm run build. Tests mock Google; they do not send. WebMCP preview_business_email is optional and never sends. No supported live WebMCP validation context was used, so its runtime registration is unverified. No browser UI QA was performed.
