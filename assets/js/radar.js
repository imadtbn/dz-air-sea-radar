import {places,searchPlaces} from "./places.js";
import {createMarineRadar} from "./marine.js";
const $=id=>document.getElementById(id);
const root=$("mapShell"),listing=$("referenceList"),search=$("mapSearch");
let map,api,markers=[],mode="both",active="",ready=false,marine=null;
$("heroPlaceCount").textContent=places.length;
function notice(message){const node=$("geoMessage");node.textContent=message;node.hidden=false;clearTimeout(notice.timer);notice.timer=setTimeout(()=>node.hidden=true,4500);}
function entries(){
 const items=searchPlaces(mode,search.value); $("locationCount").textContent=items.length; listing.replaceChildren();
 if(!items.length){const p=document.createElement("p");p.className="empty-message";p.textContent="لا توجد نتائج مطابقة.";listing.append(p);return;}
 const fragment=document.createDocumentFragment();
 items.forEach(p=>{
   const b=document.createElement("button");b.type="button";b.className="reference-item "+(p.type==="sea"?"is-sea ":"")+(p.id===active?"is-selected":"");
   const icon=document.createElement("span");icon.className="reference-icon";icon.dataset.icon=p.type==="sea"?"ship":"plane";
   const t=document.createElement("span"),n=document.createElement("strong"),d=document.createElement("small");n.className="reference-name";n.textContent=p.name;d.className="reference-meta";d.textContent=p.city+" · "+p.code;t.append(n,d);
   b.append(icon,t);b.addEventListener("click",()=>focusPlace(p,true));fragment.append(b);
 });
 listing.append(fragment);window.renderSiteIcons?.(listing);
}
function changeMode(value){
 mode=value;document.querySelectorAll("[data-mode]").forEach(b=>{let yes=b.dataset.mode===value;b.classList.toggle("is-active",yes);b.setAttribute("aria-pressed",String(yes));});
 markers.forEach(({place,marker})=>{marker.getElement().style.display=(mode==="both"||place.type===mode)?"":"none";});
 entries();
 if(ready)renderFlights();
 marine?.setMode(value);
}
function popup(p){
 const div=document.createElement("div");div.dir="rtl";
 const label=document.createElement("span");label.className="popup-label";label.textContent=(p.type==="air"?"مطار":"ميناء")+" — موقع ثابت";
 const title=document.createElement("h3");title.textContent=p.name;
 const desc=document.createElement("p");desc.textContent=p.city+" · "+p.code+(p.secondaryCode?" / "+p.secondaryCode:"");
 const note=document.createElement("p");note.textContent="نقطة مرجعية وليست حركة حية.";
 const link=document.createElement("a");link.href=p.type==="air"?"airports.html":"ports.html";link.textContent="فتح الدليل ←";
 div.append(label,title,desc,note,link);return div;
}
function focusPlace(p,fly){
 active=p.id;if(mode!=="both"&&mode!==p.type)changeMode(p.type);entries();
 if(!ready){notice("الخريطة قيد التحميل.");return;}
 markers.forEach(x=>x.marker.getElement().classList.toggle("is-selected",x.place.id===p.id));
 if(fly)map.flyTo({center:[p.lng,p.lat],zoom:9,essential:true});
 const result=markers.find(x=>x.place.id===p.id);
 if(result&&!result.marker.getPopup().isOpen())result.marker.togglePopup();
}
function initMarkers(){
 markers=places.map(p=>{
 const e=document.createElement("button");e.type="button";e.className="poi-marker "+p.type;e.textContent=p.type==="air"?"✈":"⚓";e.title=p.name;e.setAttribute("aria-label",p.name);
 const marker=new api.Marker({element:e,anchor:"bottom"}).setLngLat([p.lng,p.lat]).setPopup(new api.Popup({offset:24,maxWidth:"280px"}).setDOMContent(popup(p))).addTo(map);
 e.addEventListener("click",()=>{active=p.id;entries();markers.forEach(x=>x.marker.getElement().classList.toggle("is-selected",x.place.id===active));});
 return {place:p,marker};
 });changeMode(mode);
}
function expanded(off){
 const on=off?false:!root.classList.contains("is-expanded");root.classList.toggle("is-expanded",on);document.body.classList.toggle("map-fullscreen",on);
 const button=$("fullscreenButton");button.setAttribute("aria-label",on?"إغلاق ملء الشاشة":"تكبير الخريطة");button.innerHTML='<span data-icon="'+(on?"minimize":"maximize")+'"></span>';window.renderSiteIcons?.(button);requestAnimationFrame(()=>map?.resize());
}
function controls(){
 document.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>changeMode(b.dataset.mode)));
 search.addEventListener("input",entries);
 $("worldView").addEventListener("click",()=>map?.flyTo({center:[12,24],zoom:1.5,essential:true}));
 $("algeriaView").addEventListener("click",()=>map?.flyTo({center:[2.8,33.7],zoom:4.8,essential:true}));
 $("zoomIn").addEventListener("click",()=>map?.zoomIn());$("zoomOut").addEventListener("click",()=>map?.zoomOut());
 $("fullscreenButton").addEventListener("click",()=>expanded(false));
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&root.classList.contains("is-expanded"))expanded(true);});
 $("locateButton").addEventListener("click",()=>{
  if(!ready){notice("الخريطة غير جاهزة.");return;}
  if(!navigator.geolocation){notice("خدمة تحديد الموقع غير متوفرة.");return;}
  navigator.geolocation.getCurrentPosition(p=>{map.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:10,essential:true});notice("تم الانتقال إلى موقعك التقريبي.");},
  e=>notice(e.code===1?"تم رفض إذن تحديد الموقع.":"تعذر تحديد الموقع، حاول مجددًا."),{enableHighAccuracy:false,timeout:12000,maximumAge:120000});
 });
 $("retryMap").addEventListener("click",()=>location.reload());
}
async function start(){
 controls();entries();
 const target=new URLSearchParams(location.search).get("place");
 const initial=places.find(p=>p.id===target);
 if(initial){active=initial.id;changeMode(initial.type);}
 try {
  api=await import("https://unpkg.com/maplibre-gl@6.13.0/dist/maplibre-gl.mjs");
  map=new api.Map({container:"map",style:"https://tiles.openfreemap.org/styles/liberty",center:[2.8,33.7],zoom:4.8,minZoom:1.1,maxZoom:17});
  const watchdog=setTimeout(()=>{if(!ready){$("mapLoading").hidden=true;$("mapError").hidden=false;}},18000);
  map.once("load",()=>{ready=true;clearTimeout(watchdog);$("mapLoading").hidden=true;initMarkers();marine=createMarineRadar({map,lib:api});marine.setMode(mode);initAirRadar();if(initial)focusPlace(initial,true);map.resize();});
  window.addEventListener("resize",()=>map.resize());
 }catch(err){console.error("Map initialization failed",err);$("mapLoading").hidden=true;$("mapError").hidden=false;}
}
start();
// Phase 2: live observed aircraft. No fabricated tracks; fetch is throttled per tab.
// ADSB.lol radius endpoint uses nautical miles. Browser requests require upstream CORS.
const aircraftMarkers=new Map();let aircraft=[],lastFetch=0,airSeq=0,airFailedUntil=0;
const AIR_URL="https://api.adsb.lol/v2/lat/";
const num=v=>typeof v==="number"&&Number.isFinite(v);
const speed=v=>num(v)?Math.round(v*1.852)+" كم/سا":"غير متاح";
const height=v=>v==="ground"?"على الأرض":num(v)?Math.round(v*0.3048)+" م":"غير متاح";
const bearing=v=>num(v)?Math.round((v+360)%360)+"°":"غير متاح";
function flightCard(p){
 const box=document.createElement("div");box.className="flight-popup";box.dir="rtl";
 const title=document.createElement("h3");title.textContent=p.flight||p.hex;
 const subtitle=document.createElement("p");subtitle.textContent="ADS-B.lol · "+p.hex.toUpperCase();
 box.append(title,subtitle);
 [["السرعة",speed(p.gs)],["الارتفاع",height(p.alt_baro??p.alt_geom)],["الاتجاه",bearing(p.track)],["آخر رصد",Math.round(p.seen)+" ثانية"]].forEach(([name,value])=>{
 const line=document.createElement("div");line.className="flight-line";
 const a=document.createElement("span"),b=document.createElement("strong");a.textContent=name;b.textContent=value;line.append(a,b);box.append(line);
 });
 const note=document.createElement("small");note.textContent="رصد تقريبي، لا يصلح للملاحة.";box.append(note);return box;
}
function renderFlights(){
 const visible=$("airVisibility").checked&&mode!=="sea";
 const ids=new Set();
 for(const p of aircraft){
  ids.add(p.hex);let item=aircraftMarkers.get(p.hex);
  if(!item){
   const el=document.createElement("button");el.className="aircraft-marker";el.type="button";el.textContent="✈";el.title=p.flight||p.hex;
   const marker=new api.Marker({element:el,anchor:"center"}).setLngLat([p.lon,p.lat]).addTo(map);
   item={marker,p};aircraftMarkers.set(p.hex,item);
   el.addEventListener("click",()=>{const current=aircraftMarkers.get(p.hex);if(current){current.marker.setPopup(new api.Popup({offset:22}).setDOMContent(flightCard(current.p)));current.marker.togglePopup();}});
  }
  item.p=p;item.marker.setLngLat([p.lon,p.lat]);
  const node=item.marker.getElement();node.style.display=visible?"":"none";
  node.style.setProperty("--air-bearing",num(p.track)?((p.track+360)%360)+"deg":"0deg");
 }
 for(const [id,item] of aircraftMarkers){if(!ids.has(id)){item.marker.remove();aircraftMarkers.delete(id);}}
 $("airCount").textContent=String(aircraft.length);$("airResults").replaceChildren();
 if(!aircraft.length){$("airResults").textContent="لا توجد طائرات بموقع حديث متاح.";return;}
 for(const p of aircraft.slice(0,35)){
  const b=document.createElement("button");b.className="flight-result";b.type="button";
  const name=document.createElement("strong");name.textContent=p.flight||p.hex.toUpperCase();
  const detail=document.createElement("small");detail.textContent=speed(p.gs)+" · "+height(p.alt_baro??p.alt_geom);
  b.append(name,detail);b.addEventListener("click",()=>{
   map.flyTo({center:[p.lon,p.lat],zoom:Math.max(7,map.getZoom()),essential:true});
   const m=aircraftMarkers.get(p.hex)?.marker;if(m){m.setPopup(new api.Popup({offset:22}).setDOMContent(flightCard(p)));m.togglePopup();}
  });$("airResults").append(b);
 }
}
function showAirStatus(message,ok=false){
 $("airStatusText").textContent=message;$("airSummary").textContent=message;
 $("airStatus").querySelector(".status-dot").className="status-dot "+(ok?"air-online":"amber");
}
async function refreshFlights(){
 if(!ready||document.hidden||mode==="sea"||!$("airVisibility").checked)return;
 if(Date.now()<airFailedUntil)return;
 if(Date.now()-lastFetch<60000)return;lastFetch=Date.now();
 const id=++airSeq,center=map.getCenter();
 if(Math.abs(center.lat)>89)return;
 showAirStatus("جارٍ جلب الرصد حول مركز الخريطة…");
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const gateway=window.DZ_AIR_API || "";
  const url=gateway ? gateway+"?lat="+encodeURIComponent(center.lat.toFixed(3))+"&lon="+encodeURIComponent(center.lng.toFixed(3)) : AIR_URL+center.lat.toFixed(3)+"/lon/"+center.lng.toFixed(3)+"/dist/250";
  const response=await fetch(url,{signal:controller.signal,cache:"no-store",headers:{Accept:"application/json"}});
  if(!response.ok){
   if(response.status===503){const detail=await response.json().catch(()=>({}));if(detail.error==="UPSTREAM_NOT_AUTHORIZED")throw Error("UPSTREAM_NOT_AUTHORIZED");}
   throw Error("ADS-B HTTP "+response.status);
  }
  const payload=await response.json();if(id!==airSeq)return;
  if(!Array.isArray(payload.ac))throw Error("Invalid ADS-B payload");
  airFailedUntil=0;
  aircraft=payload.ac.filter(p=>typeof p.hex==="string"&&num(p.lat)&&num(p.lon)&&num(p.seen_pos??p.seen)&&(p.seen_pos??p.seen)<=120&&(p.seen_pos??p.seen)>=0).slice(0,350).map(p=>({...p,flight:String(p.flight||"").trim().slice(0,20),seen:p.seen_pos??p.seen}));
  renderFlights();
  $("airUpdated").textContent="آخر جلب: "+new Date().toLocaleTimeString("ar-DZ");
  showAirStatus("رُصدت "+aircraft.length+" طائرة ضمن 250 ميلًا بحريًا من مركز الخريطة",true);
 }catch(error){
  if(id!==airSeq)return;
  aircraft=[];renderFlights();$("airCount").textContent="—";
  airFailedUntil=Date.now()+5*60*1000;
  showAirStatus(error.message==="UPSTREAM_NOT_AUTHORIZED"?"الرادار الجوي متوقف إلى حين السماح بالاستخدام العام من مزوّد ADS-B.":"تعذر الاتصال بمصدر الطائرات؛ أوقفنا المحاولات التلقائية 5 دقائق لحماية الخدمة. راجع فحص الاتصال.");
  console.warn(error);
 }finally{clearTimeout(timeout);}
}
function initAirRadar(){
 $("airRefresh").addEventListener("click",refreshFlights);
 $("airVisibility").addEventListener("change",()=>{renderFlights();if($("airVisibility").checked)refreshFlights();});
 map.on("moveend",refreshFlights);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshFlights();});
 setInterval(refreshFlights,60000);refreshFlights();
}
