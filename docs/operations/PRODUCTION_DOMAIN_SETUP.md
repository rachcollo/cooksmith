# Production domain setup

How Cooksmith's production application is served on a custom domain, and the
exact steps to set one up or change it. The live production domain is
`app.smillins.com.au`. Use Australian/UK English and no em dashes when editing
this document.

## Why a product-agnostic subdomain

Cooksmith is served on `app.smillins.com.au` rather than a Cooksmith-branded
address. The subdomain is deliberately product-agnostic: if the product is
renamed, the URL does not have to change, and no auth redirect URLs, bookmarks
or documentation break. A subdomain also uses a simple CNAME record and gets
automatic SSL, which the apex domain does not.

## One-time setup steps

### 1. Add the domain in Vercel

1. Open the Cooksmith project in Vercel, then **Settings -> Domains**.
2. Add `app.smillins.com.au`.
3. Vercel shows the exact DNS record it needs. For a subdomain this is a
   **CNAME** to `cname.vercel-dns.com`. Keep this screen open.

Because the production branch is `main`, this domain automatically serves the
production deployment once it is valid.

### 2. Add the DNS record

At the DNS host for `smillins.com.au`, add:

| Field          | Value                                                   |
| -------------- | ------------------------------------------------------- |
| Type           | CNAME                                                   |
| Name / Host    | `app` (some panels want the full `app.smillins.com.au`) |
| Value / Target | `cname.vercel-dns.com`                                  |
| TTL            | default                                                 |

If `smillins.com.au` is on Cloudflare, set the record to **DNS only** (grey
cloud, not proxied). Proxying Vercel through Cloudflare causes SSL and
redirect-loop problems.

Propagation is usually minutes, up to about an hour.

### 3. Let Vercel finish

Vercel detects the record and issues a free Let's Encrypt certificate. When the
domain shows **Valid Configuration** it is live on production over HTTPS.

### 4. Update authentication configuration (do not skip)

A domain change silently breaks login until the auth allow-lists include the
new domain. In **Supabase -> Authentication -> URL Configuration**:

1. Set **Site URL** to `https://app.smillins.com.au`.
2. Add `https://app.smillins.com.au/**` to **Redirect URLs**. Keep the existing
   Vercel preview URLs so preview deployments still authenticate.

This is what makes magic-link, PKCE and password-reset callbacks land on the
new domain. The Vercel production environment variables
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) do not need changing.

### 5. Verify

1. Open `https://app.smillins.com.au`; the application loads.
2. `https://app.smillins.com.au/health.json` returns
   `{"application":"cooksmith-v2","status":"ok"}`.
3. Complete a real magic-link or password login on the new domain. Auth is the
   change most likely to surprise you, so test it directly rather than assuming.

## Using the domain for delivery

`https://app.smillins.com.au` is the production URL to enter in the
**Deployment verification** workflow. Enter the base address only (scheme and
host, no path or query string) and never a per-deployment preview URL, which
sits behind Vercel Deployment Protection and serves a login page instead of the
application.

## Cost

A$0. The domain is already owned and verified, and Vercel custom domains and
SSL certificates are included in the current plan. Changing the production
domain is a production configuration change, so make it deliberately and
confirm authentication in step 5.

## Changing or removing the domain later

To move to a different address, repeat the steps above with the new host, then
update the Supabase Site URL and Redirect URLs, and update the deployment
verification URL wherever it is documented. Remove the old redirect URL from
Supabase only after the new domain is confirmed working, so login is never
briefly broken for either address.
