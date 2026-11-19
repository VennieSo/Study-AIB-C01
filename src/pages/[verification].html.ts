import type { APIRoute, GetStaticPaths } from 'astro';
import verificationFile from '../content/googlee0841d149f9fdcc6.html?raw';

export const getStaticPaths: GetStaticPaths = () =>
  import.meta.env.DEV || import.meta.env.MODE === 'fixture'
    ? []
    : [{ params: { verification: 'googlee0841d149f9fdcc6' } }];

export const GET: APIRoute = () =>
  new Response(verificationFile, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
