// Career Safety Net — waitlist intake. Schema v1.0 shared with engine/ (see ../profile-schema.json)
// All form values are validated in JS as well as by HTML attributes: HTML
// `required`/`type=email`/`min` are cosmetic if a visitor removes them via
// devtools, and the downloaded profile is consumed by the matching engine,
// so out-of-schema values (unknown pay units, negative pay, empty required
// fields, unbounded strings) must never reach the stored profile.
// ---- Intake delivery (VENTURE-INTAKE-DELIVERY-1) ----------------------
// Waitlist profiles are delivered to the shared Office One intake
// backend, which stores them durably and writes them into the matching
// engine's profiles directory as engine inputs. localStorage remains
// the offline fallback. PRODUCTION GATE: INTAKE_API_BASE points at the
// reserved https://intake.invalid host until the intake service is
// hosted (a signup/deploy step) — set window.INTAKE_API_BASE (or this
// constant) to the hosted base URL in the same pass that updates
// connect-src in index.html. While delivery is unreachable the visitor
// is TOLD their profile is saved in this browser only — never a silent
// loss: the localStorage copy is written BEFORE delivery is attempted.
const INTAKE_API_BASE=(typeof window!=='undefined'&&window.INTAKE_API_BASE)||'https://intake.invalid';
function deliverProfile(profile){
 const ctl=(typeof AbortController!=='undefined')?new AbortController():null;
 const timer=ctl?setTimeout(()=>ctl.abort(),6000):null;
 return fetch(INTAKE_API_BASE+'/api/intake/fallback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(profile),signal:ctl?ctl.signal:undefined})
  .then(r=>{if(timer)clearTimeout(timer);return r.ok})
  .catch(()=>{if(timer)clearTimeout(timer);return false});
}
const MAX_ITEM=100, MAX_ITEMS=50, MAX_FIELD=500;
const split = v => { const out=[]; const seen=new Set(); for(const s of (v||"").toString().split(",").map(x=>x.trim().slice(0,MAX_ITEM)).filter(Boolean)){ if(!seen.has(s)){ seen.add(s); out.push(s); if(out.length>=MAX_ITEMS) break; } } return out; };
// Locations are "City, ST" entries (the form's own example is
// "Ventura, CA, Camarillo, CA"): a plain comma split mangles each entry
// into a city fragment and a bare state fragment the engine then tries
// to match as standalone locations. Split on semicolons/newlines when
// present; otherwise split on commas and re-join a trailing state-code
// fragment (e.g. "CA") to the entry before it.
const splitLocations = v => { const raw=(v||"").toString(); const out=[]; const seen=new Set();
 const push=s=>{ s=s.trim().slice(0,MAX_ITEM); if(s&&!seen.has(s)){ seen.add(s); out.push(s); } };
 if(/[;\n]/.test(raw)){ raw.split(/[;\n]+/).forEach(push); }
 else { const parts=raw.split(",").map(x=>x.trim()).filter(Boolean);
  for(const p of parts){ if(/^[A-Za-z]{2}$/.test(p)&&out.length){ const merged=out[out.length-1]+", "+p.toUpperCase(); seen.delete(out[out.length-1]); out[out.length-1]=merged.slice(0,MAX_ITEM); seen.add(out[out.length-1]); } else push(p); if(out.length>=MAX_ITEMS) break; } }
 return out.slice(0,MAX_ITEMS); };
const clean = v => (v||"").toString().trim().slice(0,MAX_FIELD);
const $ = s => document.querySelector(s);
function randSuffix(n){ try{ const a=new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(b=>'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[b%36]).join(''); }catch(e){ let s=''; while(s.length<n) s+=Math.random().toString(36).slice(2).toUpperCase().replace(/[^A-Z0-9]/g,''); return s.slice(0,n); } }
function makeId(){ return `csn-${new Date().getFullYear()}-${randSuffix(8)}`; }
function isValidProfile(p){ return !!p && typeof p==='object' && !Array.isArray(p) && typeof p.profile_id==='string' && p.profile_id.length>0 && typeof p.email==='string'; }
let current=null;
// Restore saved profile — only if it parses AND has the expected shape;
// malformed-but-parseable values (null, [], {"profile_id":123}) previously
// unhid a bogus confirmation with a blank/garbage profile ID.
try{ const saved=localStorage.getItem("csn-profile"); if(saved){ const parsed=JSON.parse(saved); if(isValidProfile(parsed)){ current=parsed; show(current); } } }catch(e){}
document.getElementById("intake").addEventListener("submit", e=>{
  e.preventDefault();
  const f=new FormData(e.target);
  const email=clean(f.get("email")).slice(0,254);
  const desiredRoles=split(f.get("desired"));
  // JS-side enforcement of the two required fields (HTML validation alone
  // is bypassable). Surface the problem on the offending input and abort —
  // no profile is created, stored, or offered for download.
  const emailEl=e.target.querySelector('[name="email"]');
  const desiredEl=e.target.querySelector('[name="desired"]');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ if(emailEl){ emailEl.setCustomValidity('Please enter a valid email address.'); try{emailEl.reportValidity();}catch(_){} emailEl.setCustomValidity(''); } return; }
  if(!desiredRoles.length){ if(desiredEl){ desiredEl.setCustomValidity('Please list at least one desired role.'); try{desiredEl.reportValidity();}catch(_){} desiredEl.setCustomValidity(''); } return; }
  const rawAmount=parseFloat(f.get("pay_amount"));
  const amount=Number.isFinite(rawAmount)&&rawAmount>0?Math.min(Math.round(rawAmount*100)/100,10000000):0;
  const unit=["hour","year"].includes(f.get("pay_unit"))?f.get("pay_unit"):"hour";
  // Re-submitting with the same email is an update, not a new signup:
  // keep the original profile_id/created_at so a double-click or an
  // update does not orphan the ID the user already downloaded.
  const isUpdate=isValidProfile(current)&&current.email===email;
  const profile={
    schema_version:"1.0",
    profile_id: isUpdate?current.profile_id:makeId(),
    email: email,
    current_role: clean(f.get("current_role")),
    desired_roles: desiredRoles,
    keywords: split(f.get("keywords")),
    locations: splitLocations(f.get("locations")),
    remote_ok: !!f.get("remote_ok"),
    pay_floor:{ amount: amount, unit: unit, currency:"USD" },
    industries: split(f.get("industries")),
    deal_breakers: split(f.get("deal_breakers")),
    created_at: isUpdate?current.created_at:new Date().toISOString()
  };
  current=profile;
  // A full/blocked localStorage must not silently kill the signup: the
  // in-memory profile and its download still work if persistence fails.
  try{ localStorage.setItem("csn-profile", JSON.stringify(profile)); }catch(err){}
  try{ localStorage.setItem("csn-waitlist-email", profile.email); }catch(err){}
  show(profile);
  const statusEl=document.getElementById("delivery-status");
  if(statusEl) statusEl.textContent="Sending your profile to Fallback…";
  deliverProfile(profile).then(ok=>{ if(!statusEl) return;
   statusEl.textContent=ok
    ? "Received by Fallback — your profile has been delivered to our matching engine."
    : "Your profile is saved in this browser only — we could not reach our waitlist system just now. Please download your preference profile (JSON) below and keep it; it is the same format our matching engine reads, so you can send it to us and we can load it directly.";
  });
});
function show(p){
  if(!isValidProfile(p)) return;
  document.getElementById("confirmation").hidden=false;
  document.getElementById("profile-id").textContent=p.profile_id;
  document.getElementById("preview").textContent=JSON.stringify(p,null,2);
  const c=document.getElementById("confirmation"); if(c&&typeof c.scrollIntoView==="function") c.scrollIntoView({behavior:"smooth"});
}
document.getElementById("download").addEventListener("click", ()=>{
  if(!current) return;
  const blob=new Blob([JSON.stringify(current,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=current.profile_id+"-preference-profile.json"; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
});
document.getElementById("copy").addEventListener("click", async ()=>{ if(current) await navigator.clipboard.writeText(JSON.stringify(current,null,2)); });
