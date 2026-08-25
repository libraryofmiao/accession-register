import express from "express";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { supabasePublic, supabaseAdmin } from "./supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 3000);

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "";
const COOKIE_NAME = "sdlm_staff_session";
const SESSION_MAX_AGE = 8 * 60 * 60;

app.use(express.json({ limit: "1mb" }));

function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
}
function makeSession(username) {
  const payload = Buffer.from(JSON.stringify({ u: username, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
function readSession(req) {
  if (!SESSION_SECRET) return null;
  const header = req.headers.cookie || "";
  const found = header.split(";").map(x => x.trim()).find(x => x.startsWith(`${COOKIE_NAME}=`));
  if (!found) return null;
  const token = decodeURIComponent(found.slice(COOKIE_NAME.length + 1));
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = sign(payload);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.u || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch { return null; }
}
function requireStaff(req, res, next) {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !SESSION_SECRET) return res.status(503).json({ error: "Staff login is not configured. Add ADMIN_USERNAME, ADMIN_PASSWORD and SESSION_SECRET in Render environment variables." });
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: "Staff authentication required." });
  req.staff = session;
  next();
}

app.get("/api/health", async (_req, res) => {
  const { error } = await supabasePublic.from("ddc_master").select("id").limit(1);
  res.json({ ok: !error, database: error ? "error" : "connected" });
});

app.post("/api/auth/login", (req, res) => {
  const username = String(req.body?.username || "");
  const password = String(req.body?.password || "");
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !SESSION_SECRET) return res.status(503).json({ error: "Staff login is not configured." });
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Invalid username or password." });
  const token = makeSession(username);
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${SESSION_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax; Secure`);
  res.json({ ok: true });
});
app.post("/api/auth/logout", (_req, res) => {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure`);
  res.json({ ok: true });
});
app.get("/api/auth/me", (req, res) => {
  const session = readSession(req);
  if (!session) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true, username: session.u });
});

app.get("/api/ddc", async (req, res) => {
  const q = String(req.query.q || "").trim();
  let query = supabasePublic.from("ddc_master").select("id,ddc_number,subject").order("ddc_number").limit(50);
  if (q) query = query.or(`ddc_number.ilike.%${q}%,subject.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.get("/api/locations", async (_req, res) => {
  const { data, error } = await supabasePublic.from("location_master").select("id,location_code,location_name,shelf").order("location_name");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get("/api/opac/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json([]);
  const pattern = `%${q}%`;
  const { data, error } = await supabasePublic.from("accessions").select(`id, accession_no, accession_date, title, subtitle, publisher, publication_year, isbn, ddc_number, subject, language, status, location_master(location_code,location_name,shelf), accession_authors(author_order,author_name), accession_contributors(contributor_name,contributor_role)`).or(`title.ilike.${pattern},isbn.ilike.${pattern},ddc_number.ilike.${pattern},subject.ilike.${pattern}`).order("title").limit(50);
  if (error) return res.status(500).json({ error: error.message });
  const { data: authorRows } = await supabasePublic.from("accession_authors").select("accession_id").ilike("author_name", pattern).limit(50);
  const authorIds = new Set((authorRows || []).map(x => x.accession_id));
  const rows = data || [];
  if (authorIds.size) {
    const { data: authorMatches } = await supabasePublic.from("accessions").select(`id, accession_no, accession_date, title, subtitle, publisher, publication_year, isbn, ddc_number, subject, language, status, location_master(location_code,location_name,shelf), accession_authors(author_order,author_name), accession_contributors(contributor_name,contributor_role)`).in("id", [...authorIds]);
    for (const item of authorMatches || []) if (!rows.some(r => r.id === item.id)) rows.push(item);
  }
  res.json(rows);
});

app.get("/api/accessions/:accessionNo", async (req, res) => {
  const { data, error } = await supabasePublic.from("accessions").select(`*, location_master(location_code,location_name,shelf), accession_authors(author_order,author_name), accession_contributors(contributor_name,contributor_role)`).eq("accession_no", req.params.accessionNo).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Accession not found." });
  res.json(data);
});

app.get("/api/admin/accessions", requireStaff, async (_req, res) => {
  const { data, error } = await supabaseAdmin.from("accessions").select(`*, location_master(location_code,location_name,shelf), accession_authors(author_order,author_name), accession_contributors(contributor_name,contributor_role)`).order("accession_no").limit(200);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post("/api/accessions", requireStaff, async (req, res) => {
  const b = req.body || {};
  if (!b.accession_no || !b.title) return res.status(400).json({ error: "accession_no and title are required." });
  const authors = Array.isArray(b.authors) ? b.authors.slice(0, 3).map(x => String(x).trim()).filter(Boolean) : [];
  const { data: accession, error } = await supabaseAdmin.from("accessions").insert({ accession_no: b.accession_no, accession_date: b.accession_date || undefined, title: b.title, subtitle: b.subtitle || null, edition: b.edition || null, publisher: b.publisher || null, publication_place: b.publication_place || null, publication_year: b.publication_year || null, isbn: b.isbn || null, pages: b.pages || null, price: b.price || null, ddc_number: b.ddc_number || null, subject: b.subject || null, location_id: b.location_id || null, language: b.language || null, book_type: b.book_type || null, remarks: b.remarks || null, status: b.status || "Available" }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  if (authors.length) {
    const { error: authorError } = await supabaseAdmin.from("accession_authors").insert(authors.map((name, i) => ({ accession_id: accession.id, author_order: i + 1, author_name: name })));
    if (authorError) return res.status(400).json({ error: authorError.message });
  }
  const contributors = Array.isArray(b.contributors) ? b.contributors : [];
  const contributorRows = contributors.map(c => typeof c === "string" ? { contributor_name: c.trim(), contributor_role: null } : { contributor_name: String(c.name || "").trim(), contributor_role: c.role || null }).filter(x => x.contributor_name).map(x => ({ accession_id: accession.id, ...x }));
  if (contributorRows.length) {
    const { error: contributorError } = await supabaseAdmin.from("accession_contributors").insert(contributorRows);
    if (contributorError) return res.status(400).json({ error: contributorError.message });
  }
  res.status(201).json({ ...accession, authors, contributors });
});

app.get("/admin", (_req, res) => res.sendFile(path.join(__dirname, "..", "public", "login.html")));
app.get("/admin.html", (_req, res) => res.sendFile(path.join(__dirname, "..", "public", "login.html")));
app.get("/admin-dashboard.html", requireStaff, (_req, res) => res.sendFile(path.join(__dirname, "..", "public", "admin.html")));

app.use(express.static(path.join(__dirname, "..", "public")));
app.get(/.*/, (_req, res) => res.sendFile(path.join(__dirname, "..", "public", "index.html")));

app.listen(PORT, "0.0.0.0", () => console.log(`Accession Register V1 listening on port ${PORT}`));
