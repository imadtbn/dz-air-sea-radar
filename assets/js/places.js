/* Fixed public POIs only. NOT live aircraft/vessel positions.
   Airport coordinate source: https://ourairports.com/data/ and airport-specific pages.
   Port coordinates: approximate public-reference centers (not for navigation).
   Each item uses longitude first when passed to MapLibre. */
export const places = [
  {id:"air-algiers",type:"air",name:"مطار هواري بومدين الدولي",city:"الجزائر العاصمة",code:"ALG",secondaryCode:"DAAG",lat:36.693886,lng:3.214531},
  {id:"air-oran",type:"air",name:"مطار أحمد بن بلة الدولي",city:"وهران",code:"ORN",secondaryCode:"DAOO",lat:35.620648,lng:-0.622486},
  {id:"air-constantine",type:"air",name:"مطار محمد بوضياف الدولي",city:"قسنطينة",code:"CZL",secondaryCode:"DABC",lat:36.276,lng:6.6204},
  {id:"air-annaba",type:"air",name:"مطار رابح بيطاط",city:"عنابة",code:"AAE",secondaryCode:"DABB",lat:36.826781,lng:7.813340},
  {id:"air-bejaia",type:"air",name:"مطار عبان رمضان",city:"بجاية",code:"BJA",secondaryCode:"DAAE",lat:36.712547,lng:5.069909},
  {id:"air-tlemcen",type:"air",name:"مطار مصالي الحاج",city:"تلمسان",code:"TLM",secondaryCode:"DAON",lat:35.012732,lng:-1.457117},
  {id:"sea-algiers",type:"sea",name:"ميناء الجزائر",city:"الجزائر العاصمة",code:"DZALG",lat:36.7858,lng:3.0650},
  {id:"sea-oran",type:"sea",name:"ميناء وهران",city:"وهران",code:"DZORN",lat:35.70936,lng:-0.63199},
  {id:"sea-bejaia",type:"sea",name:"ميناء بجاية",city:"بجاية",code:"DZBJA",lat:36.75,lng:5.076},
  {id:"sea-annaba",type:"sea",name:"ميناء عنابة",city:"عنابة",code:"DZAAE",lat:36.9081,lng:7.7708},
  {id:"sea-skikda",type:"sea",name:"ميناء سكيكدة",city:"سكيكدة",code:"DZSKI",lat:36.88384,lng:6.90607},
  {id:"sea-djendjen",type:"sea",name:"ميناء جن جن",city:"جيجل",code:"DZDJE",lat:36.8167,lng:5.8831}
];
export function normalized(text) {
  return String(text || "").toLocaleLowerCase().normalize("NFKD").replace(/[\u064B-\u065F]/g,"").replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ـ/g,"").trim();
}
export function searchPlaces(type,term) {
  const q=normalized(term);
  return places.filter(function (p) {
    return (type==="both" || p.type===type) &&
      (!q || normalized([p.name,p.city,p.code,p.secondaryCode||""].join(" ")).includes(q));
  });
}