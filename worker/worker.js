/** DZ Air & Sea Radar — permission-gated aviation API cache.
 * Do not enable UPSTREAM_ALLOWED until permission for production reuse is confirmed.
 * On free plan, Cache API may be region-local and not a shared global cache.
 */
const ORIGIN = "https://imadtbn.github.io";
const UPSTREAM = "https://api.adsb.lol/v2/lat";
const json=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","access-control-allow-origin":ORIGIN,"x-content-type-options":"nosniff",...extra}});
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url),origin=request.headers.get("origin");
  const cors={"access-control-allow-origin":ORIGIN,"vary":"Origin"};
  if(origin&&origin!==ORIGIN)return json({error:"Origin not allowed"},403);
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{...cors,"access-control-allow-methods":"GET, OPTIONS","access-control-allow-headers":"Accept","access-control-max-age":"600"}});
  if(request.method!=="GET")return json({error:"Method not allowed"},405,{allow:"GET, OPTIONS"});
  if(url.pathname==="/health")return json({status:"ready",upstream_enabled:env.UPSTREAM_ALLOWED==="true"});

  if(url.pathname==="/api/metar"){
    const code=(url.searchParams.get("icao")||"").toUpperCase();
    const supported=new Set(["DAAG","DAOO","DABC","DABB","DAAE","DAON"]);
    if(!supported.has(code))return json({error:"Unsupported ICAO code"},400);
    const cacheKey=new Request(new URL("/cache/metar?icao="+code,request.url));
    const cachedWeather=await caches.default.match(cacheKey);
    if(cachedWeather){
      const headers=new Headers(cachedWeather.headers);headers.set("x-cache-state","HIT");
      return new Response(cachedWeather.body,{status:cachedWeather.status,headers});
    }
    try{
      const upstreamUrl="https://aviationweather.gov/api/data/metar?ids="+code+"&format=json";
      const response=await fetch(upstreamUrl,{headers:{accept:"application/json","user-agent":"DZAirSeaRadar/1.0 (+https://imadtbn.github.io/dz-air-sea-radar/)"}});
      if(response.status===204)return json({icao:code,available:false,source:"Aviation Weather Center",message:"No recent METAR available."},200);
      if(!response.ok)return json({error:"Weather source unavailable",status:response.status},502);
      const body=await response.json();
      if(!Array.isArray(body)||body.length===0)return json({icao:code,available:false,source:"Aviation Weather Center"},200);
      const m=body.find(v=>v.icaoId===code)||body[0];
      const str=v=>typeof v==="string"?v.slice(0,400):null;
      const val=v=>typeof v==="number"&&Number.isFinite(v)?v:null;
      const weather={
        icao:code,available:true,source:"Aviation Weather Center",fetchedAt:new Date().toISOString(),
        reportTime:typeof m.obsTime==="number"?new Date(m.obsTime*1000).toISOString():str(m.reportTime||m.obsTime),
        temperatureC:val(m.temp),windDirection:val(m.wdir),windKnots:val(m.wspd),
        visibilitySM:str(String(m.visib??"")),flightCategory:str(m.fltCat),rawMetar:str(m.rawOb)
      };
      const headers={"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=600","access-control-allow-origin":ORIGIN,"x-cache-state":"MISS","x-content-type-options":"nosniff"};
      const result=new Response(JSON.stringify(weather),{headers});
      ctx.waitUntil(caches.default.put(cacheKey,result.clone()));
      return result;
    }catch(e){return json({error:"Weather fetch failed",message:"Unable to retrieve observation."},502);}
  }
  if(url.pathname!=="/api/aircraft")return json({error:"Not found"},404);
  if(env.UPSTREAM_ALLOWED!=="true")return json({error:"UPSTREAM_NOT_AUTHORIZED",message:"Upstream relay disabled pending provider permission."},503);
  const rawLat=Number(url.searchParams.get("lat")),rawLon=Number(url.searchParams.get("lon"));
  if(!Number.isFinite(rawLat)||!Number.isFinite(rawLon)||Math.abs(rawLat)>85||Math.abs(rawLon)>180||!url.searchParams.has("lat")||!url.searchParams.has("lon"))return json({error:"Invalid lat/lon"},400);
  // Quantizing geo inputs reduces distinct cache keys and limits origin load.
  const lat=Math.round(rawLat*4)/4,lon=Math.round(rawLon*4)/4,radius=250;
  const upstream=UPSTREAM+"/"+lat.toFixed(2)+"/lon/"+lon.toFixed(2)+"/dist/"+radius;
  const key=new Request(new URL("/cache/aircraft?lat="+lat+"&lon="+lon,request.url),{method:"GET"});
  const cache=caches.default;
  const cached=await cache.match(key);
  if(cached){
   const h=new Headers(cached.headers);h.set("access-control-allow-origin",ORIGIN);h.set("x-cache-state","HIT");
   return new Response(cached.body,{status:cached.status,headers:h});
  }
  const response=await fetch(upstream,{headers:{"accept":"application/json"},cf:{cacheTtl:60,cacheEverything:true}});
  if(!response.ok)return json({error:"Upstream unavailable",status:response.status},502);
  const payload=await response.json();
  if(!Array.isArray(payload.ac))return json({error:"Invalid upstream response"},502);
  const sanitized={now:typeof payload.now==="number"?payload.now:Math.round(Date.now()/1000),ac:payload.ac.slice(0,2500).filter(a=>typeof a.hex==="string"&&Number.isFinite(a.lat)&&Number.isFinite(a.lon)).map(a=>({
   hex:a.hex,flight:typeof a.flight==="string"?a.flight.slice(0,20):"",lat:a.lat,lon:a.lon,
   gs:typeof a.gs==="number"?a.gs:null,alt_baro:typeof a.alt_baro==="number"||a.alt_baro==="ground"?a.alt_baro:null,
   alt_geom:typeof a.alt_geom==="number"?a.alt_geom:null,track:typeof a.track==="number"?a.track:null,
   seen:typeof a.seen==="number"?a.seen:null,seen_pos:typeof a.seen_pos==="number"?a.seen_pos:null
  }))};
  const headers={"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=60","access-control-allow-origin":ORIGIN,"x-cache-state":"MISS","x-content-type-options":"nosniff"};
  const result=new Response(JSON.stringify(sanitized),{headers});
  ctx.waitUntil(cache.put(key,result.clone()));
  return result;
 }
};