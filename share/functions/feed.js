// Cloudflare Pages Function for the Discover tab's feed.
//   /feed?u=<link to a cooking site, blog or YouTube channel>
// Browsers can't read other sites' feeds directly (they block it), so the app asks here instead.
// This finds the source's RSS or Atom feed (YouTube channels have one too), reads it and answers with
// its newest posts as small JSON: { title, site, feed, items: [{ t: title, u: link, d: ISO date, img }] }.
// Answers are cached for 30 minutes so a busy feed isn't fetched over and over.

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
    return { t, u, d: isNaN(d) ? '' : new Date(d).toISOString(), img: image(b, base) };
  }).filter(x => x.t && x.u);
  items.sort((a, b) => (b.d > a.d ? 1 : b.d < a.d ? -1 : 0));
  return { title: text(inner(head, 'title')), site, items: items.slice(0, MAX_ITEMS) };
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
  const u = okUrl(new URL(request.url).searchParams.get('u') || '');
  if (!u) return json({ error: 'That link doesn\'t look right' }, 400, 60);
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
        cands.push(o + '/feed', o + '/rss', o + '/feed.xml', o + '/rss.xml', o + '/index.xml', o + '/atom.xml', o + '/feeds/posts/default', o + '/blog?format=rss');
        for (const c of [...new Set(cands)].slice(0, 6)) {
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
