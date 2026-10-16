/** Persistent AISStream -> short-lived snapshot relay.
 * Requires a long-running Node.js service and a private AISSTREAM_API_KEY.
 * Not suitable for direct hosting on GitHub Pages.
 */
import http from "node:http";
import {WebSocket} from "ws";
const key=process.env.AISSTREAM_API_KEY;
if(!key){console.error("AISSTREAM_API_KEY is required. Relay not started.");process.exit(1);}
const PORT=Number(process.env.PORT)||8788;
const ORIGIN="https://imadtbn.github.io";
const AIS_ENDPOINT="wss://stream.aisstream.io/v0/stream";
const TTL_MS=15*60*1000;
const vesselCache=new Map();
let connected=false,lastMessageAt=null,connection=null,retryMs=2500,stopping=false;
const bound=[[[38.6,-3.3],[34.2,10.3]]]; // NW and SE corners in lat/lon, Algeria coastal region
const allowedTypes=["PositionReport","ExtendedClassBPositionReport","StandardClassBPositionReport","ShipStaticData","StaticDataReport","SingleSlotBinaryMessage"];
const finite=n=>typeof n==="number"&&Number.isFinite(n);
function updateVessel(message){
 const m=message?.MetaData||{},body=message?.Message||{};
 const type=message?.MessageType;
 const data=body[type];if(!data||typeof data!=="object")return;
 const mmsi=String(m.MMSI??data.UserID??data.Mmsi??data.MMSI??"");
 if(!/^[0-9]{9}$/.test(mmsi))return;
 const prev=vesselCache.get(mmsi)||{mmsi},name=typeof m.ShipName==="string"?m.ShipName.trim():prev.name;
 const v={...prev,mmsi,name:name||prev.name||"",destination:prev.destination||""};
 if(typeof data.Destination==="string")v.destination=data.Destination.slice(0,90).trim();
 if(finite(data.Latitude)&&finite(data.Longitude)&&Math.abs(data.Latitude)<=90&&Math.abs(data.Longitude)<=180
  &&data.Latitude>=34.2&&data.Latitude<=38.6&&data.Longitude>=-3.3&&data.Longitude<=10.3){
  v.lat=data.Latitude;v.lon=data.Longitude;
  if(finite(data.Sog)&&data.Sog>=0&&data.Sog<102.3)v.sog=data.Sog;
  if(finite(data.Cog)&&data.Cog>=0&&data.Cog<360)v.cog=data.Cog;
  if(finite(data.TrueHeading)&&data.TrueHeading<360)v.heading=data.TrueHeading;
  v.receivedAt=new Date().toISOString();
 }
 if(finite(v.lat)&&finite(v.lon))vesselCache.set(mmsi,v);
 lastMessageAt=new Date().toISOString();
}
function cleanup(){
 const now=Date.now();
 for(const [id,v] of vesselCache)if(!v.receivedAt||now-Date.parse(v.receivedAt)>TTL_MS)vesselCache.delete(id);
 if(vesselCache.size>2000){
  const ordered=[...vesselCache].sort((a,b)=>Date.parse(a[1].receivedAt)-Date.parse(b[1].receivedAt));
  for(const [id] of ordered.slice(0,vesselCache.size-2000))vesselCache.delete(id);
 }
}
function connect(){
 if(stopping)return;
 const ws=new WebSocket(AIS_ENDPOINT,{perMessageDeflate:true,handshakeTimeout:15000});
 connection=ws;
 ws.on("open",()=>{
  retryMs=2500;connected=true;
  ws.send(JSON.stringify({APIKey:key,BoundingBoxes:bound,FilterMessageTypes:allowedTypes}));
 });
 ws.on("message",raw=>{
  try{
   const value=JSON.parse(raw.toString());
   if(value.MessageType==="SubscriptionConfirmation")return;
   updateVessel(value);
  }catch(err){console.warn("AIS message parse skipped",err.message);}
 });
 ws.on("error",err=>console.warn("AIS stream error",err.message));
 ws.on("close",()=>{connected=false;if(stopping)return;setTimeout(connect,retryMs);retryMs=Math.min(retryMs*2,60000);});
}
const server=http.createServer((req,res)=>{
 const url=new URL(req.url||"/","http://localhost");
 const origin=req.headers.origin;
 const headers={"content-type":"application/json; charset=utf-8","access-control-allow-origin":ORIGIN,"vary":"Origin","cache-control":"no-store","x-content-type-options":"nosniff"};
 const send=(code,obj)=>{res.writeHead(code,headers);res.end(JSON.stringify(obj));};
 if(origin&&origin!==ORIGIN)return send(403,{error:"Origin denied"});
 if(req.method==="OPTIONS"){res.writeHead(204,{"access-control-allow-origin":ORIGIN,"access-control-allow-methods":"GET,OPTIONS","access-control-allow-headers":"Accept"});res.end();return;}
 if(req.method!=="GET")return send(405,{error:"Method not allowed"});
 if(url.pathname==="/health")return send(200,{status:connected?"connected":"disconnected",vesselCount:vesselCache.size,lastMessageAt});
 if(url.pathname!=="/api/vessels")return send(404,{error:"Not found"});
 cleanup();
 const ships=[...vesselCache.values()].sort((a,b)=>Date.parse(b.receivedAt)-Date.parse(a.receivedAt)).slice(0,1500);
 return send(200,{status:connected?"connected":"disconnected",receivedAt:new Date().toISOString(),lastMessageAt,vessels:ships});
});
const ticker=setInterval(cleanup,60000);
function close(){stopping=true;connected=false;clearInterval(ticker);connection?.close();server.close();}
process.on("SIGTERM",close);process.on("SIGINT",close);
server.listen(PORT,"0.0.0.0",()=>{console.log("AIS relay listening on",PORT);connect();});
