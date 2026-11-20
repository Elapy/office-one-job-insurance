// Career Safety Net — waitlist intake. Schema v1.0 shared with engine/ (see ../profile-schema.json)
const split = v => (v||"").split(",").map(s=>s.trim()).filter(Boolean);
const $ = s => document.querySelector(s);
function makeId(){ const r=Math.random().toString(36).slice(2,8).toUpperCase(); return `csn-${new Date().getFullYear()}-${r}`; }
let current=null;
// Restore saved profile
try{ const saved=localStorage.getItem("csn-profile"); if(saved){ current=JSON.parse(saved); show(current); } }catch(e){}
document.getElementById("intake").addEventListener("submit", e=>{
  e.preventDefault();
  const f=new FormData(e.target);
  const profile={
    schema_version:"1.0",
    profile_id: makeId(),
    email: (f.get("email")||"").toString().trim(),
    current_role: (f.get("current_role")||"").toString().trim(),
    desired_roles: split(f.get("desired")),
    keywords: split(f.get("keywords")),
    locations: split(f.get("locations")),
    remote_ok: !!f.get("remote_ok"),
    pay_floor:{ amount: parseFloat(f.get("pay_amount"))||0, unit: f.get("pay_unit")||"hour", currency:"USD" },
    industries: split(f.get("industries")),
    deal_breakers: split(f.get("deal_breakers")),
    created_at: new Date().toISOString()
  };
  current=profile;
  localStorage.setItem("csn-profile", JSON.stringify(profile));
  localStorage.setItem("csn-waitlist-email", profile.email);
  show(profile);
});
function show(p){
  document.getElementById("confirmation").hidden=false;
  document.getElementById("profile-id").textContent=p.profile_id;
  document.getElementById("preview").textContent=JSON.stringify(p,null,2);
  document.getElementById("confirmation").scrollIntoView({behavior:"smooth"});
}
document.getElementById("download").addEventListener("click", ()=>{
  if(!current) return;
  const blob=new Blob([JSON.stringify(current,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=current.profile_id+"-preference-profile.json"; a.click(); URL.revokeObjectURL(a.href);
});
document.getElementById("copy").addEventListener("click", async ()=>{ if(current) await navigator.clipboard.writeText(JSON.stringify(current,null,2)); });
