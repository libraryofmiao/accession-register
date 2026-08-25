# Current Stock scaling

The Current Stock page now uses `/api/admin/stock` with server-side pagination, filtering and summary calculation. The browser must not load the full accession register. This keeps the stock view suitable for collections larger than 10,000 records.

The endpoint contract is:

`GET /api/admin/stock?page=1&page_size=100&search=&source=&rrrlf_scheme=&status=`

Response:

- `summary.total`
- `summary.available`
- `summary.issued`
- `summary.missing`
- `summary.damaged`
- `summary.withdrawn`
- `rows`
- `pagination.page`
- `pagination.page_size`
- `pagination.total`
- `pagination.total_pages`
- `pagination.from`
- `pagination.to`

The implementation must calculate the summary from the filtered database query, not from the current page.
