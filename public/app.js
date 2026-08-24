const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const form = document.getElementById("searchForm");
const input = document.getElementById("search");

async function health() {
  try {
    const r = await fetch("/api/health");
    const data = await r.json();
    statusEl.textContent = data.ok ? "Database connected" : "Database error";
  } catch {
    statusEl.textContent = "Server unavailable";
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function authors(row) {
  return (row.accession_authors || [])
    .sort((a,b) => a.author_order - b.author_order)
    .map(a => a.author_name)
    .join("; ");
}

function render(rows) {
  if (!rows.length) {
    resultsEl.innerHTML = '<div class="empty">No matching records found.</div>';
    return;
  }
  resultsEl.innerHTML = rows.map(row => {
    const loc = row.location_master;
    return `<article class="card">
      <h3>${escapeHtml(row.title)}</h3>
      ${row.subtitle ? `<div class="meta">${escapeHtml(row.subtitle)}</div>` : ""}
      ${authors(row) ? `<div class="meta"><strong>Author:</strong> ${escapeHtml(authors(row))}</div>` : ""}
      <div class="meta"><strong>Accession:</strong> ${escapeHtml(row.accession_no)}</div>
      ${row.publisher ? `<div class="meta"><strong>Publisher:</strong> ${escapeHtml(row.publisher)}</div>` : ""}
      ${row.publication_year ? `<div class="meta"><strong>Year:</strong> ${escapeHtml(row.publication_year)}</div>` : ""}
      ${row.ddc_number ? `<div class="meta"><strong>DDC:</strong> ${escapeHtml(row.ddc_number)}</div>` : ""}
      ${row.subject ? `<div class="meta"><strong>Subject:</strong> ${escapeHtml(row.subject)}</div>` : ""}
      ${loc ? `<div class="meta"><strong>Location:</strong> ${escapeHtml(loc.location_name)}${loc.shelf ? " · Shelf " + escapeHtml(loc.shelf) : ""}</div>` : ""}
      <span class="badge">${escapeHtml(row.status)}</span>
    </article>`;
  }).join("");
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  resultsEl.innerHTML = '<div class="empty">Searching…</div>';
  try {
    const r = await fetch(`/api/opac/search?q=${encodeURIComponent(q)}`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Search failed");
    render(data);
  } catch (err) {
    resultsEl.innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`;
  }
});

health();
