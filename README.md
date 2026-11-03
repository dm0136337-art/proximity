# Proximity Production

A luxury cinematic production studio website built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- Luxury minimalist homepage with cinematic video hero
- Dynamic project portfolio connected to Supabase
- Individual project detail pages
- Contact inquiry form with validation and database submission
- Supabase Auth admin dashboard with server-verified administrator roles
- CRUD operations for projects and inquiries via server-side routes
- Row-level security guidance for Supabase tables
- Vercel-ready deployment setup

## Local setup

1. Create a Supabase project, or use the existing project.
2. Copy `.env.example` to `.env.local` only if `.env.local` does not already exist. Keep existing local configuration intact.
3. Configure the required environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: the Supabase project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the project publishable/anon key. This key is public; database access must remain restricted by RLS.
   - `SUPABASE_SERVICE_ROLE_KEY`: the service-role secret, used only by server-side code for administrator operations, private asset signing, inquiry submission, and rate limiting. Never prefix it with `NEXT_PUBLIC_`.
   - `RATE_LIMIT_SECRET`: a different private random value of at least 32 characters, used to hash client addresses before rate-limit keys are stored.
4. Apply the migrations in order in the Supabase SQL Editor:
   - `supabase/migrations/001_create_schema.sql`
   - `supabase/migrations/002_secure_inquiries_and_rate_limits.sql`
   The scripts are safe to rerun: they create missing objects, replace only their own trigger and named policies, and do not drop tables or rewrite records. The second migration adds allowed-status constraints and installs the database-backed rate limiter. Review existing production status values before applying it; constraints intentionally fail rather than rewrite unexpected existing data. These files are not applied automatically by the application or deployment.
5. In Supabase Storage, create a **private** bucket named `production-assets`, set the maximum file size to 5 MB, and allow JPEG, PNG, WebP, and AVIF. Do not add public read/write policies. The server uses the service-role key to upload assets and creates short-lived signed URLs only for assets attached to published projects.
6. Start the app:

```bash
npm install
npm run dev
```

`.env.local` is ignored by Git. Do not copy real credentials into `.env.example`, documentation, client-side code, or logs. Generate secrets with a cryptographically secure random generator (for example, `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`).
The `RATE_LIMIT_SECRET` value used locally must also be added separately as a server-only environment variable in the Vercel project before deployment; local `.env.local` values are not copied to Vercel. `NEXT_PUBLIC_SITE_URL` is not currently read by application code and is not required.

## Admin access

Enable email/password authentication in Supabase Auth. Visit `/admin/login` and sign in with a Supabase Auth account. The application allows dashboard access only when the verified user's trusted `app_metadata.role` is `admin`; ordinary authenticated users are denied. Assign this value only with trusted Supabase Auth administration tooling, never from client-editable user metadata.

The application does not identify an administrator by email or create/promote accounts. The project owner must select the existing intended account and assign `{"role":"admin"}` in its trusted Supabase Auth app metadata using the Supabase Dashboard or a secured server-side Admin API operation. Never place the service-role key in browser code or use `user_metadata` for authorization.

The login form sends credentials to the server, which authenticates them with Supabase Auth and enforces the five-attempts-per-15-minutes database-backed limit. Supabase SSR stores and refreshes the Auth session in secure, same-site cookies in production. Server-rendered pages and every admin API route verify the Supabase user and role before returning or changing administrator data. Contact submissions have a separate five-attempts-per-15-minutes limit. Keep the application behind a trusted proxy that sets `x-real-ip` or `x-forwarded-for`; these headers must not be accepted directly from untrusted clients by a custom deployment.

## Deployment to Vercel

1. Push the existing project to GitHub and import that repository into Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `RATE_LIMIT_SECRET` in Vercel **Project Settings → Environment Variables** for the Production environment. Keep the service-role key and rate-limit secret server-only. `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` are obsolete and are not used by the current authentication implementation.
3. Apply the Supabase migrations and configure the private `production-assets` bucket before opening the deployment to visitors.
4. Deploy to a preview environment and verify public project visibility, admin login, uploads, inquiries, and unauthorized API responses before promoting to production.
5. Run `npm run lint` and `npm run build` locally before deployment.

## Supabase notes

- Public reads are limited to published projects.
- Anonymous users cannot insert, read, or modify inquiries directly; the server-side contact endpoint validates and inserts them using the server-only service-role key.
- Administrator and rate-limit operations run through server-side code using the service-role key. It is never sent to the browser.
- The `production-assets` bucket is private. Public pages receive expiring signed URLs only after a project is confirmed published; assets on unpublished projects remain private.
- Rate-limit records store keyed hashes rather than raw client addresses. Old rows can be pruned periodically with `delete from public.rate_limits where window_started_at < now() - interval '1 day';`.
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` are also accepted as server-only aliases, but the `NEXT_PUBLIC_` names above are needed if client-side public Supabase access is added later.

### Verify the database after applying migrations

Run these queries in the Supabase SQL Editor. The first should return all three table names; the second may return no rows when the tables are empty:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('projects', 'inquiries', 'rate_limits')
order by table_name;
```

```sql
select 'projects' as table_name, production_status as status, count(*)
from public.projects
group by production_status

union all

select 'inquiries', status, count(*)
from public.inquiries
group by status;
```
