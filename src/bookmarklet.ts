import type { CartLine } from './cart'

/** Zpráva, kterou appka (okno otevřené přes #export) pošle bookmarkletu na rohlik.cz. */
export const EXPORT_HASH = '#export'
export const EXPORT_TYPE = 'fast-rohlik-cart'
export const ROHLIK_ORIGIN = 'https://www.rohlik.cz'

export const exportItems = (lines: CartLine[]) => lines.map((x) => ({ id: x.p.id, qty: x.qty, name: x.p.name }))

/**
 * Bookmarklet běží na rohlik.cz v přihlášené session. Otevře okno appky (#export), to mu pošle košík přes postMessage,
 * pak bookmarklet přes stejný endpoint jako web doplní do košíku Rohlíku chybějící kusy (opakované spuštění nic nezdvojí).
 * Musí být psaný na jeden řádek se středníky – bookmarky odstraňují zalomení.
 */
const SOURCE = (origin: string) =>
  `(async function(A){` +
  `var box=document.createElement('div');` +
  `box.style.cssText='position:fixed;z-index:2147483647;left:50%;bottom:24px;transform:translateX(-50%);max-width:90vw;background:#111;color:#fff;font:600 15px system-ui,sans-serif;padding:12px 20px;border-radius:999px;box-shadow:0 6px 24px rgba(0,0,0,.4)';` +
  `var say=function(t){box.textContent=t};` +
  `var bye=function(ms){setTimeout(function(){box.remove()},ms)};` +
  `document.body.appendChild(box);` +
  `if(location.hostname.slice(-9)!=='rohlik.cz'){say('Spusť to na rohlik.cz');bye(4000);return}` +
  `say('Načítám košík z Akčního Rohlíku…');` +
  `var items=await new Promise(function(ok){` +
  `var h=function(e){if(e.origin!==A||!e.data||e.data.type!==${JSON.stringify(EXPORT_TYPE)})return;removeEventListener('message',h);ok(e.data.items)};` +
  `addEventListener('message',h);` +
  `if(!window.open(A+${JSON.stringify(EXPORT_HASH)},'fast-rohlik-export','width=420,height=240')){removeEventListener('message',h);ok(null);return}` +
  `setTimeout(function(){removeEventListener('message',h);ok(null)},15000)});` +
  `if(!items){say('Košík z Akčního Rohlíku se nenačetl – povol vyskakovací okna.');bye(5000);return}` +
  `if(!items.length){say('Košík v Akčním Rohlíku je prázdný.');bye(4000);return}` +
  `var cart='/services/frontend-service/v2/cart';` +
  `try{` +
  `var cur=await(await fetch(cart,{credentials:'same-origin',headers:{Accept:'application/json'}})).json();` +
  `var have=(cur.data&&cur.data.items)||{};var done=0,fail=0;` +
  `for(var i=0;i<items.length;i++){var it=items[i];var need=it.qty-((have[it.id]&&have[it.id].quantity)||0);` +
  `say('Přidávám '+(i+1)+'/'+items.length+': '+it.name);` +
  `if(need<=0){done++;continue}` +
  `var r=await fetch(cart,{method:'POST',credentials:'same-origin',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({actionId:null,productId:it.id,quantity:need,recipeId:null,source:'true:Shopping Lists'})});` +
  `if(r.ok)done++;else fail++}` +
  `say(fail?'Přidáno '+done+', nepovedlo se '+fail+' (třeba už není skladem).':'Hotovo – '+done+' položek v košíku ✓');` +
  `setTimeout(function(){location.reload()},fail?3500:1200)` +
  `}catch(e){say('Chyba: '+e.message);bye(6000)}` +
  `})(${JSON.stringify(origin)})`

export const bookmarkletHref = (origin: string) => 'javascript:' + encodeURIComponent(SOURCE(origin))
