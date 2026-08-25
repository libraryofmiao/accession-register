(()=>{
  const ddc=document.getElementById('ddcNumber');
  const subject=document.getElementById('subject');
  if(!ddc||!subject)return;
  const normalize=v=>{const s=String(v??'').trim().replace(/\.0+$/,'');return /^\d{1,3}$/.test(s)?s.padStart(3,'0'):s};
  let timer=null,last='';
  async function lookup(value){
    const q=String(value??'').trim();
    if(!q){subject.value='';last='';return;}
    const n=normalize(q);
    if(n===last)return;
    try{
      const response=await fetch(`/api/ddc?q=${encodeURIComponent(n)}`,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
      if(!response.ok)return;
      const rows=await response.json();
      const hit=(Array.isArray(rows)?rows:[]).find(row=>normalize(row.ddc_number)===n);
      if(hit){ddc.value=n;subject.value=String(hit.subject??'');last=n;}
    }catch(error){console.error('DDC subject lookup failed',error)}
  }
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>lookup(ddc.value),100)};
  ddc.addEventListener('input',schedule);
  ddc.addEventListener('change',()=>lookup(ddc.value));
  ddc.addEventListener('blur',()=>setTimeout(()=>lookup(ddc.value),50));
  ddc.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();lookup(ddc.value)}});
  lookup(ddc.value);
})();
