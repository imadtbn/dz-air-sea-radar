import {places,searchPlaces} from "./places.js";
const $=id=>document.getElementById(id);
const root=$("mapShell"),listing=$("referenceList"),search=$("mapSearch");
let map,api,markers=[],mode="both",active="",ready=false;
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
  map.once("load",()=>{ready=true;clearTimeout(watchdog);$("mapLoading").hidden=true;initMarkers();if(initial)focusPlace(initial,true);map.resize();});
  window.addEventListener("resize",()=>map.resize());
 }catch(err){console.error("Map initialization failed",err);$("mapLoading").hidden=true;$("mapError").hidden=false;}
}
start();