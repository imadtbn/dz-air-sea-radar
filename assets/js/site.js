/* Shared navigation, icons and basic enhancements. No third-party runtime needed. */
(function () {
  "use strict";
  const paths = {
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l9.6-8.6a5.5 5.5 0 0 0-.8-7.8z"/>',
    'share-2':'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.6 6.6-4.1m-6.6 8 6.6 3.9"/>',
    download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/><path d="M12 12l6-6"/>',
    plane:'<path d="M17 21v-8l-5-3V3a2 2 0 0 0-4 0v7l-5 3v8l7-2 7 2z" transform="translate(2 0)"/><path d="M4 13l8-3 8 3"/>',
    ship:'<path d="M3 17l2-8h14l2 8-9 4z"/><path d="M7 9V5h10v4M12 5V2M2 21c2-1 3-1 5 0s3 1 5 0 3-1 5 0 3 1 5 0"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    x:'<path d="M5 5l14 14M19 5 5 19"/>',
    compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6z"/>',
    'arrow-left':'<path d="M19 12H5m7-7-7 7 7 7"/>',
    'map-pin':'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    layers:'<path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18"/>',
    activity:'<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
    maximize:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
    minimize:'<path d="M8 8H3V3M16 8h5V3M3 21v-5h5M21 21v-5h-5"/>',
    locate:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    minus:'<path d="M5 12h14"/>',
    'shield-check':'<path d="m12 2 8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/><path d="m8 12 3 3 5-6"/>',
    'check-circle':'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
    'chevron-left':'<path d="m14 6-6 6 6 6"/>',
    'alert-triangle':'<path d="m12 3 10 18H2zM12 9v5M12 17h.01"/>'
  };
  window.renderSiteIcons = function (root) {
    (root || document).querySelectorAll('[data-icon]').forEach(function (el) {
      const body = paths[el.dataset.icon];
      if (!body) return;
      el.innerHTML = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="presentation" aria-hidden="true">' + body + '</svg>';
    });
  };
  window.renderSiteIcons();
  const button = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  if (button && nav) {
    const close = function () { nav.classList.remove('is-open'); button.setAttribute('aria-expanded','false'); button.setAttribute('aria-label','فتح القائمة'); button.innerHTML='<span data-icon="menu"></span>'; window.renderSiteIcons(button); };
    button.addEventListener('click',function () {
      const open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open',open);
      button.setAttribute('aria-expanded',String(open));
      button.setAttribute('aria-label',open ? 'إغلاق القائمة' : 'فتح القائمة');
      button.innerHTML='<span data-icon="' + (open ? 'x' : 'menu') + '"></span>';
      window.renderSiteIcons(button);
    });
    nav.addEventListener('click',function (event) { if (event.target.closest('a')) close(); });
    document.addEventListener('click',function (event) { if (!event.target.closest('#mainNav') && !event.target.closest('#menuToggle')) close(); });
    document.addEventListener('keydown',function (event) { if (event.key==='Escape') close(); });
    window.addEventListener('resize',function () { if (window.innerWidth>890) close(); });
  }
  const share=document.querySelector("#sharePage");
  if(share)share.addEventListener("click",async()=>{const info={title:document.title,url:location.href};try{if(navigator.share)await navigator.share(info);else if(navigator.clipboard){await navigator.clipboard.writeText(info.url);share.title="تم نسخ الرابط";}}catch(e){if(e.name!=="AbortError")console.warn(e);}});
  if("serviceWorker" in navigator && location.protocol==="https:")window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));
  let installPrompt=null;const installButton=document.querySelector("#installApp");
  if(installButton){window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;installButton.hidden=false;});installButton.addEventListener("click",async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;installButton.hidden=true;});window.addEventListener("appinstalled",()=>{installButton.hidden=true;});}
  document.querySelectorAll('.current-year').forEach(function (el) { el.textContent=String(new Date().getFullYear()); });
})();