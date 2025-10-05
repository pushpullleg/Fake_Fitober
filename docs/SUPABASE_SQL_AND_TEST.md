# Supabase table SQL and quick curl test

Use this file to create the `logs` table in Supabase and to test the Vercel serverless webhook once it's deployed.

## 1) SQL to create the table

Run this in Supabase SQL editor (or psql) against your project database:

```sql
-- Create a simple logs table for Fitober submissions
CREATE TABLE public.logs (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  team text,
  member text NOT NULL,
  cwid text,
  activity text NOT NULL,
  duration integer
);

-- Optional: allow the anon REST API to INSERT if you want; otherwise keep service_role usage server-side
-- GRANT INSERT ON public.logs TO anon;
```

Notes:
- Using the Supabase REST API (PostgREST) requires the appropriate `apikey` header (use `service_role` key server-side).
- Keep `service_role` secret and pass it only from server-side code (like Vercel function).

## 2) Example curl test (call Vercel webhook)

Replace `https://your-project.vercel.app/api/log` and `<WEBHOOK_TOKEN>` with your deployed values.

```bash
curl -v -X POST 'https://your-project.vercel.app/api/log' \
  -H 'Authorization: Bearer <WEBHOOK_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "team":"The Excel-erators",
    "member":"Mukesh Ravichandran",
    "cwid":"50380788",
    "activity":"Walking",
    "duration":30
  }'
```

Expected response (200 OK):

```json
{
  "ok": true,
  "inserted": [ { "id": 123, "created_at": "...", "team": "The Excel-erators", "member": "Mukesh...", "activity": "Walking", "duration": 30 } ]
}
```

If you get a 403 response, check that the `WEBHOOK_TOKEN` header matches the `WEBHOOK_TOKEN` set in Vercel.
If you get a 502 response with Supabase error, verify `SUPABASE_URL` and `SUPABASE_KEY` in Vercel env vars.

## 3) Troubleshooting
- Use the Vercel deployment logs (Dashboard → Functions) to see server-side errors.
- Use the Supabase table editor to see inserted rows.
- If CORS issues appear when calling from the browser, note that serverless functions accept requests from anywhere — the Authorization token is the gate.

---
Once you've deployed, run the curl test and tell me the result; I can help fix any errors from the response or logs.
