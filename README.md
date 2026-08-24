# Accession Register — Version 1

Deployable Node.js + Express + Supabase starter for the SDLM Miao Accession Register / OPAC project.

## Included in V1

- Accession Register data model
- Up to 3 authors
- Contributor
- DDC and Subject masters
- Location master
- OPAC search
- Accession entry API
- Master-data APIs
- Supabase SQL schema
- Koyeb-compatible Node.js server
- Secure server-side Supabase secret handling

## Local setup

1. Copy `.env.example` to `.env`.
2. Put your Supabase values in `.env`.
3. Run `npm install`.
4. Run the SQL in `supabase/schema.sql` in Supabase SQL Editor.
5. Run `npm start`.
6. Open `http://localhost:3000`.

## Koyeb

Connect this GitHub repository as a Web Service. Koyeb detects the Node.js app from the root `package.json`.

Set these Koyeb environment variables:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_JWKS_URL`

Never commit `.env` or the secret key.

## Important

This is Version 1 of the deployable foundation. It is intentionally structured so the later Accession Register workflow, authentication, PowerUser audit trail, reports/printing, backup tools, and full OPAC can be added without changing the deployment architecture.
