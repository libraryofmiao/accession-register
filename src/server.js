import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { supabasePublic, supabaseAdmin } from "./supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", async (_req, res) => {
  const { error } = await supabasePublic.from("ddc_master").select("id").limit(1);
  res.json({ ok: !error, database: error ? "error" : "connected" });
});

app.get("/api/ddc", async (req, res) => {
  const q = String(req.query.q || "").trim();
  let query = supabasePublic.from("ddc_master")
    .select("id,ddc_number,subject")
    .order("ddc_number")
    .limit(50);
  if (q) query = query.or(`ddc_number.ilike.%${q}%,subject.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get("/api/locations", async (_req, res) => {
  const { data, error } = await supabasePublic
    .from("location_master")
    .select("id,location_code,location_name,shelf")
    .order("location_name");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get("/api/opac/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json([]);

  const pattern = `%${q}%`;
  const { data, error } = await supabasePublic
    .from("accessions")
    .select(`
      id, accession_no, accession_date, title, subtitle, publisher,
      publication_year, isbn, ddc_number, subject, language, status,
      location_master(location_code,location_name,shelf),
      accession_authors(author_order,author_name),
      accession_contributors(contributor_name,contributor_role)
    `)
    .or(`title.ilike.${pattern},isbn.ilike.${pattern},ddc_number.ilike.${pattern},subject.ilike.${pattern}`)
    .order("title")
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });

  // Author names are also searched separately because Supabase's simple
  // relation filter is intentionally kept out of this V1 endpoint.
  const { data: authorRows } = await supabasePublic
    .from("accession_authors")
    .select("accession_id")
    .ilike("author_name", pattern)
    .limit(50);

  const authorIds = new Set((authorRows || []).map(x => x.accession_id));
  const rows = (data || []).filter(row => true);

  if (authorIds.size) {
    const { data: authorMatches } = await supabasePublic
      .from("accessions")
      .select(`
        id, accession_no, accession_date, title, subtitle, publisher,
        publication_year, isbn, ddc_number, subject, language, status,
        location_master(location_code,location_name,shelf),
        accession_authors(author_order,author_name),
        accession_contributors(contributor_name,contributor_role)
      `)
      .in("id", [...authorIds]);
    for (const item of authorMatches || []) {
      if (!rows.some(r => r.id === item.id)) rows.push(item);
    }
  }

  res.json(rows);
});

app.get("/api/accessions/:accessionNo", async (req, res) => {
  const { data, error } = await supabasePublic
    .from("accessions")
    .select(`
      *, location_master(location_code,location_name,shelf),
      accession_authors(author_order,author_name),
      accession_contributors(contributor_name,contributor_role)
    `)
    .eq("accession_no", req.params.accessionNo)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Accession not found." });
  res.json(data);
});

app.post("/api/accessions", async (req, res) => {
  // V1 server endpoint. Authentication/PowerUser authorization will be
  // added before production data-entry access is enabled.
  const b = req.body || {};
  if (!b.accession_no || !b.title) {
    return res.status(400).json({ error: "accession_no and title are required." });
  }

  const { data: accession, error } = await supabaseAdmin
    .from("accessions")
    .insert({
      accession_no: b.accession_no,
      accession_date: b.accession_date || undefined,
      title: b.title,
      subtitle: b.subtitle || null,
      edition: b.edition || null,
      publisher: b.publisher || null,
      publication_place: b.publication_place || null,
      publication_year: b.publication_year || null,
      isbn: b.isbn || null,
      pages: b.pages || null,
      price: b.price || null,
      ddc_number: b.ddc_number || null,
      subject: b.subject || null,
      location_id: b.location_id || null,
      language: b.language || null,
      book_type: b.book_type || null,
      remarks: b.remarks || null,
      status: b.status || "Available"
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  const authors = Array.isArray(b.authors) ? b.authors.slice(0, 3) : [];
  if (authors.length) {
    const { error: authorError } = await supabaseAdmin
      .from("accession_authors")
      .insert(authors.map((name, i) => ({
        accession_id: accession.id,
        author_order: i + 1,
        author_name: String(name).trim()
      })).filter(x => x.author_name));

    if (authorError) return res.status(400).json({ error: authorError.message });
  }

  const contributors = Array.isArray(b.contributors) ? b.contributors : [];
  if (contributors.length) {
    const rows = contributors
      .map(c => typeof c === "string"
        ? { contributor_name: c.trim(), contributor_role: null }
        : { contributor_name: String(c.name || "").trim(), contributor_role: c.role || null })
      .filter(x => x.contributor_name)
      .map(x => ({ accession_id: accession.id, ...x }));

    if (rows.length) {
      const { error: contributorError } = await supabaseAdmin
        .from("accession_contributors")
        .insert(rows);
      if (contributorError) return res.status(400).json({ error: contributorError.message });
    }
  }

  res.status(201).json({ ...accession, authors, contributors });
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Accession Register V1 listening on port ${PORT}`);
});
