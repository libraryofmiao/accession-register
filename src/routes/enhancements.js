import express from "express";

export function createEnhancementRouter(supabaseAdmin){
  const router=express.Router();
  const esc=(v)=>String(v??"").trim();
  const normalizeDdc=(v)=>{const s=esc(v).replace(/\.0+$/,""),n=Number(s);return Number.isFinite(n)&&n>=0&&n<=999?String(Math.trunc(n)).padStart(3,"0"):s};

  router.get("/locations/tree",async(_req,res)=>{
    const {data,error}=await supabaseAdmin.from("location_master").select("id,location_code,location_name,section_name,rack_name,shelf,created_at").order("section_name").order("rack_name").order("shelf");
    if(error)return res.status(500).json({error:error.message});
    const sections={};
    for(const row of data||[]){const s=row.section_name||row.location_name||"Unassigned Section";const k=row.rack_name||"Unassigned Rack";sections[s]??={name:s,racks:{}};sections[s].racks[k]??={name:k,shelves:[]};sections[s].racks[k].shelves.push(row)}
    res.json(Object.values(sections).map(s=>({...s,racks:Object.values(s.racks)})));
  });

  router.post("/locations",async(req,res)=>{const b=req.body||{},section=esc(b.section_name),rack=esc(b.rack_name),shelf=esc(b.shelf),code=esc(b.location_code)||[section,rack,shelf].filter(Boolean).join("/");if(!section||!rack||!shelf)return res.status(400).json({error:"Section, rack and shelf are required."});const {data,error}=await supabaseAdmin.from("location_master").insert({location_code:code,location_name:section,section_name:section,rack_name:rack,shelf}).select().single();if(error)return res.status(400).json({error:error.message});res.status(201).json(data);});
  router.put("/locations/:id",async(req,res)=>{const b=req.body||{},section=esc(b.section_name),rack=esc(b.rack_name),shelf=esc(b.shelf),code=esc(b.location_code)||[section,rack,shelf].filter(Boolean).join("/");if(!section||!rack||!shelf)return res.status(400).json({error:"Section, rack and shelf are required."});const {data,error}=await supabaseAdmin.from("location_master").update({location_code:code,location_name:section,section_name:section,rack_name:rack,shelf}).eq("id",req.params.id).select().single();if(error)return res.status(400).json({error:error.message});res.json(data);});

  router.get("/ddc/all",async(_req,res)=>{
    const {data,error}=await supabaseAdmin.from("ddc_master").select("id,ddc_number,subject,division_number,section_number,created_at").order("ddc_number").range(0,999);
    if(error)return res.status(500).json({error:error.message});
    res.json(data||[]);
  });

  // Always search the complete DDC master in memory. This works whether
  // ddc_number is stored as text or numeric in Supabase.
  router.get("/ddc/lookup",async(req,res)=>{
    const q=esc(req.query.q);
    if(!q)return res.json([]);
    const {data,error}=await supabaseAdmin.from("ddc_master").select("id,ddc_number,subject,division_number,section_number").order("ddc_number").range(0,999);
    if(error)return res.status(500).json({error:error.message});
    const nq=normalizeDdc(q), lower=q.toLowerCase();
    const rows=(data||[]).map(x=>({...x,ddc_number:String(x.ddc_number??"").trim().padStart(3,"0")}));
    const exact=rows.filter(x=>normalizeDdc(x.ddc_number)===nq);
    const matches=rows.filter(x=>x.ddc_number.includes(q)||String(x.subject||"").toLowerCase().includes(lower));
    const out=[...exact,...matches.filter(x=>!exact.some(e=>String(e.id)===String(x.id)))].slice(0,20);
    res.json(out);
  });

  router.get("/reports/summary",async(_req,res)=>{const [{count:accessions},{count:ddc},{count:locations}]=await Promise.all([supabaseAdmin.from("accessions").select("id",{count:"exact",head:true}),supabaseAdmin.from("ddc_master").select("id",{count:"exact",head:true}),supabaseAdmin.from("location_master").select("id",{count:"exact",head:true})]);res.json({accessions:accessions||0,ddc:ddc||0,locations:locations||0});});
  router.get("/data/export",async(_req,res)=>{const names=["accessions","accession_authors","accession_contributors","ddc_master","location_master","app_settings","audit_log"];const out={exported_at:new Date().toISOString(),version:1};for(const name of names){const {data,error}=await supabaseAdmin.from(name).select("*");if(error&&error.code!=="42P01")return res.status(500).json({error:error.message});out[name]=data||[]}res.setHeader("Content-Disposition",`attachment; filename="accession-register-backup-${new Date().toISOString().slice(0,10)}.json"`);res.json(out);});
  router.get("/settings",async(_req,res)=>{const {data,error}=await supabaseAdmin.from("app_settings").select("key,value").order("key");if(error&&error.code!=="42P01")return res.status(500).json({error:error.message});res.json(data||[])});
  router.put("/settings/:key",async(req,res)=>{const {data,error}=await supabaseAdmin.from("app_settings").upsert({key:req.params.key,value:esc(req.body?.value)},{onConflict:"key"}).select().single();if(error)return res.status(400).json({error:error.message});res.json(data)});

  return router;
}
