const $=id=>document.getElementById(id);
async function ensure(){const r=await fetch('/api/auth/me');if(!r.ok){location.href='/admin';return false}return true}
function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
function msg(el,text,ok=false){el.className=ok?'ok':'error';el.textContent=text}
async function loadDdc(){
  const search=$('ddcSearch').value.trim();
  let rows=[];
  if(search){
    const r=await fetch('/api/admin/ddc?q='+encodeURIComponent(search));
    if(!r.ok)return;
    rows=await r.json();
  }else{
    // The API currently returns up to 500 rows. Load all 000-999 records
    // in parallel by digit prefix and merge/deduplicate them for the master.
    const responses=await Promise.all(Array.from({length:10},(_,i)=>fetch('/api/admin/ddc?q='+i).then(r=>r.ok?r.json():[]).catch(()=>[])));
    const byId=new Map();
    for(const list of responses)for(const row of list)byId.set(String(row.id),row);
    rows=[...byId.values()].sort((a,b)=>String(a.ddc_number).localeCompare(String(b.ddc_number),undefined,{numeric:true}));
  }
  $('ddcCount').textContent=String(rows.length);
  $('ddcRows').innerHTML=rows.map(x=>`<div class="row"><div><b>${esc(x.ddc_number)}</b><span>${esc(x.subject)}</span></div><div><button data-edit-ddc="${x.id}" data-ddc-number="${esc(x.ddc_number)}">Edit</button><button class="danger" data-del-ddc="${x.id}">Delete</button></div></div>`).join('')||'<p>No DDC records.</p>'
}
async function loadLoc(){const q=encodeURIComponent($('locSearch').value.trim());const r=await fetch('/api/admin/enhancements/locations/tree');if(!r.ok)return;const tree=await r.json();const needle=$('locSearch').value.trim().toLowerCase();let html='';for(const s of tree){const racks=s.racks.filter(r=>!needle||`${s.name} ${r.name} ${r.shelves.map(x=>x.shelf).join(' ')}`.toLowerCase().includes(needle));if(!racks.length)continue;html+=`<div class="tree-section"><b>📁 ${esc(s.name)}</b>${racks.map(r=>`<div class="tree-rack"><b>🗄 ${esc(r.name)}</b><div>${r.shelves.map(x=>`<span class="shelf">${esc(x.shelf||x.location_code)} <button data-edit-loc="${x.id}">Edit</button> <button class="danger" data-del-loc="${x.id}">×</button></span>`).join('')}</div></div>`).join('')}</div>`}$('locRows').innerHTML=html||'<p>No locations.</p>'}
$('ddcForm').addEventListener('submit',async e=>{e.preventDefault();const id=$('ddcId').value,body={ddc_number:$('ddcNumber').value.trim(),subject:$('ddcSubject').value.trim()};const r=await fetch(id?'/api/admin/ddc/'+id:'/api/admin/ddc',{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)return msg($('ddcMessage'),d.error||'Save failed');msg($('ddcMessage'),'DDC saved.',true);e.target.reset();$('ddcId').value='';$('ddcCancel').hidden=true;loadDdc()});
$('locForm').addEventListener('submit',async e=>{e.preventDefault();const id=$('locId').value,body={section_name:$('locSection').value.trim(),rack_name:$('locRack').value.trim(),shelf:$('locShelf').value.trim(),location_code:$('locCode').value.trim()};const r=await fetch(id?'/api/admin/enhancements/locations/'+id:'/api/admin/enhancements/locations',{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)return msg($('locMessage'),d.error||'Save failed');msg($('locMessage'),'Shelf saved.',true);e.target.reset();$('locId').value='';$('locCancel').hidden=true;loadLoc()});
$('ddcRows').addEventListener('click',async e=>{const edit=e.target.dataset.editDdc,del=e.target.dataset.delDdc;if(edit){const number=e.target.dataset.ddcNumber||'';const r=await fetch('/api/admin/ddc?q='+encodeURIComponent(number));const x=(await r.json()).find(v=>String(v.id)===String(edit));if(x){$('ddcId').value=x.id;$('ddcNumber').value=x.ddc_number;$('ddcSubject').value=x.subject;$('ddcCancel').hidden=false}}if(del&&confirm('Delete this DDC record?')){const r=await fetch('/api/admin/ddc/'+del,{method:'DELETE'});const d=await r.json();if(!r.ok)msg($('ddcMessage'),d.error||'Delete failed');else loadDdc()}});
$('locRows').addEventListener('click',async e=>{const edit=e.target.dataset.editLoc,del=e.target.dataset.delLoc;if(edit){const r=await fetch('/api/admin/enhancements/locations/tree');const tree=await r.json();for(const s of tree)for(const rack of s.racks)for(const x of rack.shelves)if(String(x.id)===String(edit)){$('locId').value=x.id;$('locSection').value=s.name;$('locRack').value=rack.name;$('locShelf').value=x.shelf||'';$('locCode').value=x.location_code||'';$('locCancel').hidden=false}}if(del&&confirm('Delete this shelf location?')){const r=await fetch('/api/admin/locations/'+del,{method:'DELETE'});const d=await r.json();if(!r.ok)msg($('locMessage'),d.error||'Delete failed');else loadLoc()}});
$('ddcCancel').onclick=()=>{$('ddcForm').reset();$('ddcId').value='';$('ddcCancel').hidden=true};$('locCancel').onclick=()=>{$('locForm').reset();$('locId').value='';$('locCancel').hidden=true};$('ddcSearch').addEventListener('input',loadDdc);$('locSearch').addEventListener('input',loadLoc);$('logout').onclick=async()=>{await fetch('/api/auth/logout',{method:'POST'});location.href='/'};
(async()=>{if(await ensure()){loadDdc();loadLoc()}})();
