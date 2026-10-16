import { searchPlaces } from './places.js';
const type=document.body.dataset.page==="ports" ? "sea" : "air";
const search=document.getElementById("directorySearch");
const grid=document.getElementById("directoryGrid");
const count=document.getElementById("directoryCount");
const clear=document.getElementById("clearDirectory");
function buildCard(place) {
  const card=document.createElement("a");
  card.className="directory-card";
  card.href="index.html?place="+encodeURIComponent(place.id)+"#radar";
  const heading=document.createElement("div");
  heading.className="directory-card-top";
  const icon=document.createElement("span"); icon.className="directory-icon "+place.type; icon.dataset.icon=place.type==="air"?"plane":"ship";
  const details=document.createElement("div");
  const title=document.createElement("h3"); title.textContent=place.name;
  const city=document.createElement("p"); city.textContent=place.city;
  details.append(title,city);heading.append(icon,details);
  const tags=document.createElement("div");tags.className="directory-tags";
  [place.code,place.secondaryCode].filter(Boolean).forEach(function (value) { const tag=document.createElement("span");tag.textContent=value;tags.append(tag); });
  const footer=document.createElement("span");footer.className="directory-go";footer.textContent="عرض على الخريطة";
  const arrow=document.createElement("span");arrow.dataset.icon="arrow-left";footer.append(arrow);
  card.append(heading,tags,footer);
  return card;
}
function render() {
  const matches=searchPlaces(type,search.value);
  count.textContent=String(matches.length)+" موقع";
  grid.replaceChildren();
  if(!matches.length) {const empty=document.createElement("p");empty.className="directory-empty";empty.textContent="لا توجد مواقع مطابقة. جرّب كتابة اسم الولاية أو رمز آخر.";grid.append(empty);return;}
  const fragment=document.createDocumentFragment();
  matches.forEach(function (place) {fragment.append(buildCard(place));});
  grid.append(fragment);
  window.renderSiteIcons?.(grid);
}
search.addEventListener("input",render);
clear.addEventListener("click",function () {search.value="";render();search.focus();});
render();