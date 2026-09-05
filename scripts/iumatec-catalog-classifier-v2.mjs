import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/* IUMATEC Catalog Classifier V2 — DRY RUN ONLY */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase URL/secret key nao encontrados.");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const OUT = path.resolve("integrations", "alltron", "out");
fs.mkdirSync(OUT, { recursive: true });

const SAFE = 0.995;
const REVIEW = 0.90;

const txt = (v) => String(v ?? "").trim();
const norm = (v) => txt(v).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/ß/g, "ss").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
const any = (t, arr) => arr.some((r) => r.test(t));
const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
const result = (productType, category, subcategory, confidence, reason) => ({ productType, category, subcategory, confidence, reason });

const ACCESSORY = [
  /\bcase\b/,/\bcover\b/,/\bbackcover\b/,/\bbooklet\b/,/\bfolio\b/,/\bbumper\b/,/\bshell\b/,/\bskin\b/,/\bsleeve\b/,/\btasche\b/,/\bbag\b/,/\bbackpack\b/,/\bruck(sack)?\b/,
  /\bglass\b/,/\bschutzglas\b/,/\bpanzerglas\b/,/\btempered\b/,/\bfolie\b/,/\bschutzfolie\b/,/\bprivacy\b/,/\bprotector\b/,/\bprotection\b/,/\bfilter\b/,
  /\bhalterung\b/,/\bhalter\b/,/\bholder\b/,/\bmount\b/,/\bwandhalterung\b/,/\bwandhalter\b/,/\bstand\b/,/\bstativ\b/,/\bstander\b/,/\bclamp\b/,/\bklemme\b/,/\bcage\b/,
  /\bdock\b/,/\bdocking\b/,/\bhub\b/,/\badapter\b/,/\bkonverter\b/,/\bkabel\b/,/\bcable\b/,/\bcharger\b/,/\bladegerat\b/,/\bladepad\b/,/\bpowerbank\b/,/\bersatzakku\b/,/\breplacement\s+battery\b/,
  /\bkeyboard\b/,/\btastatur\b/,/\bcombo\s+touch\b/,/\bmouse\b/,/\bmaus\b/,/\bstylus\b/,/\bstift\b/,/\bpencil\b/,/\bheadset\b/,/\bheadphone\b/,/\bkopfhorer\b/,/\bwebcam\b/,/\bcooler\b/,/\bkuhler\b/,/\blufter\b/,
  /\breinigung\b/,/\bcleaning\b/,/\bersatz\b/,/\breplacement\b/,/\bstrap\b/,/\bschultergurt\b/,/\bband\b/,/\bkette\b/,/\banti[- ]?glare\b/,/\bantimicrobial\b/
];
const PHONE_CTX=[/\biphone\b/,/\bgalaxy\s+(?:s|z|a|m|xcover)\b/,/\bpixel\b/,/\bredmi\b/,/\bpoco\b/,/\bmotorola\b/,/\bmoto\b/,/\bhonor\b/,/\boneplus\b/,/\bfairphone\b/,/\bnothing\s+phone\b/,/\bnokia\b/];
const TABLET_CTX=[/\bipad\b/,/\bgalaxy\s+tab\b/,/\blenovo\s+tab\b/,/\bxiaomi\s+pad\b/,/\bmatepad\b/,/\bsurface\s+(?:pro|go)\b/,/\btablet\b/];
const LAPTOP_CTX=[/\blaptop\b/,/\bnotebook\b/,/\bmacbook\b/,/\bthinkpad\b/,/\bideapad\b/,/\belitebook\b/,/\bprobook\b/,/\bzbook\b/,/\blatitude\b/,/\binspiron\b/,/\bvostro\b/,/\bxps\b/,/\bvivobook\b/,/\bzenbook\b/,/\bexpertbook\b/,/\btravelmate\b/,/\baspire\b/,/\bswift\b/,/\bspectre\b/,/\blegion\b/,/\bomnibook\b/,/\bsurface\s+laptop\b/];
const PHONE=[/\bmobiltelefon\b/,/\biphone\s*(?:se|1[1-9]|[6-9])\b/,/\bgalaxy\s+(?:s|z|a|m)\s*\d{1,3}\b/,/\bgalaxy\s+xcover\b/,/\bgoogle\s+pixel\s+\d/,/\bpixel\s+\d/,/\bfairphone\s*\d*/,/\bnothing\s+phone\b/,/\boneplus\s+\d/,/\bxiaomi\s+(?:1[0-9]|mi\s*\d)\b/,/\bredmi\s+(?:note\s*)?\d/,/\bpoco\s+[cfmx]\d/i,/\bmotorola\s+(?:edge|razr)\b/,/\bmoto\s+[gex]\d/i,/\bhonor\s+(?:magic|\d)/,/\bnokia\s+[a-z]?\d/i];
const TABLET=[/\bipad\s*(?:air|pro|mini|\d)/,/\bgalaxy\s+tab\s+[a-z]\d/i,/\blenovo\s+tab\b/,/\bxiaomi\s+pad\b/,/\bmatepad\b/,/\bsurface\s+(?:pro|go)\b/,/\btablet[- ]?pc\b/,/\be-ink\s+tablet\b/];
const LAPTOP=[/\blaptop\b/,/\bnotebook\b/,/\bmacbook\b/,/\bchromebook\b/,/\bthinkpad\b/,/\bideapad\b/,/\belitebook\b/,/\bprobook\b/,/\bzbook\b/,/\blatitude\b/,/\binspiron\b/,/\bvostro\b/,/\bxps\s+\d/,/\bvivobook\b/,/\bzenbook\b/,/\bexpertbook\b/,/\btravelmate\b/,/\baspire\b/,/\bswift\b/,/\bspectre\b/,/\blegion\b/,/\bomnibook\b/,/\bsurface\s+laptop\b/];
const DESKTOP=[/\bdesktop[- ]?pc\b/,/\bgaming\s+pc\b/,/\ball[- ]in[- ]one\b/,/\boptiplex\b/,/\bprodesk\b/,/\belitedesk\b/,/\bprecision\s+\d/,/\btower\s+pc\b/];
const MINI=[/\bmini[- ]?pc\b/,/\bnuc\b/,/\bmini[- ]?system\b/,/\bmini\s+computer\b/,/\btiny\s+pc\b/];
const MONITOR=[/\bmonitor\b/,/\bgaming\s+monitor\b/,/\blcd\s+monitor\b/,/\btft\s+monitor\b/];
const MONITOR_ACC=[/\bmonitorarm\b/,/\bmonitor\s+arm\b/,/\bwall\s+mount\b/,/\bwandhalter\b/,/\bhalterung\b/,/\bprivacy\b/,/\bfilter\b/,/\bstand\b/,/\bstativ\b/,/\bmount\b/,/\bbracket\b/];
const GPU=[/\bgrafikkarte\b/,/\bgraphics\s+card\b/,/\bgeforce\s+(?:rtx|gtx)\b/,/\bradeon\s+rx\s*\d/];
const RAM=[/\b(?:rdimm|udimm|sodimm|so-dimm|dimm)\b.*\b(?:8|16|32|64|128)\s*gb\b/,/\b(?:8|16|32|64|128)\s*gb\b.*\b(?:rdimm|udimm|sodimm|so-dimm|dimm)\b/,/\barbeitsspeicher\b/,/\bmemory\s+kit\b/];
const MAINBOARD=[/\bmainboard\b/,/\bmotherboard\b/];
const CPU=[/\bprozessor\b/,/\bprocessor\b/,/\bcore\s+i[3579][ -]?\d{4,5}\b/,/\bryzen\s+[3579]\s+\d{4,5}\b/];
const ROUTER=[/\brouter\b/,/\bfritz!?box\b/,/\bdream\s+router\b/];
const SWITCH=[/\bnetwork\s+switch\b/,/\bnetzwerk[- ]?switch\b/,/\bmanaged\s+switch\b/,/\bunmanaged\s+switch\b/,/\bpoe\s+switch\b/,/\bunifi\s+switch\b/];
const NETCABLE=[/\blan\s+kabel\b/,/\bethernet\s+cable\b/,/\bpatchkabel\b/,/\bnetzwerkkabel\b/,/\brj45\b.*\bkabel\b/,/\busb[- ]?lan\b/,/\blan\s+adapter\b/];
const STORAGE=[/\b(?:m\.?2\s+)?nvme\s+ssd\b/,/\b(?:sata\s+)?ssd\s+\d+\s*(?:gb|tb)\b/,/\bhdd\s+\d+\s*(?:gb|tb)\b/,/\bfestplatte\s+\d+\s*(?:gb|tb)\b/,/\bexternal\s+ssd\b/,/\bexterne\s+ssd\b/,/\bportable\s+ssd\b/,/\bnas\s+(?:system|server|gehaeuse)\b/];
const PRINTER=[/\bdrucker\b/,/\bprinter\b/,/\bscanner\b/,/\bmultifunktions\b/,/\blaserjet\b/,/\bofficejet\b/,/\becotank\b/,/\bworkforce\b/];
const PRINTCON=[/\btoner\b/,/\btintenpatrone\b/,/\bink\s+cartridge\b/,/\btonerpatrone\b/,/\bdrum\s+unit\b/,/\btrommeleinheit\b/];
const KEYBOARD=[/\bkeyboard\b/,/\btastatur\b/], MOUSE=[/\bmouse\b/,/\bmaus\b/], HEADSET=[/\bheadset\b/,/\bkopfhorer\b/,/\bheadphone\b/], WEBCAM=[/\bwebcam\b/,/\bweb\s+camera\b/], DOCK=[/\bdockingstation\b/,/\bdocking\s+station\b/,/\busb[- ]?c\s+dock\b/];
const SECURITY=[/\buberwachungskamera\b/,/\bsecurity\s+camera\b/,/\bip\s+camera\b/,/\bvideo\s+doorbell\b/,/\bturklingel\b/];
const LIGHT=[/\bsmart\s+light\b/,/\bsmart\s+bulb\b/,/\bled\s+lampe\b/,/\bbeleuchtung\b/];
const ENERGY=[/\bsmart\s+plug\b/,/\bsteckdose\b/,/\bstromverteiler\b/,/\bwallbox\b/];
const PROJECTOR=[/\bprojektor\b/,/\bbeamer\b/,/\bprojector\b/];
const ROBOT=[/\brobotersauger\b/,/\bsaugroboter\b/,/\brobot\s+vacuum\b/,/\broborock\b/];

function classify(p){
  const t=norm(`${p.title||""} ${p.brand||""} ${p.sku||""}`), oldC=txt(p.category), oldS=txt(p.subcategory);
  if(any(t,ROBOT)) return result("robot_vacuum","Smart Home","Gebäudetechnik",0.999,"robot vacuum");
  if(any(t,ACCESSORY)&&any(t,[...PHONE_CTX,...TABLET_CTX])) return result("mobile_accessory","Mobile","Mobile Zubehör",0.997,"accessory + phone/tablet context");
  if(any(t,ACCESSORY)&&any(t,LAPTOP_CTX)){
    if(any(t,DOCK)) return result("docking_station","Peripherie","Dockingstationen",0.995,"computer context + dock");
    return result("computer_accessory","Computer","Computer-Zubehör",0.995,"accessory + computer context");
  }
  if(any(t,MONITOR_ACC)&&any(t,MONITOR)) return result("monitor_accessory","Peripherie","Zubehör",0.995,"monitor accessory");
  if(any(t,PRINTCON)) return result("printer_consumable","Office & Business","Drucker & Scanner",0.94,"printer consumable");
  if(any(t,PHONE)&&!any(t,ACCESSORY)) return result("smartphone_device","Mobile","Smartphones",0.999,"strong smartphone model");
  if(any(t,TABLET)&&!any(t,ACCESSORY)) return result("tablet_device","Mobile","Tablets",0.999,"strong tablet model");
  if(any(t,MINI)&&!any(t,ACCESSORY)) return result("mini_pc_device","Computer","Mini-PCs",0.999,"mini pc");
  if(any(t,LAPTOP)&&!any(t,ACCESSORY)) return result("laptop_device","Computer","Laptops",0.999,"laptop family");
  if(any(t,DESKTOP)&&!any(t,ACCESSORY)) return result("desktop_pc","Computer","Desktop-PCs",0.999,"desktop family");
  if(any(t,GPU)) return result("graphics_card","PC-Komponenten","Grafikkarten",0.999,"gpu");
  if(any(t,RAM)) return result("ram_module","PC-Komponenten","RAM",0.99,"ram");
  if(any(t,MAINBOARD)) return result("motherboard","PC-Komponenten","Mainboards",0.999,"mainboard");
  if(any(t,CPU)&&oldC==="PC-Komponenten") return result("processor","PC-Komponenten","Prozessoren",0.997,"cpu");
  if(any(t,MONITOR)&&!any(t,MONITOR_ACC)&&!any(t,ACCESSORY)) return result("monitor_device","Peripherie","Monitore",0.997,"monitor");
  if(any(t,KEYBOARD)&&!any(t,[...PHONE_CTX,...TABLET_CTX])) return result("keyboard","Peripherie","Tastaturen",0.998,"keyboard");
  if(any(t,MOUSE)) return result("mouse","Peripherie","Mäuse",0.998,"mouse");
  if(any(t,HEADSET)) return result("headset","Peripherie","Headsets",0.999,"headset");
  if(any(t,WEBCAM)&&!/abdeckung|cover|privacy/.test(t)) return result("webcam","Peripherie","Webcams",0.998,"webcam");
  if(any(t,DOCK)) return result("docking_station","Peripherie","Dockingstationen",0.998,"dock");
  if(any(t,NETCABLE)) return result("network_cable_adapter","Netzwerk","Kabel & Adapter",0.999,"network cable/adapter");
  if(any(t,ROUTER)) return result("router","Netzwerk","Netzwerk",0.998,"router");
  if(any(t,SWITCH)) return result("network_switch","Netzwerk","Netzwerk",0.998,"network switch");
  if(any(t,STORAGE)&&["PC-Komponenten","Datenspeicher"].includes(oldC)) return result("storage_device","Datenspeicher","Storage",0.997,"storage");
  if(any(t,PRINTER)&&!any(t,PRINTCON)) return result("printer_scanner","Office & Business","Drucker & Scanner",0.997,"printer/scanner");
  if(any(t,PROJECTOR)) return result("projector","Office & Business","Projektoren",0.985,"projector");
  if(any(t,SECURITY)) return result("security_camera","Smart Home","Sicherheit & Überwachung",0.99,"security camera");
  if(any(t,LIGHT)) return result("smart_lighting","Smart Home","Beleuchtung",0.985,"lighting");
  if(any(t,ENERGY)) return result("energy_power","Smart Home","Energie & Strom",0.985,"energy/power");
  return result("unclassified",oldC||"Unsortiert",oldS||"Sonstiges",0,"no strong rule");
}

function expected(c,s){
  const m={
    "Mobile|||Smartphones":"smartphone_device","Mobile|||Tablets":"tablet_device","Computer|||Laptops":"laptop_device","Computer|||Desktop-PCs":"desktop_pc","Computer|||Mini-PCs":"mini_pc_device","Peripherie|||Monitore":"monitor_device","PC-Komponenten|||Grafikkarten":"graphics_card"
  };
  return m[`${txt(c)}|||${txt(s)}`]||null;
}

async function readAll(){
  const all=[], pageSize=1000; let last=null;
  while(true){
    let q=supabase.from("products").select("sku,title,brand,category,subcategory,price,in_stock,stock_qty,merchandise_id,shopify_sync_status").order("sku",{ascending:true}).limit(pageSize);
    if(last) q=q.gt("sku",last);
    const {data,error}=await q; if(error) throw new Error(error.message);
    const b=data||[]; all.push(...b); if(b.length) last=b[b.length-1].sku;
    console.log(`SKUs únicos lidos: ${all.length}${last?` | cursor: ${last}`:""}`);
    if(b.length<pageSize) break;
  }
  return all;
}

function writeCsv(file,rows){
  if(!rows.length){fs.writeFileSync(file,"","utf8");return;}
  const h=Object.keys(rows[0]);
  fs.writeFileSync(file,[h.join(","),...rows.map(r=>h.map(k=>esc(r[k])).join(","))].join("\n"),"utf8");
}
function grouped(list,fn){const m=new Map(); for(const x of list){const k=fn(x);m.set(k,(m.get(k)||0)+1)} return [...m.entries()].sort((a,b)=>b[1]-a[1]);}

const products=await readAll(), seen=new Set(), rows=[];
for(const p of products){
  const sku=txt(p.sku); if(!sku||seen.has(sku)) continue; seen.add(sku);
  const c=classify(p), oldC=txt(p.category), oldS=txt(p.subcategory);
  const changed=oldC!==c.category||oldS!==c.subcategory;
  let status="KEEP";
  if(c.productType!=="unclassified") status=c.confidence>=SAFE?(changed?"SAFE_CHANGE":"CLEAN"):(c.confidence>=REVIEW?"REVIEW":"KEEP");
  const exp=expected(oldC,oldS);
  const risk=exp?(c.productType==="unclassified"?"UNKNOWN":(c.productType!==exp?"YES":"NO")):"NO";
  rows.push({sku,title:txt(p.title),brand:txt(p.brand),price:Number(p.price||0),stock_qty:Number(p.stock_qty||0),old_category:oldC,old_subcategory:oldS,proposed_category:c.category,proposed_subcategory:c.subcategory,product_type:c.productType,confidence:c.confidence.toFixed(3),reason:c.reason,status,page_risk:risk});
}

const safe=rows.filter(r=>r.status==="SAFE_CHANGE"), review=rows.filter(r=>r.status==="REVIEW"), clean=rows.filter(r=>r.status==="CLEAN"), keep=rows.filter(r=>r.status==="KEEP"), risk=rows.filter(r=>r.page_risk==="YES"), unknown=rows.filter(r=>r.page_risk==="UNKNOWN");
const stamp=new Date().toISOString().replaceAll(":","-").replaceAll(".","-");
const allPath=path.join(OUT,`catalog-classifier-v2-all-${stamp}.csv`), safePath=path.join(OUT,`catalog-classifier-v2-safe-changes-${stamp}.csv`), reviewPath=path.join(OUT,`catalog-classifier-v2-review-${stamp}.csv`), riskPath=path.join(OUT,`catalog-classifier-v2-page-risk-${stamp}.csv`), summaryPath=path.join(OUT,`catalog-classifier-v2-summary-${stamp}.txt`);
writeCsv(allPath,rows);writeCsv(safePath,safe);writeCsv(reviewPath,review);writeCsv(riskPath,[...risk,...unknown]);

const lines=[];
lines.push("========== IUMATEC CATALOG CLASSIFIER V2 ==========","MODO: DRY RUN — NENHUM produto foi alterado.","",`SKUs únicos analisados: ${rows.length}`,`Classificados e já corretos: ${clean.length}`,`Mudanças seguras propostas: ${safe.length}`,`Revisão manual: ${review.length}`,`Sem regra forte / manter: ${keep.length}`,`Contaminações certas em páginas principais: ${risk.length}`,`Casos não classificados em páginas principais: ${unknown.length}`,"","=== TOP PRODUCT TYPES ===");
for(const [k,n] of grouped(rows.filter(r=>r.product_type!=="unclassified"),r=>r.product_type).slice(0,30)) lines.push(`${String(n).padStart(6)} | ${k}`);
lines.push("","=== TOP MUDANÇAS SEGURAS ===");
for(const [k,n] of grouped(safe,r=>`${r.old_category} > ${r.old_subcategory} => ${r.proposed_category} > ${r.proposed_subcategory}`).slice(0,30)) lines.push(`${String(n).padStart(6)} | ${k}`);
lines.push("","=== RISCO NAS PÁGINAS PRINCIPAIS ===");
for(const [k,n] of grouped([...risk,...unknown],r=>`${r.old_category} > ${r.old_subcategory} | ${r.page_risk}`).slice(0,30)) lines.push(`${String(n).padStart(6)} | ${k}`);
lines.push("","=== AMOSTRA: MUDANÇAS SEGURAS ===");
for(const r of safe.slice(0,30)) lines.push(`${r.sku} | ${r.title}\n  ${r.old_category} > ${r.old_subcategory} => ${r.proposed_category} > ${r.proposed_subcategory} [${r.product_type} | ${r.confidence}]`);
lines.push("","=== AMOSTRA: RISCO DE PÁGINA ===");
for(const r of [...risk,...unknown].slice(0,30)) lines.push(`${r.sku} | ${r.title}\n  atual: ${r.old_category} > ${r.old_subcategory} | detectado: ${r.product_type} | risco=${r.page_risk}`);
lines.push("","Relatórios:",allPath,safePath,reviewPath,riskPath,"","IMPORTANTE: este V2 NÃO tem APPLY.","Primeiro reveja o relatório. Depois criamos o APPLY separado e protegido.");
fs.writeFileSync(summaryPath,lines.join("\n"),"utf8");
console.log("\n"+lines.join("\n")+"\n");
console.log(`Resumo: ${summaryPath}`);
console.log("DRY RUN V2 concluído. NENHUM produto foi alterado.");
