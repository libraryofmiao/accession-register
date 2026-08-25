const form = document.getElementById("accessionForm");
const message = document.getElementById("formMessage");
const authors = document.getElementById("authors");
const addAuthor = document.getElementById("addAuthor");
const locationSelect = document.getElementById("location");
const ddcInput = document.getElementById("ddcNumber");
const subjectInput = document.getElementById("subject");
const ddcSuggestions = document.getElementById("ddcSuggestions");
let authorCount = 1;

async function loadSession() {
  const response = await fetch("/api/auth/me", { headers: { Accept: "application/json" } });
  if (!response.ok) {
    window.location.href = "/admin";
    return;
  }
  const data = await response.json();
  document.getElementById("staffName").textContent = data.username || "Staff";
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

addAuthor.addEventListener("click", () => {
  if (authorCount >= 3) return;
  authorCount += 1;
  const label = document.createElement("label");
  label.textContent = `Author ${authorCount}`;
  const input = document.createElement("input");
  input.name = `author${authorCount}`;
  label.appendChild(input);
  authors.appendChild(label);
  if (authorCount === 3) addAuthor.hidden = true;
});

ddcInput.addEventListener("input", async () => {
  const q = ddcInput.value.trim();
  ddcSuggestions.innerHTML = "";
  if (!q) return;
  const response = await fetch(`/api/ddc?q=${encodeURIComponent(q)}`);
  if (!response.ok) return;
  const rows = await response.json();
  rows.slice(0, 8).forEach(row => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${row.ddc_number} — ${row.subject}`;
    button.addEventListener("click", () => {
      ddcInput.value = row.ddc_number;
      subjectInput.value = row.subject;
      ddcSuggestions.innerHTML = "";
    });
    ddcSuggestions.appendChild(button);
  });
});

ddcInput.addEventListener("blur", async () => {
  setTimeout(async () => {
    if (!ddcInput.value.trim()) return;
    const response = await fetch(`/api/ddc?q=${encodeURIComponent(ddcInput.value.trim())}`);
    if (!response.ok) return;
    const rows = await response.json();
    const exact = rows.find(row => String(row.ddc_number).toLowerCase() === ddcInput.value.trim().toLowerCase());
    if (exact) subjectInput.value = exact.subject;
  }, 150);
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  message.className = "form-message";
  message.textContent = "Saving…";
  const data = Object.fromEntries(new FormData(form).entries());
  const authorNames = [data.author1, data.author2, data.author3].filter(Boolean).map(x => x.trim()).filter(Boolean);
  const body = { ...data, authors: authorNames };
  delete body.author1; delete body.author2; delete body.author3;
  if (!body.accession_date) delete body.accession_date;
  if (!body.location_id) body.location_id = null;
  try {
    const response = await fetch("/api/accessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not save accession.");
    message.className = "form-message success";
    message.textContent = `Accession ${result.accession_no} saved successfully.`;
    form.reset();
    ddcSuggestions.innerHTML = "";
    authorCount = 1;
    authors.innerHTML = '<label>Author 1<input name="author1"></label>';
    addAuthor.hidden = false;
    loadLocations();
  } catch (error) {
    message.className = "form-message error";
    message.textContent = error.message;
  }
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/";
});

loadSession();
loadLocations();
