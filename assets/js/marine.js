/* Phase 3 — AIS marine observation from an authorized user-operated relay.
   No browser AISStream connection, no embedded keys and no simulated vessels. */
const valid=n=>typeof n==="number"&&Number.isFinite(n);
const fmt=(n,dec=0)=>valid(n)?n.toLocaleString("ar-DZ",{maximumFractionDigits:dec}):"غير متاح";
const escapeName=v=>typeof v==="string"?v.trim().slice(0,90):"";
export function createMarineRadar({map,lib}){
 const $=id=>document.getElementById(id);
 const status=$("seaStatusText"),count=$("seaCount"),last=$("seaUpdated"),resultList=$("seaResults");
 const refreshButton=$("seaRefresh"),dashboard=$("seaDashboard"),modeBox=$("seaStatus");
 const endpoint=typeof window.DZ_SEA_API==="string"?window.DZ_SEA_API.trim():"";
 const marks=new Map();
 let list=[],currentMode="both",lastFetch=0,loading=false;
 const setStatus=(value,ok=false)=>{status.textContent=value;modeBox?.classList.toggle("online",ok);};
 const popup=v=>{
  const el=document.createElement("div");el.dir="rtl";el.className="marine-popup";
  const h=document.createElement("h3");h.textContent=v.name||"سفينة "+v.mmsi;el.append(h);
  const p=document.createElement("p");p.textContent="MMSI "+v.mmsi;el.append(p);
  [["السرعة",valid(v.sog)?fmt(v.sog*1.852,1)+" كم/سا":"غير متاح"],["الاتجاه",valid(v.cog)?fmt(v.cog)+"°":"غير متاح"],["الوجهة",v.destination||"غير معروفة"],["آخر رصد",new Date(v.receivedAt).toLocaleString("ar-DZ")]].forEach(([label,value])=>{
   const row=document.createElement("div");row.className="flight-line";
   const a=document.createElement("span");a.textContent=label;const b=document.createElement("strong");b.textContent=value;row.append(a,b);el.append(row);
  });
  const s=document.createElement("small");s.textContent="بيانات AIS غير مضمونة التغطية أو الدقة وليست للملاحة.";el.append(s);return el;
 };
 function selectVessel(id){
  const selected=marks.get(id);if(!selected)return;
  map.flyTo({center:[selected.v.lon,selected.v.lat],zoom:Math.max(map.getZoom(),8),essential:true});
  const marker=selected.marker;
  marker.setPopup(new lib.Popup({offset:23,maxWidth:"320px"}).setDOMContent(popup(selected.v)));
  marker.togglePopup();
 }
 function render(){
  const ids=new Set();
  for(const v of list){
   ids.add(v.mmsi);let item=marks.get(v.mmsi);
   if(!item){
    const e=document.createElement("button");e.className="vessel-marker";e.type="button";e.title=v.name||v.mmsi;e.textContent="⛴";
    e.setAttribute("aria-label","سفينة "+(v.name||v.mmsi));
    const marker=new lib.Marker({element:e}).setLngLat([v.lon,v.lat]).addTo(map);
    e.addEventListener("click",()=>selectVessel(v.mmsi));
    item={marker,v};marks.set(v.mmsi,item);
   }
   item.v=v;item.marker.setLngLat([v.lon,v.lat]);item.marker.getElement().style.display=currentMode==="air"?"none":"";
  }
  for(const [id,item] of marks)if(!ids.has(id)){item.marker.remove();marks.delete(id);}
  count.textContent=String(list.length);
  resultList.replaceChildren();
  if(!list.length){resultList.textContent="لا توجد مواقع سفن حديثة متاحة.";return;}
  for(const v of list.slice(0,35)){
   const b=document.createElement("button");b.className="flight-result";b.type="button";
   const n=document.createElement("strong");n.textContent=v.name||v.mmsi;
   const s=document.createElement("small");s.textContent="MMSI "+v.mmsi+" · "+(valid(v.sog)?fmt(v.sog,1)+" عقدة":"السرعة غير متاحة");
   b.append(n,s);b.addEventListener("click",()=>selectVessel(v.mmsi));resultList.append(b);
  }
 }
 async function refresh(force=false){
  if(!endpoint){setStatus("البث البحري غير مفعّل؛ يلزم مفتاح AIS وخادم استقبال.");return;}
  if(document.hidden||loading||currentMode==="air")return;
  if(Date.now()-lastFetch<60000)return;
  lastFetch=Date.now();loading=true;refreshButton.disabled=true;setStatus("جارٍ التحقق من مواقع السفن المرصودة…");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(endpoint,{headers:{Accept:"application/json"},signal:controller.signal,cache:"no-store"});
   if(!response.ok)throw new Error("HTTP "+response.status);
   const body=await response.json();
   if(!Array.isArray(body.vessels))throw Error("Invalid AIS snapshot");
   const now=Date.now();
   list=body.vessels.filter(v=>/^[0-9]{9}$/.test(String(v.mmsi))&&valid(v.lat)&&valid(v.lon)&&Math.abs(v.lat)<=90&&Math.abs(v.lon)<=180&&Number.isFinite(Date.parse(v.receivedAt))&&now-Date.parse(v.receivedAt)<=15*60*1000&&Date.parse(v.receivedAt)<=now+60000).map(v=>({...v,mmsi:String(v.mmsi),name:escapeName(v.name),destination:escapeName(v.destination)})).slice(0,1500);
   render();last.textContent="آخر تحديث: "+new Date().toLocaleTimeString("ar-DZ");
   setStatus(body.status==="connected"?"السفن المرصودة: "+list.length+" (آخر 15 دقيقة)":"الخادم متاح لكن بث AIS غير متصل حاليًا.",body.status==="connected");
  }catch(e){list=[];render();count.textContent="—";setStatus("تعذر استقبال بيانات السفن. تحقق من اتصال الخادم.");console.warn("Marine feed",e);}
  finally{clearTimeout(timer);loading=false;refreshButton.disabled=false;}
 }
 function setMode(mode){
  currentMode=mode;dashboard.hidden=mode!=="sea";
  for(const {marker} of marks.values())marker.getElement().style.display=mode==="air"?"none":"";
  if(mode!=="air")refresh();
 }
 refreshButton.addEventListener("click",()=>refresh(true));
 document.addEventListener("visibilitychange",()=>{if(!document.hidden&&currentMode==="sea")refresh();});
 setInterval(()=>{if(currentMode!=="air")refresh();},60000);
 if(!endpoint)setStatus("البث البحري قيد الإعداد. لا توجد مواقع سفن حية بعد.");
 return {setMode,refresh};
}
