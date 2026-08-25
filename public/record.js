const $=id=>document.getElementById(id);
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function field(label,value){if(value===null||value===undefined||String(value).trim()==='')return '';return `<div class="record-field"><b>${esc(label)}</b><span>${esc(value)}</span></div>`}
function authors(book){return (book.accession_authors||[]).slice().sort((a,b)=>Number(a.author_order)-Number(b.author_order)).map(x=>x.author_name).filter(Boolean).join('; ')}
function contributors(book){return (book.accession_contributors||[]).map(x=>x.contributor_role?`${x.contributor_name} (${x.contributor_role})`:x.contributor_name).filter(Boolean).join('; ')}
function locationText(book){const x=book.location_master;if(!x)return '';return [x.location_name,x.location_code,x.shelf?'Shelf '+x.shelf:''].filter(Boolean).join(' — ')}
async function load(){
  const params=new URLSearchParams(window.location.search),id=params.get('id'),accession=params.get('accession');
  if(!id&&!accession){$('message').textContent='No accession specified.';return}
  try{
    const url=id?`/api/accessions/id/${encodeURIComponent(id)}`:`/api/accessions/${encodeURIComponent(accession)}`;
    const response=await fetch(url,{credentials:'same-origin',headers:{Accept:'application/json'}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'Unable to load accession record.');
    const book=data;
    $('message').hidden=true;
    const sheet=$('record');sheet.hidden=false;
    sheet.innerHTML=`<div class="record-heading"><div><div class="record-kicker">ACCESSION REGISTER</div><h2>${esc(book.title||'Untitled')}</h2>${book.subtitle?`<p>${esc(book.subtitle)}</p>`:''}</div><div class="record-number">${esc(book.accession_no)}</div></div><div class="record-grid">${field('Accession Date',book.accession_date)}${field('Author(s)',authors(book))}${field('Contributor(s)',contributors(book))}${field('Edition',book.edition)}${field('Publisher',book.publisher)}${field('Publication Place',book.publication_place)}${field('Publication Year',book.publication_year)}${field('ISBN',book.isbn)}${field('Pages',book.pages)}${field('Price',book.price==null?'':`₹ ${Number(book.price).toFixed(2)}`)}${field('DDC Number',book.ddc_number)}${field('Subject',book.subject)}${field('Location',locationText(book))}${field('Language',book.language)}${field('Book Type',book.book_type)}${field('Status',book.status)}${field('Remarks',book.remarks)}</div><div class="record-footer">Sub Divisional Library, Miao</div>`;
  }catch(error){$('message').textContent=error.message;}
}
$('print').onclick=()=>window.print();
$('back').onclick=()=>history.length>1?history.back():location.href='/';
load();