// Zero-dependency static site builder.
//   node build.mjs                       -> writes ./dist
//   SITE_URL=https://real-domain node build.mjs
// Pages live in src/pages/*.html with a small front-matter block.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'src');
const out = join(root, 'dist');

const site = JSON.parse(readFileSync(join(src, 'site.json'), 'utf8'));
if (process.env.SITE_URL) site.url = process.env.SITE_URL;
site.url = site.url.replace(/\/+$/, '');

const read = (p) => readFileSync(join(src, p), 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function fill(str, vars) {
  return str.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const val = key.split('.').reduce((o, k) => (o == null ? o : o[k]), vars);
    if (val === undefined) throw new Error(`Unknown template variable: ${key}`);
    return val;
  });
}

function parse(file, name) {
  const m = file.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(`${name}: missing front matter`);
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  for (const k of ['title', 'description', 'path']) {
    if (!meta[k]) throw new Error(`${name}: front matter needs "${k}"`);
  }
  return { meta, body: m[2] };
}

const layout = read('layout.html');
const sprite = read('partials/sprite.html');
// {{icon:name}} -> inline reference to a symbol in partials/sprite.html
const icons = (s) => s.replace(/\{\{icon:([\w-]+)\}\}/g, (_, n) => {
  if (!sprite.includes(`id="i-${n}"`)) throw new Error(`Unknown icon: ${n} (add it to src/partials/sprite.html)`);
  return `<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;
});
const header = read('partials/header.html');
const footer = read('partials/footer.html');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(src, 'assets'), join(out, 'assets'), { recursive: true });
// Browsers request /favicon.ico from the site root regardless of the <link> tag
cpSync(join(src, 'favicon.ico'), join(out, 'favicon.ico'));

// Make root-absolute links ("/assets/x.css", "/about/") relative so the built site works from any
// folder or server (VS Code Live Server, file://, a sub-path), not only from a domain root.
function relativize(html, pagePath) {
  const depth = pagePath.split('/').filter(Boolean).length;
  const up = depth ? '../'.repeat(depth) : './';
  return html.replace(/(href|src)="\/(?!\/)([^"]*)"/g, (_, attr, rest) => {
    const hashAt = rest.indexOf('#');
    let p = hashAt === -1 ? rest : rest.slice(0, hashAt);
    const frag = hashAt === -1 ? '' : rest.slice(hashAt);
    if (p === '' || p.endsWith('/')) p += 'index.html';
    return `${attr}="${up}${p}${frag}"`;
  });
}

const indexable = [];

for (const f of readdirSync(join(src, 'pages')).filter((n) => n.endsWith('.html'))) {
  const { meta, body } = parse(read(`pages/${f}`), f);
  const url = site.url + meta.path;
  const noindex = meta.robots === 'noindex';
  // "Sign In" only appears once the real app URL is set in site.json
  const signin = site.appUrl ? `<a class="nav-signin" href="${esc(site.appUrl)}">Sign In</a>` : '';
  const vars = { site, signin };

  let jsonld = '';
  const graph = [];
  if (meta.path === '/') {
    graph.push(
      { '@type': 'Organization', '@id': `${site.url}/#organization`, name: site.name, url: `${site.url}/` },
      {
        '@type': 'WebSite', '@id': `${site.url}/#website`, url: `${site.url}/`, name: site.name,
        publisher: { '@id': `${site.url}/#organization` }, inLanguage: 'en-IN',
      },
    );
  }
  let breadcrumb = '';
  if (meta.crumb) {
    breadcrumb =
      `<div class="container"><nav class="breadcrumb" aria-label="Breadcrumb"><ol>` +
      `<li><a href="/">Home</a></li>` +
      (meta.crumbParent ? `<li><a href="${esc(meta.crumbParentPath)}">${esc(meta.crumbParent)}</a></li>` : '') +
      `<li aria-current="page">${esc(meta.crumb)}</li></ol></nav></div>`;
    const items = [{ name: 'Home', item: `${site.url}/` }];
    if (meta.crumbParent) items.push({ name: meta.crumbParent, item: site.url + meta.crumbParentPath });
    items.push({ name: meta.crumb, item: url });
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, ...it })),
    });
  }
  if (graph.length) {
    jsonld = `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
  }

  const content = fill(icons(body), vars);
  let hdr = fill(icons(header), vars);
  hdr = hdr.replace(new RegExp(`(<a [^>]*href="${meta.path}")`), '$1 aria-current="page"');

  const html = fill(layout, {
    ...vars,
    title: esc(meta.title),
    description: esc(meta.description),
    canonical: url,
    robots: noindex ? 'noindex,follow' : 'index,follow',
    jsonld,
    header: hdr,
    footer: fill(icons(footer), vars),
    sprite,
    breadcrumb,
    content,
    pageClass: meta.pageClass || '',
  });

  const target = meta.file
    ? join(out, meta.file)
    : meta.path === '/' ? join(out, 'index.html') : join(out, meta.path, 'index.html');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, meta.file ? html : relativize(html, meta.path));
  if (!noindex && !meta.file) indexable.push(meta.path);
}

indexable.sort();
writeFileSync(
  join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    indexable.map((p) => `  <url><loc>${site.url}${p}</loc></url>`).join('\n') +
    `\n</urlset>\n`,
);
writeFileSync(join(out, 'robots.txt'), `User-agent: *\nDisallow: /api/\nDisallow: /preview/\n\nSitemap: ${site.url}/sitemap.xml\n`);

console.log(`Built ${indexable.length} indexable pages -> ${out}`);
console.log(`Canonical base: ${site.url}${site.url.endsWith('.example') ? '  (PLACEHOLDER - set SITE_URL or src/site.json before launch)' : ''}`);
