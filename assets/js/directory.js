import {searchPlaces} from "./places.js";
const page=document.body.dataset.page;
const type=page==="ports"?"sea":page==="favorites"?"both":"air";
const search=document.getElementById("directorySearch");
const grid=document.getElementById("directoryGrid");
const count=document.getElementById("directoryCount");
const clear=document.getElementById("clearDirectory");
const KEY="dz-air-sea-favs-v1";
function favorites(){try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v.filter(x=>typeof x==="string").slice(0,200):[];}catch{return [];}}
function store(values){try{localStorage.setItem(KEY,JSON.stringify(values));}catch{/* Private browsing may block storage */}}
function icon(name){const el=document.createElement("span");el.dataset.icon=name;return el;}
function buildCard(place){
 const card=document.createElement("article");card.className="directory-card";
 const head=document.createElement("div");head.className="directory-card-top";
 const pict=document.createElement("span");pict.className="directory-icon "+place.type;pict.dataset.icon=place.type==="air"?"plane":"ship";
 const details=document.createElement("div"),title=document.createElement("h3"),city=document.createElement("p");
 title.textContent=place.name;city.textContent=place.city;details.append(title,city);head.append(pict,details);
 const tags=document.createElement("div");tags.className="directory-tags";
 [place.code,place.secondaryCode].filter(Boolean).forEach(v=>{const span=document.createElement("span");span.textContent=v;tags.append(span);});
 const actions=document.createElement("div");actions.className="directory-controls";
 const link=document.createElement("a");link.className="directory-go";link.href="index.html?place="+encodeURIComponent(place.id)+"#radar";link.append(document.createTextNode("عرض على الخريطة"),icon("arrow-left"));
 const button=document.createElement("button");button.type="button";button.className="favorite-toggle";
 const apply=()=>{const yes=favorites().includes(place.id);button.classList.toggle("is-favorite",yes);button.setAttribute("aria-pressed",String(yes));button.setAttribute("aria-label",yes?"إزالة من المفضلة: "+place.name:"إضافة إلى المفضلة: "+place.name);button.replaceChildren(icon("heart"));window.renderSiteIcons?.(button);};
 button.addEventListener("click",()=>{const list=favorites();const next=list.includes(place.id)?list.filter(x=>x!==place.id):[...list,place.id];store(next);if(page==="favorites")render();else apply();});
 actions.append(link,button);card.append(head,tags,actions);apply();return card;
}
function render(){
 const favs=favorites();
 const matches=searchPlaces(type,search.value).filter(p=>page!=="favorites"||favs.includes(p.id));
 count.textContent=matches.length+" موقع";grid.replaceChildren();
 if(!matches.length){const el=document.createElement("p");el.className="directory-empty";el.textContent=page==="favorites"?"لا توجد مواقع محفوظة مطابقة. احفظ مطارًا أو ميناءً من دليله أولًا.":"لا توجد مواقع مطابقة. جرّب اسم مدينة أو رمزًا آخر.";grid.append(el);return;}
 const fragment=document.createDocumentFragment();matches.forEach(p=>fragment.append(buildCard(p)));
 grid.append(fragment);window.renderSiteIcons?.(grid);
}
search.addEventListener("input",render);clear.addEventListener("click",()=>{search.value="";render();search.focus();});
window.addEventListener("storage",render);render();
