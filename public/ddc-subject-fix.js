(()=>{
  const ddc=document.getElementById('ddcNumber');
  const subject=document.getElementById('subject');
  const suggestions=document.getElementById('ddcSuggestions');
  if(!ddc||!subject)return;
  const norm=v=>{let s=String(v??'').trim().replace(/\.0+$/,'');return /^\d{1,3}$/.test(s)?s.padStart(3,'0'):s};
  const json=async url=>{const r=await fetch(url,{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw new Error(String(r.status));return r.json()};
  const exact=async q=>{
    const n=norm(q);
    const urls=[
      `/api/admin/enhancements/ddc/lookup?q=${encodeURIComponent(q)}`,
      `/api/admin/ddc?q=${encodeURIComponent(q)}`,
      `/api/ddc?q=${encodeURIComponent(q)}`
    ];
    for(const url of urls){
      try{
        const rows=await json(url);
        const hit=(Array.isArray(rows)?rows:[]).find(x=>norm(x.ddc_number)===n);
        if(hit)return hit;
      }catch(_e){}
    }
    return null;
  };
  let timer;
  const resolve=async()=>{
    const q=ddc.value.trim();
    if(!q){subject.value='';if(suggestions)suggestions.innerHTML='';return}
    const hit=await exact(q);
    if(hit){
      ddc.value=norm(hit.ddc_number);
      subject.value=String(hit.subject??'');
      if(suggestions)suggestions.innerHTML='';
    }
  };
  ddc.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(resolve,120)});
  ddc.addEventListener('change',resolve);
  ddc.addEventListener('blur',()=>setTimeout(resolve,50));
  ddc.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();resolve()}});
})();
