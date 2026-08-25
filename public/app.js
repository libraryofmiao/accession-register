const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const form = document.getElementById("searchForm");
const input = document.getElementById("search");
const resultCountEl = document.getElementById("resultCount");
const resultMessageEl = document.getElementById("resultMessage");


function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (character) {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[character];
  });
}


async function checkHealth() {

  try {

    const response = await fetch("/api/health", {
      headers: {
        Accept: "application/json"
      }
    });

    const data = await response.json();

    if (response.ok && data.ok) {

      statusEl.textContent = "Database connected";
      statusEl.className = "status connected";

    } else {

      statusEl.textContent = "Database error";
      statusEl.className = "status error";

    }

  } catch (error) {

    statusEl.textContent = "Server unavailable";
    statusEl.className = "status error";

  }

}


function getAuthors(row) {

  if (!Array.isArray(row.accession_authors)) {
    return [];
  }

  return row.accession_authors
    .slice()
    .sort(function (a, b) {
      return Number(a.author_order || 0) -
             Number(b.author_order || 0);
    })
    .map(function (author) {
      return author.author_name;
    })
    .filter(Boolean);

}


function displayAuthors(row) {

  return getAuthors(row).join("; ");

}


function displayLocation(row) {

  const location = row.location_master;

  if (!location) {
    return "";
  }

  const parts = [];

  if (location.location_name) {
    parts.push(location.location_name);
  }

  if (location.location_code) {
    parts.push("(" + location.location_code + ")");
  }

  if (location.shelf) {
    parts.push("Shelf " + location.shelf);
  }

  return parts.join(" ");

}


function getStatusClass(status) {

  switch (String(status || "").toLowerCase()) {

    case "available":
      return "available";

    case "issued":
      return "issued";

    case "lost":
      return "lost";

    case "withdrawn":
      return "withdrawn";

    case "damaged":
      return "damaged";

    default:
      return "unknown";
  }

}


function renderOptionalField(label, value) {

  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return "";
  }

  return `
    <div class="book-field">
      <span class="field-label">${escapeHtml(label)}</span>
      <span>${escapeHtml(value)}</span>
    </div>
  `;

}


function renderCard(row) {

  const title = row.title || "Untitled";

  const authors = displayAuthors(row);

  const location = displayLocation(row);

  const status = row.status || "Unknown";

  const subtitle = row.subtitle
    ? `
      <div class="book-subtitle">
        ${escapeHtml(row.subtitle)}
      </div>
    `
    : "";

  return `

    <article class="book-card">

      <div class="book-main">

        <div class="book-icon" aria-hidden="true">
          📖
        </div>

        <div class="book-content">

          <h3 class="book-title">
            ${escapeHtml(title)}
          </h3>

          ${subtitle}

          ${renderOptionalField("Author", authors)}

          ${renderOptionalField(
            "Accession No.",
            row.accession_no
          )}

        </div>

        <div class="availability">

          <span class="status-badge ${getStatusClass(status)}">
            ${escapeHtml(status)}
          </span>

        </div>

      </div>

      <div class="book-details">

        ${renderOptionalField("Publisher", row.publisher)}

        ${renderOptionalField(
          "Publication Year",
          row.publication_year
        )}

        ${renderOptionalField("ISBN", row.isbn)}

        ${renderOptionalField("Language", row.language)}

        ${renderOptionalField("DDC", row.ddc_number)}

        ${renderOptionalField("Subject", row.subject)}

        ${renderOptionalField("Location", location)}

      </div>

    </article>

  `;

}


function renderResults(rows, query) {

  if (!Array.isArray(rows) || rows.length === 0) {

    resultCountEl.textContent = "0 results";

    resultMessageEl.textContent =
      'No records found for "' + query + '".';

    resultsEl.innerHTML = `

      <div class="empty">

        <div class="empty-icon">🔎</div>

        <h3>No matching records found</h3>

        <p>
          Try another title, author, subject, ISBN,
          DDC number or accession number.
        </p>

      </div>

    `;

    return;
  }


  resultCountEl.textContent =
    rows.length +
    " result" +
    (rows.length === 1 ? "" : "s");


  resultMessageEl.textContent =
    'Search results for "' + query + '"';


  resultsEl.innerHTML = rows
    .map(renderCard)
    .join("");

}


async function searchCatalogue(query) {

  resultsEl.innerHTML = `

    <div class="loading">

      <div class="spinner"></div>

      <p>Searching the catalogue…</p>

    </div>

  `;

  resultCountEl.textContent = "";

  resultMessageEl.textContent =
    'Searching for "' + query + '"…';


  try {

    const response = await fetch(
      "/api/opac/search?q=" +
      encodeURIComponent(query),
      {
        headers: {
          Accept: "application/json"
        }
      }
    );


    let data;

    try {
      data = await response.json();
    } catch (error) {
      throw new Error("The server returned an invalid response.");
    }


    if (!response.ok) {
      throw new Error(
        data.error || "Catalogue search failed."
      );
    }


    renderResults(data, query);


  } catch (error) {

    resultCountEl.textContent = "";

    resultMessageEl.textContent =
      "Search could not be completed.";


    resultsEl.innerHTML = `

      <div class="empty error-box">

        <div class="empty-icon">⚠</div>

        <h3>Unable to search catalogue</h3>

        <p>
          ${escapeHtml(error.message)}
        </p>

        <button
          id="retryButton"
          class="retry-button"
          type="button"
        >
          Try Again
        </button>

      </div>

    `;


    const retryButton =
      document.getElementById("retryButton");

    if (retryButton) {

      retryButton.addEventListener(
        "click",
        function () {
          searchCatalogue(query);
        }
      );

    }

  }

}


form.addEventListener("submit", function (event) {

  event.preventDefault();

  const query = input.value.trim();

  if (!query) {

    input.focus();

    return;

  }

  searchCatalogue(query);

});


input.addEventListener("keydown", function (event) {

  if (event.key === "Escape") {

    input.value = "";

    resultCountEl.textContent = "";

    resultMessageEl.textContent =
      "Enter a search term above to begin.";

    resultsEl.innerHTML = `

      <div class="welcome">

        <div class="welcome-icon">⌕</div>

        <h3>Search the Library Catalogue</h3>

        <p>
          Enter a title, author, subject, ISBN,
          DDC number or accession number above.
        </p>

      </div>

    `;

    input.focus();

  }

});


checkHealth();

input.focus();
