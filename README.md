# Fake Fitober — Quick Start

This repository contains a small static web UI to prefill a Google Form and a simple webhook example (Node + SQLite) to capture submissions without needing the form owner to install Apps Script.

I'll walk through the minimal, recommended flow first then include optional deployment notes.

## Goals
- Host the static UI on GitHub Pages and share it with teammates.
- Capture every user's intended submission in your own webhook/database when they click Submit even if they don't submit the Google Form.

## 1) Configure the static UI (GitHub Pages)
1. Edit `index.html` and find the small configuration block near the bottom; change these to point at your deployed webhook and API key:

```html
<script>
	window.WEBHOOK_ENDPOINT = 'https://your-webhook.example.com/api/log';
	window.WEBHOOK_API_KEY = 'your-api-key';
</script>
```

2. Commit and push these changes to your `main` branch.
3. Enable GitHub Pages in the repository settings (use the `main` branch and `/` root). Your site will be available at `https://<your-github-username>.github.io/<repo>/`.

Notes:
- Any value put here is visible to users because GitHub Pages serves static files.
- For dev/testing, you can leave the defaults (local webhook URL + `dev-key`) and run the webhook locally.

## 2) Run the webhook locally (optional, for testing)
This webhook stores logs in a local SQLite database and exposes `/api/log` (POST) and `/api/logs` (GET).

1. Copy and edit the env file:

```bash
cp server/.env.example server/.env
# Edit server/.env and set API_KEY to a secret (for local testing you can use 'dev-key')
```

2. Install and start the server:

```bash
cd server
npm install
npm start
```

3. Make sure `index.html` in the client points to `http://localhost:3000/api/log` and `dev-key` if testing locally.

4. Open your GitHub Pages-hosted page (or open the `index.html` locally) and test a submission. The server prints logs to the console and saves records to `server/data.db`.

## 3) Deploying the webhook (recommended hosts)
You can deploy the `server/` folder as a small Node app on many hosts. Two quick recommendations:

- Render: create a new web service, set `PORT` and `API_KEY` in environment variables, and push the repo.
- Vercel: convert `server/index.js` to a serverless function (one file) and use a managed DB (Supabase) instead of SQLite.

For a quick start, Render is the fastest for a Node web service. Once deployed, update `index.html` with the public webhook URL and a production API key.

## 4) Client behavior and security considerations
- When a teammate clicks the app Submit button, the client will first POST the submission payload to the configured webhook endpoint (Authorization header `Bearer <API_KEY>`).
- The client then opens the prefilled Google Form URL in a new tab so the user can optionally submit to the owner’s form.
- Because the API key is visible in the static site, protect your webhook server by:
	- validating the token server-side;
	- enabling rate limits;
	- optionally restricting origin or IP ranges.

## 5) Optional: use Apps Script on the owner’s side (if owner cooperates)
If the Google Form owner is willing to install the Apps Script (`scripts/gs_onFormSubmit.gs`), submissions will also be forwarded from the owner’s form directly to your endpoint. See `scripts/gs_onFormSubmit.gs` for a copy/paste template.

## Troubleshooting
- If posts to `/api/log` fail: check browser console for CORS errors and ensure the webhook allows your GitHub Pages origin.
- Check `server` console for DB and server logs (local testing).

---
If you want, I can next:
1. Add a Vercel serverless handler for easy one-click deployment.
2. Add a small `docs/TEAM.md` to share with teammates (explaining how to use the page and privacy notes).
3. Create a simple curl command and GitHub Actions workflow to deploy the server to Render.

Tell me which of these (1 / 2 / 3) to do next and I'll proceed step-by-step.