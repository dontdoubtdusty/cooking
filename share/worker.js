// Cloudflare Workers entry: the same /r/<id> handling as functions/r/[[path]].js (which Cloudflare Pages uses).
import { onRequest } from './functions/r/[[path]].js';

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/r/')) return onRequest({ request, env, params: { path: path.slice(3).split('/').filter(Boolean) } });
    return env.ASSETS.fetch(request);
  }
};
