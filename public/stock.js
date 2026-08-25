const els = {
  total: document.getElementById('total'), available: document.getElementById('available'), issued: document.getElementById('issued'),
  missing: document.getElementById('missing'), damaged: document.getElementById('damaged'), withdrawn: document.getElementById('withdrawn'),
  source: document.getElementById('source'), scheme: document.getElementById('scheme'), status: document.getElementById('status'), search: document.getElementById('search'),
  rows: document.getElementById('rows'), message: document.getElementById('message'), scope: document.getElementById('scope'), page: document.getElementById('page'), prev: document.getElementById('prev'), next: document.getElementById('next')
};
let currentPage = 1;
const pageSize = 100;
let totalPages = 1;

async function loadSession() {
  const r = await fetch('/api/auth/me', {headers:{Accept:'application/json'}});
  if (!r.ok) { window.location.href='/admin'; return false; }
  const d = await r.json();
  document.getElementById('staffName').textContent = d.username || 'Staff';
  return true;
}
function text(v){ return v == null ? '' : String(v); }
function locationText(row){
  const l = row.location_master;
  if (!l) return '';
  return [l.location_name, l.location_code, l.shelf ? `Shelf ${l.shelf}` : ''].filter(Boolean).join(' — ');
}
function escapeHtml(v){ return text(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function statusKey(v){ return text(v).trim().toLowerCase(); }
function optionValues(list, label){
  return `<option value="">${label}</option>` + (list || []).map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
}
function renderSummary(s){
  const counts = s || {};
  ['total','available','issued','missing','damaged','withdrawn'].forEach(k=>els[k].textContent=(counts[k]||0).toLocaleString('en-IN'));
}
function renderRows(rows){
  els.rows.innerHTML = (rows || []).map(r=>`<tr><td>${escapeHtml(r.accession_no)}</td><td>${escapeHtml(r.title)}</td><td>${escapeHtml(r.source)}</td><td>${escapeHtml(r.rrrlf_scheme)}</td><td>${escapeHtml(r.status || 'Available')}</td><td>${escapeHtml(locationText(r))}</td></tr>`).join('');
  if(!rows || !rows.length) els.rows.innerHTML='<tr><td colspan="6">No matching records found.</td></tr>';
}
async function load(resetPage=false){
  if(resetPage) currentPage=1;
  els.message.textContent='Loading stock…';
  try{
    const p = new URLSearchParams({page:String(currentPage),page_size:String(pageSize)});
    if(els.search.value.trim()) p.set('search', els.search.value.trim());
    if(els.source.value) p.set('source', els.source.value);
    if(els.scheme.value) p.set('rrrlf_scheme', els.scheme.value);
    if(els.status.value) p.set('status', els.status.value);
    const r=await fetch('/api/admin/stock?'+p.toString(),{headers:{Accept:'application/json'}});
    const d=await r.json();
    if(!r.ok) throw new Error(d.error || 'Could not load stock.');
    renderSummary(d.summary);
    renderRows(d.rows);
    totalPages=Math.max(1, Number(d.pagination?.total_pages || 1));
    els.page.textContent=`Page ${currentPage.toLocaleString('en-IN')} of ${totalPages.toLocaleString('en-IN')}`;
    els.prev.disabled=currentPage<=1;
    els.next.disabled=currentPage>=totalPages;
    els.scope.textContent=`Showing ${Number(d.pagination?.from || 0).toLocaleString('en-IN')}–${Number(d.pagination?.to || 0).toLocaleString('en-IN')} of ${Number(d.pagination?.total || 0).toLocaleString('en-IN')} matching accession records.`;
    els.message.textContent='Stock refreshed successfully.';
  }catch(e){ els.message.textContent=e.message; els.message.className='stock-note error'; }
}
['source','scheme','status'].forEach(id=>document.getElementById(id).addEventListener('change',()=>load(true)));
let searchTimer;
els.search.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>load(true),300);});
els.prev.addEventListener('click',()=>{if(currentPage>1){currentPage--;load();}});
els.next.addEventListener('click',()=>{if(currentPage<totalPages){currentPage++;load();}});
document.getElementById('refresh').addEventListener('click',()=>load());
document.getElementById('logoutButton').addEventListener('click',async()=>{await fetch('/api/auth/logout',{method:'POST'});window.location.href='/';});
(async()=>{if(await loadSession()) await load(true);})();
