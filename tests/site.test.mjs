import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {places,searchPlaces,normalized} from "../assets/js/places.js";
import worker from "../worker/worker.js";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("airport and port search works and no records have invalid coordinates",()=>{
 assert.ok(places.some(p=>p.type==="air"));
 assert.ok(places.some(p=>p.type==="sea"));
 assert.ok(searchPlaces("air","DAAG").some(p=>p.code==="ALG"));
 assert.ok(searchPlaces("sea","ميناء").length>0);
 assert.equal(normalized("الجزائر"),normalized("إلجزائر"));
 for(const p of places){assert.ok(Math.abs(p.lat)<=90);assert.ok(Math.abs(p.lng)<=180);}
});
test("all site pages expose navigation and PWA manifest",()=>{
 for(const page of ["index.html","airports.html","ports.html","about.html","favorites.html","diagnostics.html"]){
  const html=read(page);
  assert.match(html,/<html lang="ar" dir="rtl">/);
  assert.match(html,/manifest\.webmanifest/);
  assert.match(html,/href="favorites\.html"/);
 }
});
test("static assets named in service worker precache exist",()=>{
 const sw=read("sw.js");
 const values=[...sw.matchAll(/"\.\/([^"]+)"/g)].map(match=>match[1]);
 for(const path of values){assert.ok(existsSync(new URL("../"+path,import.meta.url)),path);}
 assert.doesNotMatch(sw,/api\.adsb\.lol|aisstream\.io\/v0/);
});
test("diagnostic endpoints and safe defaults",()=>{
 const script=read("assets/js/diagnostics.js");
 assert.match(script,/api\/metar\?icao=DAAG/);
 assert.match(script,/upstream_enabled/);
 assert.match(read("assets/js/radar.js"),/airFailedUntil/);
});
test("marine stream key is never configured in frontend",()=>{
 const marine=read("assets/js/marine-config.js");
 assert.match(marine,/DZ_SEA_API = ""/);
 const relay=read("marine-relay/server.mjs");
 assert.match(relay,/process\.env\.AISSTREAM_API_KEY/);
 assert.match(relay,/15\*60\*1000/);
});
test("disabled aircraft upstream and worker input guards",async()=>{
 const env={UPSTREAM_ALLOWED:"false"},ctx={waitUntil(){}};
 const base="https://example.invalid";
 let r=await worker.fetch(new Request(base+"/health"),env,ctx);
 assert.equal(r.status,200);
 assert.equal((await r.json()).upstream_enabled,false);
 r=await worker.fetch(new Request(base+"/api/aircraft?lat=36.7&lon=3.2"),env,ctx);
 assert.equal(r.status,503);
 r=await worker.fetch(new Request(base+"/api/metar?icao=INVALID"),env,ctx);
 assert.equal(r.status,400);
});
