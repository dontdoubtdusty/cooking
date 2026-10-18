// Cloudflare Pages Function for the Discover tab's feed.
//   /feed?u=<link to a cooking site, blog or YouTube channel>
//   /feed?post=<link to one post>   is it a recipe, and if so its ingredients, time, cuisine and photo
//                                   (read from the schema.org Recipe data recipe plugins put in the page)
//   /feed?u=<site>&q=<words>        that site's posts matching the words, from any year: { items, via }
//                                   (WordPress search; other sites and YouTube answer 404 "No search")
// Browsers can't read other sites' feeds directly (they block it), so the app asks here instead.
// This finds the source's RSS or Atom feed (YouTube channels have one too), reads it and answers with
// its newest posts as small JSON: { title, site, feed, items: [{ t: title, u: link, d: ISO date, img }] }.
// YouTube videos get the ingredients listed in their description, when there are any, and Shorts are left out.
// Answers can be cached for 30 minutes (posts for a week); the app also keeps what it got on the device.

const UA = 'Mozilla/5.0 (compatible; BigSaucyFeed/1.0; +https://big-saucy.pages.dev)';
const MAX_BYTES = 2e6, MAX_ITEMS = 20, AGE = 1800;

const json = (o, status = 200, age = AGE) => new Response(JSON.stringify(o), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': `public, max-age=${age}` }
});

// Only public http(s) addresses
function okUrl(s) {
  let u; try { u = new URL(s) } catch (e) { return null }
  if (!/^https?:$/.test(u.protocol)) return null;
  const h = u.hostname.toLowerCase();
  if (!h.includes('.') || h == 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || /^[\d.]+$/.test(h) || h.includes(':')) return null;
  return u;
}

async function get(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/html;q=0.8, */*;q=0.5', 'accept-language': 'en' },
    cf: { cacheTtl: AGE, cacheEverything: true }
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const text = (await res.text()).slice(0, MAX_BYTES);
  return { text, url: res.url || String(url) };
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
const ent = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] == '#'
  ? String.fromCodePoint(e[1] == 'x' || e[1] == 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e.toLowerCase()] ?? m);
const cdata = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
const text = s => ent(cdata(s).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
// Inner content of the first <name>…</name> (names with a colon, like media:thumbnail, work too)
const inner = (x, n) => { const m = new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, 'i').exec(x); return m ? m[1] : '' };
// An attribute of the first <name …> tag that also matches `also`
function attr(x, n, a, also) {
  const re = new RegExp(`<${n}\\b[^>]*>`, 'gi'); let m;
  while ((m = re.exec(x))) { if (also && !also.test(m[0])) continue; const v = new RegExp(`\\b${a}\\s*=\\s*["']([^"']*)["']`, 'i').exec(m[0]); if (v) return ent(v[1]) }
  return '';
}
const abs = (u, base) => { if (!u || !u.trim()) return ''; try { const x = new URL(ent(u.trim()), base); return /^https?:$/.test(x.protocol) ? x.href : '' } catch (e) { return '' } };
const isFeed = t => /<(rss|feed|rdf:RDF)[\s>]/i.test(t.slice(0, 3000));

// <link rel="alternate" type="application/rss+xml" href="…"> in a web page
function feedLinks(html, base) {
  const out = [], re = /<link\b[^>]*>/gi; let m;
  while ((m = re.exec(html))) {
    const t = m[0];
    if (!/rel\s*=\s*["'][^"']*alternate/i.test(t) || !/type\s*=\s*["']application\/(rss|atom)\+xml/i.test(t)) continue;
    const h = /href\s*=\s*["']([^"']+)["']/i.exec(t);
    if (h && !/comments/i.test(h[1])) out.push(abs(h[1], base));
  }
  return out.filter(Boolean);
}

function image(x, base) {
  const u = attr(x, 'media:thumbnail', 'url')
    || attr(x, 'media:content', 'url', /medium\s*=\s*["']image|type\s*=\s*["']image|\.(jpe?g|png|webp)/i)
    || attr(x, 'enclosure', 'url', /type\s*=\s*["']image/i)
    || attr(x, 'itunes:image', 'href');
  if (u) return abs(u, base);
  const body = ent(cdata(inner(x, 'content:encoded') || inner(x, 'description') || inner(x, 'content') || inner(x, 'summary')));
  const m = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i.exec(body);
  return m ? abs(m[1], base) : '';
}

function parse(xml, base) {
  const atom = !/<item[\s>]/i.test(xml) && /<entry[\s>]/i.test(xml);
  const blocks = xml.match(atom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi) || [];
  const head = xml.slice(0, xml.search(atom ? /<entry[\s>]/i : /<item[\s>]/i) >>> 0);
  const site = atom ? abs(attr(head, 'link', 'href', /alternate|^<link(?![^>]*\brel=)/i) || attr(head, 'link', 'href'), base) : abs(text(inner(head, 'link')), base);
  const items = blocks.map(b => {
    const t = text(inner(b, 'title'));
    const u = atom ? abs(attr(b, 'link', 'href', /rel\s*=\s*["']alternate|^<link(?![^>]*\brel=)/i) || attr(b, 'link', 'href'), base)
      : abs(text(inner(b, 'link')) || (/isPermaLink\s*=\s*["']false/i.test(b) ? '' : text(inner(b, 'guid'))), base);
    const ds = text(inner(b, 'pubDate') || inner(b, 'published') || inner(b, 'dc:date') || inner(b, 'updated'));
    const d = Date.parse(ds);
    const it = { t, u, d: isNaN(d) ? '' : new Date(d).toISOString(), img: image(b, base) };
    if (/youtube\.com\/watch/.test(u)) Object.assign(it, ytRecipe(t, inner(b, 'media:description')));
    return it;
  }).filter(x => x.t && x.u && !/youtube\.com\/shorts\//.test(x.u));
  items.sort((a, b) => (b.d > a.d ? 1 : b.d < a.d ? -1 : 0));
  return { title: text(inner(head, 'title')), site, items: items.slice(0, MAX_ITEMS) };
}

// ---- Recipes in posts ----
const RECIPE_WORDS = /\b(recipes?|how to (make|cook|bake)|ingredients?|easy|homemade|from scratch)\b/i;
const NOT_RECIPE = /\b(vlog|q ?& ?a|haul|unboxing|taste test|tier list|reacts?|reacting|review|podcast|livestream|live stream|trailer|announcement|what i eat|mukbang)\b/i;
const QTY = /^(\d|[½⅓⅔¼¾⅛]|a |an |one |two |three |half |pinch |dash |handful )/i;
// A video's description: lines under an "Ingredients" heading, or else lines that start with an amount
function ytRecipe(title, desc) {
  const lines = ent(cdata(desc)).split(/\r?\n/).map(l => l.replace(/^[\s\-–•*▢·✓✔]+/, '').trim());
  let ing = [], on = false;
  for (const l of lines) {
    if (/^ingredients?\b/i.test(l)) { on = true; continue }
    if (on && (/^(instructions|directions|method|steps|equipment|nutrition|notes|recipe|chapters|timestamps|music|follow|subscribe|my |get |shop|links?)\b/i.test(l) || /https?:\/\//.test(l) || /^\d+:\d\d/.test(l))) { if (ing.length) break; on = false; continue }
    if (on && l && l.length < 120 && !/:$/.test(l)) ing.push(l);
  }
  if (ing.length < 3) ing = lines.filter(l => QTY.test(l) && l.length < 100 && !/^\d+:\d\d/.test(l) && !/https?:/.test(l));
  ing = ing.slice(0, 50);
  const isR = ing.length >= 3 ? 1 : NOT_RECIPE.test(title) ? 0 : RECIPE_WORDS.test(title + ' ' + desc.slice(0, 600)) ? 1 : null;
  return ing.length >= 3 ? { r: 1, ing } : { r: isR };
}
// ISO 8601 durations ("PT1H30M") -> minutes
const mins = d => { const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i.exec(String(d || '')); return m ? (+m[1] || 0) * 1440 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0 };
// The schema.org Recipe in a page's JSON-LD blocks (it can sit in an @graph, a list or mainEntity)
function ldRecipe(html) {
  const seen = []; let i = 0;
  while ((i = html.indexOf('application/ld+json', i)) >= 0) {
    const s = html.indexOf('>', i) + 1, e = html.indexOf('</script>', s);
    if (s <= 0 || e < 0) break;
    try { seen.push(JSON.parse(html.slice(s, e).trim())) } catch (_) { }
    i = e;
  }
  const walk = o => {
    if (!o || typeof o != 'object') return null;
    if (Array.isArray(o)) { for (const x of o) { const r = walk(x); if (r) return r } return null }
    if ([].concat(o['@type'] || []).some(t => /^recipe$/i.test(t))) return o;
    return walk(o['@graph']) || walk(o.mainEntity);
  };
  return walk(seen);
}
const str = v => typeof v == 'string' ? v : Array.isArray(v) ? str(v[0]) : v && typeof v == 'object' ? str(v.url || v['@id'] || v.name || '') : '';
async function postInfo(u) {
  const { text: html, url } = await get(u.href);
  const r = ldRecipe(html);
  if (!r) return { r: /class=["'][^"']*\b(wprm-recipe|tasty-recipes|mv-create-card|recipe-card)\b|itemtype=["']https?:\/\/schema\.org\/Recipe/i.test(html) ? 1 : 0 };
  const ing = [].concat(r.recipeIngredient || r.ingredients || []).map(x => text(String(x))).filter(Boolean).slice(0, 60);
  return { r: 1, ing, tm: mins(r.totalTime) || (mins(r.prepTime) + mins(r.cookTime)) || 0, cu: text(str(r.recipeCuisine)).slice(0, 30), img: abs(str(r.image), url) };
}

// ---- Searching a source's whole archive ----
// Most food blogs run WordPress, which answers a search as a feed (?s=…&feed=rss2) and through its REST API.
// Either one works on posts from any year, not just the newest few. Other sites answer null (no search).
const SEARCH_AGE = 6 * 3600, MAX_HITS = 12;
async function searchSite(u, q) {
  const bases = [u.origin];
  const path = u.pathname.replace(/\/+$/, '');
  if (path && !/\.(xml|rss|atom)$/i.test(path)) bases.push(u.origin + path.replace(/\/(feed|rss)$/i, ''));
  for (const b of [...new Set(bases)]) {
    try {
      const g = await get(b + '/?s=' + encodeURIComponent(q) + '&feed=rss2');
      if (isFeed(g.text)) { const p = parse(g.text, g.url); return { items: p.items.slice(0, MAX_HITS), via: 'feed' } }
    } catch (e) { }
    try {
      const g = await get(b + '/wp-json/wp/v2/posts?search=' + encodeURIComponent(q) + '&per_page=' + MAX_HITS + '&_fields=link,title,date_gmt,jetpack_featured_media_url');
      const a = JSON.parse(g.text);
      if (Array.isArray(a)) return {
        via: 'wp',
        items: a.map(x => ({
          t: text(String(x.title && x.title.rendered || '')), u: abs(String(x.link || ''), g.url),
          d: x.date_gmt && !isNaN(Date.parse(x.date_gmt + 'Z')) ? new Date(x.date_gmt + 'Z').toISOString() : '',
          img: abs(String(x.jetpack_featured_media_url || ''), g.url)
        })).filter(x => x.t && x.u)
      };
    } catch (e) { }
  }
  return null;
}

// YouTube channel pages -> the channel's video feed
async function youtubeFeed(u) {
  let id = /\/channel\/(UC[\w-]{22})/.exec(u.pathname)?.[1];
  if (!id) {
    const { text: html } = await get(u.href);
    id = (/"externalId":"(UC[\w-]{22})"/.exec(html) || /"channelId":"(UC[\w-]{22})"/.exec(html)
      || /youtube\.com\/channel\/(UC[\w-]{22})/.exec(html) || /channel_id=(UC[\w-]{22})/.exec(html) || [])[1];
  }
  return id ? 'https://www.youtube.com/feeds/videos.xml?channel_id=' + id : '';
}

export async function onRequest({ request }) {
  if (request.method == 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET' } });
  const q = new URL(request.url).searchParams;
  if (q.has('post')) {
    const pu = okUrl(q.get('post'));
    if (!pu) return json({ error: 'That link doesn\'t look right' }, 400, 60);
    try { return json(await postInfo(pu), 200, 7 * 86400) } catch (e) { return json({ error: 'Couldn\'t reach it' }, 502, 300) }
  }
  const u = okUrl(q.get('u') || '');
  if (!u) return json({ error: 'That link doesn\'t look right' }, 400, 60);
  if (q.has('q')) {
    const words = (q.get('q') || '').replace(/\s+/g, ' ').trim().slice(0, 100);
    if (!words) return json({ error: 'Nothing to search for' }, 400, 60);
    if (/(^|\.)youtube\.com$/i.test(u.hostname)) return json({ error: 'No search' }, 404, 86400);
    try {
      const r = await searchSite(u, words);
      return r ? json(r, 200, SEARCH_AGE) : json({ error: 'No search' }, 404, 86400);
    } catch (e) { return json({ error: 'Couldn\'t reach it' }, 502, 300) }
  }
  try {
    let feed = '', got = null;
    if (/(^|\.)youtube\.com$/i.test(u.hostname)) feed = await youtubeFeed(u);
    else {
      got = await get(u.href);
      if (isFeed(got.text)) feed = got.url;
      else {
        const cands = feedLinks(got.text, got.url);
        // No feed advertised: try the usual addresses (WordPress, Substack, Blogger, Squarespace, Ghost, Hugo…)
        const o = new URL(got.url).origin;
        const here = got.url.split(/[?#]/)[0];
        cands.push(o + '/feed', o + '/rss', here + '?format=rss', o + '/feed.xml', o + '/rss.xml', o + '/index.xml', o + '/atom.xml', o + '/feeds/posts/default', o + '/blog?format=rss');
        for (const c of [...new Set(cands)].slice(0, 9)) {
          try { const g = await get(c); if (isFeed(g.text)) { feed = g.url; got = g; break } } catch (e) { }
        }
        if (!feed) got = null;
      }
    }
    if (!feed) return json({ error: 'No feed found' }, 404, 3600);
    if (!got || got.url != feed) got = await get(feed);
    if (!isFeed(got.text)) return json({ error: 'No feed found' }, 404, 3600);
    const p = parse(got.text, got.url);
    return json({ title: p.title, site: p.site || u.href, feed, items: p.items });
  } catch (e) {
    return json({ error: 'Couldn\'t reach it (' + (e && e.message || 'error') + ')' }, 502, 300);
  }
}
