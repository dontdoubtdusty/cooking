// Cloudflare Workers entry: the same /r/<id> and /feed handling as functions/ (which Cloudflare Pages uses).
import { onRequest } from './functions/r/[[path]].js';
import { onRequest as feed } from './functions/feed.js';

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path == '/feed') return feed({ request, env });
    if (path.startsWith('/r/')) return onRequest({ request, env, params: { path: path.slice(3).split('/').filter(Boolean) } });
    return env.ASSETS.fetch(request);
  }
};
