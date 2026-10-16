// Cloudflare Pages Function for shared recipe links.
//   /r/<id>        the recipe page, with link-preview tags so Messages, WhatsApp and the like show the recipe's name,
//                  a short summary and its photo, and with the recipe already in the page so it opens in one request
//   /r/<id>/photo  the recipe's photo, for those previews
// The recipe comes from its public copy in Firestore (shared/<id>), which the Big Saucy app keeps up to date.

const PROJECT = 'big-juicy-apps', KEY = 'AIzaSyB-qolJOepAn64lFq56Qv4ZwddZBOnbMCo';   // the same public values as sync.js

// Firestore's REST format -> plain values
const val = v => 'stringValue' in v ? v.stringValue : 'integerValue' in v ? +v.integerValue : 'doubleValue' in v ? v.doubleValue
  : 'booleanValue' in v ? v.booleanValue : 'arrayValue' in v ? (v.arrayValue.values || []).map(val)
  : 'mapValue' in v ? obj(v.mapValue.fields || {}) : null;
const obj = f => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, val(v)]));

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtTime = x => { x = Math.round(+x || 0); if (!x) return ''; const h = Math.floor(x / 60), r = x % 60; return h ? h + ' hr' + (r ? ' ' + r + ' min' : '') : r + ' min' };
const arr = x => Array.isArray(x) ? x : [];

// The recipe, false when there's no such recipe, or null when Firestore couldn't be reached (the page then tries itself)
async function load(id) {
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/shared/${id}?key=${KEY}`);
  if (res.status == 404) return false;
  if (!res.ok) return null;
  const r = obj((await res.json()).fields || {});
  if (r.app != 'cooking') return false;
  delete r.uid;
  return r;
}

export async function onRequest({ request, env, params }) {
  const url = new URL(request.url), p = arr(params.path), id = p[0] || '';
  const ok = /^[A-Za-z0-9]{6,32}$/.test(id) && (p.length == 1 || (p.length == 2 && p[1] == 'photo'));
  let r = false;
  if (ok) { try { r = await load(id) } catch (e) { r = null } }

  if (p[1] == 'photo') {
    const m = r && /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(r.img || '');
    if (!m) return new Response('No photo', { status: r === null ? 503 : 404 });
    const bin = atob(m[2]), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Response(bytes, { headers: { 'content-type': m[1], 'cache-control': 'public, max-age=3600' } });
  }

  let page = await (await env.ASSETS.fetch(new URL('/', url))).text();
  if (r === null) return new Response(page, { headers: { 'content-type': 'text/html; charset=utf-8' } });

  let tags;
  if (r) {
    const cat = [...arr(r.meal), r.cuisine, ...arr(r.protein), ...arr(r.diet)].filter(Boolean).slice(0, 4);
    const desc = [...cat, r.serves ? 'Serves ' + r.serves : '', fmtTime(r.time)].filter(Boolean).join(' · ') || 'A recipe shared from Big Saucy Recipes';
    const img = /^data:image\//.test(r.img || '') ? `${url.origin}/r/${id}/photo?v=${encodeURIComponent(r.at || '')}` : `${url.origin}/icon-512.png`;
    const title = r.title || 'A recipe';
    page = page.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)} · Big Saucy</title>`)
      .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`);
    tags = [
      ['og:site_name', 'Big Saucy Recipes'], ['og:type', 'article'], ['og:title', title], ['og:description', desc],
      ['og:url', `${url.origin}/r/${id}`], ['og:image', img], ['og:image:width', img.endsWith('.png') ? '512' : '600'],
      ['og:image:height', img.endsWith('.png') ? '512' : '600'], ['og:image:alt', title]
    ].map(([k, v]) => `<meta property="${k}" content="${esc(v)}">`).join('\n')
      + `\n<meta name="twitter:card" content="summary">\n<link rel="canonical" href="${esc(url.origin + '/r/' + id)}">`
      + `\n<script>window.__R=${JSON.stringify(r).replace(/</g, '\\u003c')}</script>`;
  } else tags = '<script>window.__R=false</script>';

  page = page.replace('<!--preview-->', tags);
  return new Response(page, {
    status: r ? 200 : 404,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' }
  });
}
