# Fake Fitober Backend

This small webhook captures Fitober logs from the static client and stores them in a local SQLite database. It's intended for local testing or simple hosted deployments.

Quick start (local)

1. Copy example env and install dependencies

```bash
cp .env.example .env
# edit .env and set API_KEY
npm install
npm start
```

2. Client configuration

Open `index.html` and update the public config block near the bottom:

```html
<script>
  window.WEBHOOK_ENDPOINT = 'https://your.domain/api/log';
  window.WEBHOOK_API_KEY = 'your-api-key';
</script>
```

3. Security

- Do not commit production API keys to GitHub. For GitHub Pages, you must accept that the API key in the client is visible. To keep it secure, deploy the webhook on a server and restrict incoming requests by origin or IP where possible.
- Better: implement a short-lived token exchange or require user authentication before calling the webhook.

Deployment options

- Render / Heroku / DigitalOcean App Platform: deploy `server/` as a small Node app (set environment variable `API_KEY`).
- Vercel (Serverless): Port the handler to a serverless function and use a managed DB (Supabase / Postgres) instead of local SQLite.
- Supabase: Use Supabase client from the browser (authenticated) to directly write rows (recommended if you want a managed DB without your own server).

Why GitHub Pages + webhook

- Hosting the static UI on GitHub Pages is convenient for sharing the prefill UI with teammates.
- The webhook (deployed separately) is necessary to collect intended submissions server-side without requiring the Google Form owner to install Apps Script.

If you want, I can:
- Add deployment instructions for Render or a ready-to-deploy `render.yaml`.
- Convert the webhook into a Vercel serverless function (easy to deploy on Vercel).

