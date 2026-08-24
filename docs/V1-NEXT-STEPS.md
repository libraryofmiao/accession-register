# Version 1 deployment sequence

1. Upload/extract these files into `libraryofmiao/accession-register`.
2. Commit to the `main` branch.
3. In Koyeb choose Create Web Service → GitHub.
4. Select `libraryofmiao/accession-register`.
5. Use the Node.js buildpack.
6. Set the four Supabase environment variables.
7. Deploy.
8. Open the Koyeb public URL.
9. In Supabase SQL Editor run `supabase/schema.sql`.
10. Test `/api/health`, then test OPAC search.

## Before production data entry

Authentication and authorization must be added to the write endpoints. The V1 write endpoint is included to establish the application/database contract, but it should not be exposed as an unrestricted public data-entry interface.

Future versions should add:
- login
- PowerUser role
- audit trail
- accession number generation
- DDC title lookup/autofill
- location selection/editing
- full accession entry form
- contributor UI
- reports and A4 printing
- backup/restore administration
- physical verification
- advanced OPAC filters
