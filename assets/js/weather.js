/* METAR UI — fetched from the configured Cloudflare Weather endpoint.
 * No flight safety use; stations without an observation show "غير متاح". */
const METAR_BASE="https://dz-air-sea-aircraft-api.imadtbn-prayer.workers.dev/api/metar";
function datum(value,suffix=""){return typeof value==="number"&&Number.isFinite(value)?Math.round(value*10)/10+suffix:"غير متاح";}
export async function showAirportWeather(icao,name){
 if(!/^[A-Z]{4}$/.test(icao||""))return;
 let dialog=document.getElementById("airportWeatherDialog");
 if(!dialog){
  dialog=document.createElement("dialog");dialog.id="airportWeatherDialog";dialog.className="weather-dialog";
  document.body.append(dialog);
 }
 dialog.replaceChildren();
 const close=document.createElement("button");close.type="button";close.className="weather-close";close.textContent="إغلاق ×";close.addEventListener("click",()=>dialog.close());
 const h=document.createElement("h2");h.textContent="الطقس الجوي · "+name;
 const p=document.createElement("p");p.textContent="جارٍ جلب أحدث تقرير METAR المتاح للمطار…";
 dialog.append(close,h,p);
 try{if(!dialog.open)dialog.showModal();}catch{dialog.setAttribute("open","");}
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
 dialog.addEventListener("close",()=>controller.abort(),{once:true});
 try{
  const response=await fetch(METAR_BASE+"?icao="+encodeURIComponent(icao),{signal:controller.signal,headers:{accept:"application/json"}});
  if(!response.ok)throw Error("HTTP "+response.status);
  const weather=await response.json();
  if(!dialog.open)return;
  p.textContent=weather.available?"البيانات من Aviation Weather Center — للاطلاع العام فقط.":"لا يوجد تقرير METAR حديث متاح لهذا المطار.";
  if(!weather.available)return;
  const table=document.createElement("dl");table.className="weather-rows";
  const when=weather.reportTime?new Date(weather.reportTime).toLocaleString("ar-DZ"):"غير متاح";
  [["رمز المطار",icao],["تاريخ الرصد",when],["الحرارة",datum(weather.temperatureC," °C")],["اتجاه الرياح",datum(weather.windDirection,"°")],["سرعة الرياح",datum(weather.windKnots," عقدة")],["الرؤية الأفقية",weather.visibilitySM||"غير متاح"],["تصنيف الطيران",weather.flightCategory||"غير متاح"]].forEach(([k,v])=>{
    const row=document.createElement("div"),dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=k;dd.textContent=v;row.append(dt,dd);table.append(row);
  });
  dialog.append(table);
  if(weather.rawMetar){
   const raw=document.createElement("pre");raw.textContent=weather.rawMetar;raw.className="weather-raw";dialog.append(raw);
  }
  const credit=document.createElement("p");credit.className="weather-credit";credit.textContent="تقرير METAR قد يتأخر أو يغيب؛ لا يعتمد عليه للملاحة التشغيلية.";dialog.append(credit);
 }catch(error){if(dialog.open)p.textContent="تعذر جلب تقرير METAR من المصدر. حاول لاحقًا.";console.warn("METAR",error);}
 finally{clearTimeout(timeout);}
}
