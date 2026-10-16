import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/worker.js";

const endpoint="https://radar.example/api/aircraft?lat=36.7&lon=3.2";
const fixture=()=>({
 now:Math.round(Date.now()/1000),
 ac:[{hex:"0a1234",flight:"TEST123 ",lat:36.8,lon:3.1,gs:240,alt_baro:12000,track:82,seen:12,seen_pos:12}]
});
function setup(t,handle){
 const originalFetch=globalThis.fetch, originalCaches=globalThis.caches;
 const data=new Map(),calls=[];
 globalThis.caches={default:{
  async match(key){const r=data.get(key.url);return r?r.clone():undefined;},
  async put(key,response){data.set(key.url,response.clone());}
 }};
 globalThis.fetch=async(url)=>{calls.push(String(url));return handle(String(url),calls.length);};
 t.after(()=>{globalThis.fetch=originalFetch;globalThis.caches=originalCaches;});
 const pending=[];
 return {calls,pending,ctx:{waitUntil(p){pending.push(p);}},drain:async()=>Promise.all(pending)};
}
test("providers disabled by default: no origin fetch",async t=>{
 const x=setup(t,()=>{throw Error("Forbidden network access");});
 const response=await worker.fetch(new Request(endpoint),{UPSTREAM_ALLOWED:"false",ADSBFI_ALLOWED:"false"},x.ctx);
 assert.equal(response.status,503);
 assert.equal((await response.json()).error,"UPSTREAM_NOT_AUTHORIZED");
 assert.equal(x.calls.length,0);
 const status=await worker.fetch(new Request("https://radar.example/health"),{UPSTREAM_ALLOWED:"false",ADSBFI_ALLOWED:"false"},x.ctx);
 assert.deepEqual((await status.json()).providers,{adsblol:false,adsbfi:false});
});
test("primary succeeds, source and cache HIT are preserved",async t=>{
 const x=setup(t,()=>new Response(JSON.stringify(fixture()),{status:200}));
 const env={UPSTREAM_ALLOWED:"true",ADSBFI_ALLOWED:"false"};
 const a=await worker.fetch(new Request(endpoint),env,x.ctx);
 assert.equal(a.status,200);
 const value=await a.json();
 assert.equal(value.source,"adsb.lol");
 assert.equal(value.ac[0].flight,"TEST123");
 assert.equal(value.license,"ODbL 1.0");
 await x.drain();
 const b=await worker.fetch(new Request(endpoint),env,x.ctx);
 assert.equal(b.status,200);
 assert.equal(b.headers.get("x-cache-state"),"HIT");
 assert.equal(x.calls.length,1);
});
test("fallback to adsb.fi v3 after a 429",async t=>{
 const x=setup(t,url=>url.includes("api.adsb.lol")?new Response("limited",{status:429}):new Response(JSON.stringify(fixture()),{status:200}));
 const r=await worker.fetch(new Request(endpoint),{UPSTREAM_ALLOWED:"true",ADSBFI_ALLOWED:"true"},x.ctx);
 assert.equal(r.status,200);
 assert.equal((await r.json()).source,"adsb.fi");
 assert.equal(x.calls.length,2);
 assert.match(x.calls[1],/opendata\.adsb\.fi\/api\/v3\/lat\//);
});
test("fallback does not bypass a primary 403",async t=>{
 const x=setup(t,()=>new Response("denied",{status:403}));
 const r=await worker.fetch(new Request(endpoint),{UPSTREAM_ALLOWED:"true",ADSBFI_ALLOWED:"true"},x.ctx);
 assert.equal(r.status,502);
 assert.equal(x.calls.length,1);
});
test("only fallback can run when explicitly authorized",async t=>{
 const x=setup(t,()=>new Response(JSON.stringify(fixture()),{status:200}));
 const r=await worker.fetch(new Request(endpoint),{UPSTREAM_ALLOWED:"false",ADSBFI_ALLOWED:"true"},x.ctx);
 assert.equal(r.status,200);
 assert.equal((await r.json()).source,"adsb.fi");
 assert.equal(x.calls.length,1);
 assert.match(x.calls[0],/opendata\.adsb\.fi/);
});
test("invalid input and cross-origin requests are blocked",async t=>{
 const x=setup(t,()=>{throw Error("Never call upstream");});
 const env={UPSTREAM_ALLOWED:"true",ADSBFI_ALLOWED:"true"};
 const invalid=await worker.fetch(new Request("https://radar.example/api/aircraft?lat=999&lon=2"),env,x.ctx);
 assert.equal(invalid.status,400);
 const cross=await worker.fetch(new Request(endpoint,{headers:{Origin:"https://bad.example"}}),env,x.ctx);
 assert.equal(cross.status,403);
 assert.equal(x.calls.length,0);
});
test("stale upstream snapshot uses authorized fallback",async t=>{
 const stale=fixture();stale.now-=1000;
 const x=setup(t,url=>new Response(JSON.stringify(url.includes("adsb.lol")?stale:fixture()),{status:200}));
 const r=await worker.fetch(new Request(endpoint),{UPSTREAM_ALLOWED:"true",ADSBFI_ALLOWED:"true"},x.ctx);
 assert.equal((await r.json()).source,"adsb.fi");
 assert.equal(x.calls.length,2);
});
