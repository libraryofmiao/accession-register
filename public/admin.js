const form = document.getElementById("accessionForm");
const message = document.getElementById("formMessage");
const authors = document.getElementById("authors");
const addAuthor = document.getElementById("addAuthor");
const locationSelect = document.getElementById("location");
const ddcInput = document.getElementById("ddcNumber");
const subjectInput = document.getElementById("subject");
const ddcSuggestions = document.getElementById("ddcSuggestions");
const accessionNoInput = document.getElementById("accessionNo");
const accessionDateInput = document.getElementById("accessionDate");
const refreshAccessionButton = document.getElementById("refreshAccession");
const contributors = document.getElementById("contributors");
const addContributor = document.getElementById("addContributor");
const sourceSelect = document.getElementById("source");
const rrrlfSchemeWrap = document.getElementById("rrrlfSchemeWrap");
const rrrlfSchemeSelect = document.getElementById("rrrlfScheme");

let authorCount = 1;
let contributorCount = 1;
let sourceOptions = [];
let rrrlfSchemeOptions = [];

function today() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

async function loadSession() {
  const response = await fetch("/api/auth/me", { headers: { Accept: "application/json" } });
  if (!response.ok) { window.location.href = "/admin"; return false; }
  const data = await response.json();
  document.getElementById("staffName").textContent = data.username || "Staff";
  return true;
}

async function loadLocations() {
  const response = await fetch("/api/locations");
  if (!response.ok) return;
  const rows = await response.json();
  locationSelect.innerHTML = '<option value="">Select location</option>';
  rows.forEach(row => {
    const option = document.createElement("option");
    option.value = row.id;
    option.textContent = `${row.location_name}${row.location_code ? ` (${row.location_code})` : ""}${row.shelf ? ` — Shelf ${row.shelf}` : ""}`;
    locationSelect.appendChild(option);
  });
}

async function loadSources() {
  const response = await fetch("/api/sources");
  if (!response.ok) return;
  const data = await response.json();
  sourceOptions = data.sources || [];
  rrrlfSchemeOptions = data.rrrlf_schemes || [];
  sourceSelect.innerHTML = '<option value="">Select receiving source</option>' + sourceOptions.map(x => `<option value="${x}">${x}</option>`).join("");
  rrrlfSchemeSelect.innerHTML = '<option value="">Select RRRLF scheme</option>' + rrrlfSchemeOptions.map(x => `<option value="${x}">${x}</option>`).join("");
  updateRRRLFVisibility();
}

function updateRRRLFVisibility() {
  const isRRRLF = sourceSelect.value === "RRRLF";
  rrrlfSchemeWrap.hidden = !isRRRLF;
  rrrlfSchemeSelect.required = isRRRLF;
  if (!isRRRLF) rrrlfSchemeSelect.value = "";
}

sourceSelect.addEventListener("change", updateRRRLFVisibility);

async function loadNextAccession() {
  refreshAccessionButton.disabled = true;
  try {
    const response = await fetch("/api/admin/next-accession", { headers: { Accept: "application/json" } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not generate accession number.");
    accessionNoInput.value = data.accession_no;
  } catch (error) {
    message.className = "form-message error";
    message.textContent = error.message;
  } finally { refreshAccessionButton.disabled = false; }
}

addAuthor.addEventListener("click", () => {
  if (authorCount >= 3) return;
  authorCount += 1;
  const label = document.createElement("label");
  label.textContent = authorCount === 2 ? "Author 2" : "Author 3";
  const input = document.createElement("input");
  input.name = `author${authorCount}`;
  label.appendChild(input);
  authors.appendChild(label);
  if (authorCount === 3) addAuthor.hidden = true;
});

addContributor.addEventListener("click", () => {
  contributorCount += 1;
  const row = document.createElement("div");
  row.className = "contributor-row";
  row.innerHTML = `<input name="contributor${contributorCount}" placeholder="Contributor name"><input name="contributor_role${contributorCount}" placeholder="Role (optional)">`;
  contributors.appendChild(row);
});

ddcInput.addEventListener("input", async () => {
  const q = ddcInput.value.trim();
  ddcSuggestions.innerHTML = "";
  if (!q) return;
  try {
    const response = await fetch(`/api/ddc?q=${encodeURIComponent(q)}`);
    if (!response.ok) return;
    const rows = await response.json();
    rows.slice(0, 8).forEach(row => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${row.ddc_number} — ${row.subject}`;
      button.addEventListener("click", () => { ddcInput.value = row.ddc_number; subjectInput.value = row.subject; ddcSuggestions.innerHTML = ""; });
      ddcSuggestions.appendChild(button);
    });
  } catch {}
});

ddcInput.addEventListener("blur", async () => {
  setTimeout(async () => {
    if (!ddcInput.value.trim()) return;
    try {
      const response = await fetch(`/api/ddc?q=${encodeURIComponent(ddcInput.value.trim())}`);
      if (!response.ok) return;
      const rows = await response.json();
      const exact = rows.find(row => String(row.ddc_number).toLowerCase() === ddcInput.value.trim().toLowerCase());
      if (exact) subjectInput.value = exact.subject;
    } catch {}
  }, 150);
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  message.className = "form-message";
  message.textContent = "Saving…";
  const data = Object.fromEntries(new FormData(form).entries());
  const authorNames = [data.author1, data.author2, data.author3].filter(Boolean).map(x => x.trim()).filter(Boolean).slice(0, 3);
  const contributorRows = [];
  for (let i = 1; i <= contributorCount; i += 1) {
    const name = String(data[`contributor${i}`] || "").trim();
    const role = String(data[`contributor_role${i}`] || "").trim();
    if (name) contributorRows.push({ name, role: role || null });
  }
  const body = { ...data, authors: authorNames, contributors: contributorRows };
  for (let i = 1; i <= 3; i += 1) delete body[`author${i}`];
  for (let i = 1; i <= contributorCount; i += 1) { delete body[`contributor${i}`]; delete body[`contributor_role${i}`]; }
  if (!body.accession_date) body.accession_date = today();
  if (!body.location_id) body.location_id = null;
  if (body.source !== "RRRLF") body.rrrlf_scheme = null;

  try {
    const response = await fetch("/api/accessions", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not save accession.");
    message.className = "form-message success";
    message.textContent = `Accession ${result.accession_no} saved successfully.`;
    form.reset();
    accessionDateInput.value = today();
    ddcSuggestions.innerHTML = "";
    authorCount = 1;
    authors.innerHTML = '<label>Main Author<input name="author1"></label>';
    addAuthor.hidden = false;
    contributorCount = 1;
    contributors.innerHTML = '<div class="contributor-row"><input name="contributor1" placeholder="Contributor name"><input name="contributor_role1" placeholder="Role (optional)"></div>';
    sourceSelect.value = "";
    updateRRRLFVisibility();
    await loadLocations();
    await loadNextAccession();
  } catch (error) { message.className = "form-message error"; message.textContent = error.message; }
});

document.getElementById("logoutButton").addEventListener("click", async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/"; });

(async function init() {
  const authenticated = await loadSession();
  if (!authenticated) return;
  accessionDateInput.value = today();
  await loadSources();
  await loadLocations();
  await loadNextAccession();
})();
