const els = {
  total: document.getElementById('total'), available: document.getElementById('available'), issued: document.getElementById('issued'),
  missing: document.getElementById('missing'), damaged: document.getElementById('damaged'), withdrawn: document.getElementById('withdrawn'),
  source: document.getElementById('source'), scheme: document.getElementById('scheme'), status: document.getElementById('status'), search: document.getElementById('search'),
  rows: document.getElementById('rows'), message: document.getElementById('message'), scope: document.getElementById('scope')
};
let allRows = [];

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
function escapeHtml(v){
  return text(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function statusKey(v){ return text(v).trim().toLowerCase(); }

function populateFilters(){
  const sources = [...new Set(allRows.map(r=>r.source).filter(Boolean))].sort();
  const schemes = [...new Set(allRows.map(r=>r.rrrlf_scheme).filter(Boolean))].sort();
  const statuses = [...new Set(allRows.map(r=>r.status || 'Available').filter(Boolean))].sort();
  els.source.innerHTML = '<option value="">All sources</option>' + sources.map(v=>`<option>${escapeHtml(v)}</option>`).join('');
  els.scheme.innerHTML = '<option value="">All RRRLF schemes</option>' + schemes.map(v=>`<option>${escapeHtml(v)}</option>`).join('');
  els.status.innerHTML = '<option value="">All statuses</option>' + statuses.map(v=>`<option>${escapeHtml(v)}</option>`).join('');
}

function calculate(rows){
  const counts = {total:rows.length, available:0, issued:0, missing:0, damaged:0, withdrawn:0};
  rows.forEach(r=>{
    const s=statusKey(r.status || 'Available');
    if (s === 'available') counts.available++;
    else if (s === 'issued') counts.issued++;
    else if (s === 'lost' || s === 'missing') counts.missing++;
    else if (s === 'damaged') counts.damaged++;
    else if (s === 'withdrawn') counts.withdrawn++;
  });
  Object.entries(counts).forEach(([k,v])=>els[k].textContent=v.toLocaleString('en-IN'));
}

function render(){
  const q = text(els.search.value).trim().toLowerCase();
  const source = els.source.value, scheme = els.scheme.value, status = els.status.value;
  const filtered = allRows.filter(r=>{
    if(source && r.source !== source) return false;
    if(scheme && r.rrrlf_scheme !== scheme) return false;
    if(status && (r.status || 'Available') !== status) return false;
    if(q){
      const hay = [r.accession_no,r.title,r.isbn,r.ddc_number,r.subject,r.source,r.rrrlf_scheme,locationText(r)].join(' ').toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  calculate(filtered);
  els.scope.textContent = `Showing ${filtered.length.toLocaleString('en-IN')} of ${allRows.length.toLocaleString('en-IN')} accession records.`;
  els.rows.innerHTML = filtered.map(r=>`<tr><td>${escapeHtml(r.accession_no)}</td><td>${escapeHtml(r.title)}</td><td>${escapeHtml(r.source)}</td><td>${escapeHtml(r.rrrlf_scheme)}</td><td>${escapeHtml(r.status || 'Available')}</td><td>${escapeHtml(locationText(r))}</td></tr>`).join('');
  if(!filtered.length) els.rows.innerHTML='<tr><td colspan="6">No matching records found.</td></tr>';
}

async function load(){
  els.message.textContent='Loading stock…';
  els.message.className='stock-note';
  try{
    const r=await fetch('/api/admin/register',{headers:{Accept:'application/json'}});
    const d=await r.json();
    if(!r.ok) throw new Error(d.error || 'Could not load stock.');
    allRows=Array.isArray(d)?d:[];
    populateFilters();
    render();
    els.message.textContent='Stock refreshed successfully.';
  }catch(e){ els.message.textContent=e.message; els.message.className='stock-note error'; }
}

['search','source','scheme','status'].forEach(id=>document.getElementById(id).addEventListener(id==='search'?'input':'change',render));
document.getElementById('refresh').addEventListener('click',load);
document.getElementById('logoutButton').addEventListener('click',async()=>{await fetch('/api/auth/logout',{method:'POST'});window.location.href='/';});
(async()=>{if(await loadSession()) await load();})();
