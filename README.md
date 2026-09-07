# MediLink360 — Clinic Rollout CRM

Production rebuild of the `design_handoff_medilink360/` prototype.
Stack: **Vite + React + TypeScript** SPA · **Supabase** (Auth + Postgres + RLS + Storage) ·
deployed static to **Spaceship cPanel** at `https://crm.medilink360.ai`.

```
Medilink360/
  app/                          # the application
  design_handoff_medilink360/   # original design handoff (reference only)
  .cpanel.yml                   # Spaceship cPanel Git deploy hook
```

## Local development

```bash
cd app
npm install
cp .env.local.example .env.local     # then fill in the two values below
npm run dev                          # http://localhost:5174
```

`.env.local`:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

Both come from the Supabase dashboard → Project Settings → API.

## Backend setup (Supabase)

1. In the Supabase project, open **SQL editor** and run, in order:
   - `app/supabase/migrations/0001_init.sql`
   - `app/supabase/migrations/0002_rls.sql`
   - `app/supabase/migrations/0003_seed.sql` (demo data — optional in production)
2. **Auth users**: create one login per person under **Authentication → Users → Add user**
   (set a password, tick *auto-confirm*). Add `name` and `role` in *User metadata*:
   ```json
   { "name": "Khaled Fathy", "role": "CEO" }
   ```
   Valid roles: `CEO`, `Admin`, `Sales`, `Trainer`. The `on_auth_user_created`
   trigger creates the matching `public.profiles` row automatically.
3. **Auth URL config**: Authentication → URL Configuration → add
   `https://crm.medilink360.ai` to *Site URL* and *Redirect URLs*.
4. Optional — a Supabase **Edge Function** for in-app user creation (the "Team access"
   screen currently only pauses/restores logins). Not required to go live.

## Build

```bash
cd app
npm run build     # tsc -b && vite build  ->  app/dist/
```

## Deploy to Spaceship (cPanel Git Version Control)

cPanel clones this repo and runs `.cpanel.yml` on **Deploy HEAD Commit**. It does
**not** run `npm build`, so the built `app/dist/` is committed on a dedicated
`release` branch.

**One-time setup**

1. Push this repo somewhere cPanel can reach (GitHub, or cPanel's own git URL).
2. cPanel → **Git Version Control** → *Create* → clone the repo, set the deployment
   branch to `release`.
3. Edit `.cpanel.yml`: set `DEPLOYPATH` to the `crm.medilink360.ai` document root
   (cPanel → *Domains* shows it, e.g. `/home/USER/crm.medilink360.ai`).
4. Confirm the `crm` subdomain exists with an SSL cert (cPanel → *Domains* / *SSL/TLS*).

**Each release**

```bash
cd app && npm run build && cd ..
git checkout release
git merge main --no-edit
git add -f app/dist
git commit -m "release: <what changed>"
git push origin release
```

Then cPanel → Git Version Control → **Update from Remote** → **Deploy HEAD Commit**.

**Verify**: open `https://crm.medilink360.ai`, hard-refresh a deep route
(e.g. `/finance`) to confirm the `.htaccess` SPA fallback, and check the browser
Network tab for successful Supabase calls.

## Build phases

- **Phase 0 (done)** — scaffold, design tokens, Supabase wiring, auth gate,
  app shell (sidebar, workspace + market switch, CEO persona toggle), Team access.
- **Phase 1** — Providers, Pipeline kanban (closer + trainer) with drag & drop,
  clinic detail, Calendar, CEO Overview.
- **Phase 2** — Finance (revenue / invoices / quotations / expenses).
- **Phase 3** — HR, Documents, Manage Access, FAQ.
- **Phase 4** — polish, realtime, responsive.
