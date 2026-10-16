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
  if(url.pathname==="/health")return json({status:"ready",upstream_enabled:env.UPSTREAM_ALLOWED==="true",providers:{adsblol:env.UPSTREAM_ALLOWED==="true",adsbfi:env.ADSBFI_ALLOWED==="true"},cache_ttl_seconds:60});

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
  const primaryAllowed=env.UPSTREAM_ALLOWED==="true";
  const fallbackAllowed=env.ADSBFI_ALLOWED==="true";
  if(!primaryAllowed&&!fallbackAllowed)return json({
    error:"UPSTREAM_NOT_AUTHORIZED",
    message:"Public aircraft forwarding disabled pending source permissions.",
    providers:{adsblol:false,adsbfi:false}
  },503);
  const queryLat=url.searchParams.get("lat"),queryLon=url.searchParams.get("lon");
  if(queryLat===null||queryLon===null||queryLat.trim()===""||queryLon.trim()==="")return json({error:"Invalid lat/lon"},400);
  const rawLat=Number(queryLat),rawLon=Number(queryLon);
  if(!Number.isFinite(rawLat)||!Number.isFinite(rawLon)||Math.abs(rawLat)>85||Math.abs(rawLon)>180)return json({error:"Invalid lat/lon"},400);
  // Geo bucketing reduces unique upstream requests; radius remains at most 250 NM.
  const lat=Math.round(rawLat*4)/4,lon=Math.round(rawLon*4)/4,radius=250;
  const permissions=(primaryAllowed?"p1":"p0")+(fallbackAllowed?"f1":"f0");
  const cacheKey=new Request(new URL("/cache/aircraft?lat="+lat+"&lon="+lon+"&policy="+permissions,request.url));
  const cached=await caches.default.match(cacheKey);
  if(cached){
    const headers=new Headers(cached.headers);headers.set("access-control-allow-origin",ORIGIN);headers.set("vary","Origin");headers.set("x-cache-state","HIT");
    return new Response(cached.body,{status:cached.status,headers});
  }
  const providers=[
    {id:"adsb.lol",allowed:primaryAllowed,license:"ODbL 1.0",attribution:"https://www.adsb.lol/",
      endpoint:"https://api.adsb.lol/v2/lat/"+lat.toFixed(2)+"/lon/"+lon.toFixed(2)+"/dist/"+radius},
    {id:"adsb.fi",allowed:fallbackAllowed,license:"Personal non-commercial — verify public redisplay permission",
      attribution:"https://adsb.fi/",
      endpoint:"https://opendata.adsb.fi/api/v3/lat/"+lat.toFixed(2)+"/lon/"+lon.toFixed(2)+"/dist/"+radius}
  ];
  let providerError="SOURCE_UNAVAILABLE";
  for(const provider of providers){
    if(!provider.allowed)continue;
    // Fallback is only attempted on an upstream outage, throttling or timeout.
    // Do not bypass authentication, usage restrictions or invalid request responses.
    const abort=new AbortController();
    const timer=setTimeout(()=>abort.abort(),6500);
    try{
      const upstream=await fetch(provider.endpoint,{headers:{accept:"application/json"},signal:abort.signal});
      if(!upstream.ok){
        providerError=upstream.status===429?"UPSTREAM_RATE_LIMIT":"UPSTREAM_HTTP_"+upstream.status;
        if(upstream.status<500&&upstream.status!==429)break;
        continue;
      }
      const input=await upstream.json();
      if(!input||!Array.isArray(input.ac)){
        providerError="INVALID_UPSTREAM_PAYLOAD";
        continue;
      }
      const fetchedAt=Math.round(Date.now()/1000);
      const upstreamNow=Number(input.now);
      const asOf=Number.isFinite(upstreamNow)&&upstreamNow>0&&upstreamNow<=fetchedAt+60?upstreamNow:fetchedAt;
      if(fetchedAt-asOf>300){providerError="STALE_UPSTREAM_PAYLOAD";continue;}
      const aircraft=[];
      for(const a of input.ac.slice(0,2500)){
        if(typeof a.hex!=="string"||a.hex.length>24||!Number.isFinite(a.lat)||!Number.isFinite(a.lon)||
          Math.abs(a.lat)>90||Math.abs(a.lon)>180)continue;
        const seenPos=Number.isFinite(a.seen_pos)?a.seen_pos:a.seen;
        if(!Number.isFinite(seenPos)||seenPos<0||seenPos>180)continue;
        aircraft.push({
          hex:a.hex,flight:typeof a.flight==="string"?a.flight.trim().slice(0,20):"",
          lat:a.lat,lon:a.lon,
          gs:Number.isFinite(a.gs)?a.gs:null,
          alt_baro:Number.isFinite(a.alt_baro)||a.alt_baro==="ground"?a.alt_baro:null,
          alt_geom:Number.isFinite(a.alt_geom)?a.alt_geom:null,
          track:Number.isFinite(a.track)?a.track:null,
          seen:seenPos,seen_pos:seenPos
        });
      }
      const data={
        now:asOf,retrievedAt:fetchedAt,
        source:provider.id,attribution:provider.attribution,license:provider.license,
        radiusNm:radius,ac:aircraft
      };
      const response=new Response(JSON.stringify(data),{
        headers:{"content-type":"application/json; charset=utf-8",
          "cache-control":"public, max-age=60","access-control-allow-origin":ORIGIN,
          "vary":"Origin","x-cache-state":"MISS","x-content-type-options":"nosniff"}
      });
      ctx.waitUntil(caches.default.put(cacheKey,response.clone()));
      return response;
    }catch(err){
      providerError=err?.name==="AbortError"?"UPSTREAM_TIMEOUT":"UPSTREAM_NETWORK_ERROR";
    }finally{clearTimeout(timer);}
  }
  return json({error:"AIRCRAFT_SOURCE_UNAVAILABLE",reason:providerError,
    message:"Configured aircraft sources currently unavailable."},502);
 }
};
