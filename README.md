# bioagent — The Viking Christian "10 Questions"

An adaptive, AI-guided self-discovery experience for linking from
**@thevikingchristian**'s bio. The visitor is asked ten questions, one at a
time, each built on their previous answer — then receives a personal reflection
in Zak's voice, with an option to leave their email to continue.

Built with Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel.
The OpenAI key stays server-side inside serverless API routes.

## How it works

```
Browser (app/page.tsx)
  → POST /api/question   one adaptive question at a time (history sent each call)
  → POST /api/insight    closing reflection after question 10
  → POST /api/lead       email capture
```

Zak's personality / knowledge / worldview lives in **`content/persona.md`** and
is injected as the system prompt. Editing that file changes the whole tone of
the experience — no code changes needed.

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in OPENAI_API_KEY
npm run dev                  # http://localhost:3000
```

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | yes | Server-side only. |
| `OPENAI_MODEL` | no | Defaults to `gpt-5-mini`. Swap freely (e.g. `gpt-4o-mini`). |
| `RESEND_API_KEY` | no | Set (with the two below) to email each lead to Zak. |
| `LEAD_NOTIFY_TO` | no | Where lead notifications are sent. |
| `LEAD_NOTIFY_FROM` | no | Verified Resend sender address. |

## Deploying to Vercel

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new).
2. Add the env vars above in **Settings → Environment Variables**.
3. Deploy. Pushes to `main` redeploy automatically.

## TODO before launch

- [ ] Zak fills in `content/persona.md` with his real skill sheet.
- [ ] Decide the lead destination (Resend email, Google Sheet, Mailchimp…) and wire it in `app/api/lead/route.ts`.
- [ ] Confirm the exact OpenAI model id available on the account and set `OPENAI_MODEL`.
- [ ] Brand polish (fonts, colors, logo) in `app/globals.css` and `app/page.tsx`.
