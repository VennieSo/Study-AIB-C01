import type { APIRoute } from 'astro';
import { site } from '../content/site';

const paths = ['/', site.factsPath, site.aboutPath];

export const GET: APIRoute = () =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
      .map((path) => `  <url><loc>${new URL(path, site.url).href}</loc></url>`)
      .join('\n')}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
