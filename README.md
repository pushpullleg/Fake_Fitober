# Fake_Fitober — Google Form Prefill Helper (Static Client)

A small, static, client-side tool to build Google Form prefill URLs and optionally emit a lightweight webhook capture before opening the form. It's designed to be hosted on GitHub Pages (or any static file host) and used by non-owners of a Google Form to help contributors open pre-filled forms while recording intent to a webhook you control.

This repository contains only the client-side pieces required to generate prefilled links and a minimal integration pattern for capturing a record of the action. There are intentionally no server components included — you can integrate any webhook receiver you prefer (serverless function, small Express app, Zapier/Webhook.site, etc.).

Contents
- `index.html` — the static user interface and configuration block (FORM_CONFIG).
- `scripts/app.js` — client logic: UI wiring, URL construction, optional webhook POST, and toast UI.
- `images/` — visual assets used by the UI.

Why this exists
- Some contributors need an easy way to open a Google Form prefilled with selected values (member, activity, duration) without being the owner of the destination form. This tool builds the correct prefill URL and, if configured, posts a small JSON payload to a webhook you control before opening the form in a new tab.

Quick start
1. Host on GitHub Pages (recommended): create a branch (e.g., `gh-pages`) and enable GitHub Pages for the repository root or use the `main` branch with `docs/` as appropriate.
2. Edit `index.html` and update the `FORM_CONFIG` object near the top of the file:
   - `formBaseURL` — the base form URL (e.g., `https://docs.google.com/forms/d/e/<FORM_ID>/viewform`).
   - `entries` — mapping object where keys are logical names and values match the Google Form entry IDs (e.g., `"member": "entry.123456"`).
   - `teamMembers`, `activities`, `durations` — arrays used to populate the UI.
3. Optionally add a webhook: set `window.WEBHOOK_ENDPOINT` and `window.WEBHOOK_API_KEY` in `index.html` (or configure them client-side before deployment). The client will POST a small JSON payload before opening the prefilled form.

Configuration details
- FORM_CONFIG (in `index.html`) — single source of truth for form mapping and UI values. Keep entry IDs private if they are sensitive; entry IDs themselves are not secrets but the webhook token is.
- Webhook payload (example):
  {
    "member": "Alice",
    "activity": "Run",
    "duration": 30,
    "when": "2025-10-05T12:00:00.000Z"
  }

Security and privacy notes
- The client runs entirely in the user's browser. Any API keys or tokens embedded in `index.html` will be visible to end users. If you require secrecy for webhook authorization, host a small server that accepts an unauthenticated request from the client and forwards it server-side with the secret.
- No persistent logs are stored in this repository. The client intentionally does not include localStorage logging or a leaderboard.

Recommended webhook receivers
- Serverless (AWS Lambda / Azure Functions / Google Cloud Functions) — quick and inexpensive.
- Small Express app (Node) behind basic auth or API key.
- Managed automation tools (Zapier, Make, Pipedream) for low-traffic flows.

Development and testing
- Edit `index.html` locally and open it in a browser. Because the client is static, no server is required for development.
- To test webhook delivery without building a server, you can use a request inspector like `https://webhook.site` or configure a Pipedream/Zapier webhook.

Troubleshooting
- Prefilled values not appearing in the form: verify `entries` mapping keys match the form fields' entry IDs. In Google Forms, get entry IDs by inspecting the form's prefill workflow (Form → Get pre-filled link) and examining query parameters.
- Webhook POST failing: open the browser devtools Network tab to inspect the POST. Check CORS errors and ensure your webhook receiver sets permissive CORS headers or accepts the request.

Contributing
- This repository is intentionally minimal. If you want server samples (Express handler, serverless function templates) open an issue or submit a PR — I'll provide small, focused examples.

License
- MIT. See `LICENSE` (not included) or treat this repository under permissive terms.

Contact / Support
- If you want help configuring a webhook receiver or consolidating FORM_CONFIG, tell me how you'd like to store the entry IDs (in `index.html` or remotely) and I can implement it.

---
Small, focused, and ready for GitHub Pages — let me know if you'd like me to:
- consolidate form entry IDs into `scripts/app.js` or `index.html` (single source of truth),
- remove the sample webhook code entirely, or
- add a tiny serverless function example to accompany this client.
This repository has been cleaned. Only the client prefill UI remains in active use.