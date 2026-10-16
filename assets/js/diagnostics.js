/* Self-service connectivity diagnostic. No automatic request to ADSB.lol/AISStream. */
const airWorker="https://dz-air-sea-aircraft-api.imadtbn-prayer.workers.dev";
const byId=id=>document.getElementById(id);
const results=byId("diagnosticsResults");
const probes=[
 {id:"browser",title:"دعم WebGL والخريطة",run:async()=>{
   const canvas=document.createElement("canvas");
   const gl=canvas.getContext("webgl2")||canvas.getContext("webgl");
   if(!gl)throw Error("متصفحك لا يدعم WebGL أو تم تعطيله");
   return "WebGL متاح — تحقق من الخريطة التفاعلية بشكل منفصل.";
 }},
 {id:"pwa",title:"قابلية عمل PWA",run:async()=>{
   if(!("serviceWorker" in navigator))throw Error("Service Worker غير مدعوم");
   const registration=await navigator.serviceWorker.register("./sw.js");
   if(!registration)throw Error("تعذر إنشاء تسجيل Service Worker.");
   if(!registration.active && !registration.waiting)return "تم بدء تسجيل PWA، وما تزال الملفات الثابتة قيد التهيئة. أعد الفحص.";
   return "خدمة الملفات الثابتة مسجلة. تثبيت التطبيق يتوقف على المتصفح وشروطه.";
 }},
 {id:"storage",title:"تخزين المفضلة",run:async()=>{
   const key="dz-radar-storage-test";
   localStorage.setItem(key,"ok");
   const value=localStorage.getItem(key);localStorage.removeItem(key);
   if(value!=="ok")throw Error("التخزين المحلي غير متاح");
   return "حفظ البيانات على هذا الجهاز متاح.";
 }},
 {id:"worker",title:"اتصال Cloudflare Worker",run:async()=>{
   const result=await getJSON(airWorker+"/health");
   if(result.status!=="ready")throw Error("رد غير متوقع من وسيط API");
   return result.upstream_enabled===true?"الخدمة تعمل، والاتصال بالمصدر مفعّل (تحقق من ترخيص الاستخدام).":"الخدمة تعمل، لكن إعادة بث ADS-B معطلة لحين الإذن.";
 }},
 {id:"weather",title:"بيانات METAR — مطار الجزائر",run:async()=>{
   const result=await getJSON(airWorker+"/api/metar?icao=DAAG");
   if(result.icao!=="DAAG")throw Error("رد ICAO غير متوقع");
   return result.available? "وصل تقرير حقيقي من Aviation Weather Center؛ وقت الرصد: "+String(result.reportTime||"غير متاح"):
    "API متصل، لكن لا يوجد تقرير METAR حديث متاح حاليًا.";
 }},
 {id:"air",title:"حالة مصدر الطائرات",run:async()=>{
   const result=await getJSON(airWorker+"/health");
   if(result.upstream_enabled!==true)return "الاتصال ADS-B غير مفعّل في الوسيط. لا يعني ذلك أن هناك طائرات على الخريطة.";
   return "الاتصال مفعّل؛ يلزم اختبار عينة حقيقية قبل إعلان اكتمال الرادار.";
 }},
 {id:"marine",title:"حالة استقبال AIS",run:async()=>{
   const url=typeof window.DZ_SEA_API==="string"?window.DZ_SEA_API.trim():"";
   if(!url)return "غير مفعّل: يلزم عنوان مستقبل AIS ومفتاحه السري على الخادم.";
   const result=await getJSON(url);
   if(!Array.isArray(result.vessels))throw Error("رد AIS غير متوافق");
   return (result.status==="connected"?"متصل":"غير متصل")+"؛ السفن ذات الرصد الحديث: "+result.vessels.length;
 }}
];
async function getJSON(url){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);
 try{const r=await fetch(url,{signal:controller.signal,cache:"no-store",headers:{"Accept":"application/json"}});
  if(!r.ok)throw Error("HTTP "+r.status+(r.status===403?" — الاتصال محجوب":r.status===503?" — الخدمة غير مفعّلة":""));
  return await r.json();
 }finally{clearTimeout(timeout);}
}
function statusNode(test){
 const article=document.createElement("article");article.className="diagnostic-item";article.dataset.testId=test.id;
 const heading=document.createElement("h3");heading.textContent=test.title;
 const status=document.createElement("p");status.className="diagnostic-message";status.textContent="لم يُفحص بعد.";
 article.append(heading,status);results.append(article);
 return {article,status};
}
const rows=new Map(probes.map(p=>[p.id,statusNode(p)]));
async function runTests(){
 const start=byId("runDiagnostics");start.disabled=true;start.textContent="جارٍ الفحص…";
 for(const p of probes){
  const {article,status}=rows.get(p.id);
  article.dataset.state="busy";status.textContent="جارٍ الاتصال…";
  try{const message=await p.run();article.dataset.state=(p.id==="air"&&message.startsWith("الاتصال ADS-B غير"))||(p.id==="marine"&&message.startsWith("غير مفعّل"))||(p.id==="pwa"&&message.startsWith("تم بدء تسجيل PWA"))?"pending":"ok";status.textContent=message;}
  catch(e){article.dataset.state="error";status.textContent="تعذر الفحص: "+(e.name==="AbortError"?"انتهت مهلة الاتصال":e.message||"خطأ غير معروف");}
 }
 start.disabled=false;start.textContent="إعادة الفحص";
 byId("checkedAt").textContent="آخر فحص: "+new Date().toLocaleString("ar-DZ");
}
byId("runDiagnostics").addEventListener("click",runTests);
runTests();
