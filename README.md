# OneSync marketing site

A dependency-free static site. Source lives in `src/`, a small build script renders it to `dist/`, and `dist/` can be hosted anywhere (Netlify, Cloudflare Pages, S3, nginx).

```bash
node build.mjs                                     # build to dist/
SITE_URL=https://your-domain.com node build.mjs    # build with the real canonical domain
python -m http.server 4173 --directory dist        # preview at http://localhost:4173
```

## Viewing the site

Always open the **built** site in `dist/`, never the files in `src/` (those are templates and show raw `{{icon:...}}` text with no styling).

- **VS Code Live Server:** open the project folder and click "Go Live". `.vscode/settings.json` points it at `dist/`. Or right-click `dist/index.html` and choose "Open with Live Server".
- **Any browser:** double-click `dist/index.html` (or the `index.html` in the project root, which forwards to it).
- After editing anything in `src/`, run `node build.mjs` again to refresh `dist/`.

## Deploying to Vercel

`vercel.json` already sets the build command (`node build.mjs`) and the output folder (`dist`). Import the project, keep the framework preset as "Other", and deploy. Add an environment variable `SITE_URL` with your real domain so canonical links and the sitemap are correct. Do not set the root directory to `src/`.

## Structure

| Path | Purpose |
|---|---|
| `src/pages/*.html` | One file per page. Front matter sets `title`, `description`, `path`, `crumb`, `robots` (and `crumbParent` / `crumbParentPath` for guide pages) |
| `src/partials/` | Shared header and footer |
| `src/layout.html` | Document shell: metadata, canonical, Open Graph, JSON-LD slot |
| `src/site.json` | Site name, canonical URL, form endpoint, contact email, response time, "last reviewed" date |
| `src/partials/sprite.html` | The icon set. Use an icon in any page with `{{icon:name}}`. The build fails on unknown names |
| `src/assets/css/main.css` | The whole design system in one file: tokens (colours, type, spacing) at the top, then base, layout, header, buttons, components, forms, footer and motion |
| `src/assets/js/site.js` | Mobile menu, dropdown menus, scroll reveals (disabled for reduced motion), contact and demo forms |
| `src/assets/` | Also holds the favicon |

## Pages

The pages follow the site map in *OneSync ERP Website Content* (Part 2).

| Address | Source file | Content part |
|---|---|---|
| `/` | `index.html` | Part 3, Homepage |
| `/erp-software/` | `erp-software.html` | Part 4 ERP overview, Part 7 Editions and growth, Part 9.1 and 9.2 Control, security and your data |
| `/how-it-works/` | `how-it-works.html` | Part 5 How it works, Part 9.3 and 9.4 Getting started and support |
| `/features/` | `features.html` | Part 6 Capabilities, Part 12 FAQ, Part 11 mock-ups |
| `/solutions/` | `solutions.html` | Part 8 Solutions |
| `/resources/` and three guides | `resources.html`, `guide-*.html` | Part 13 Resource guides |
| `/about/` | `about.html` | Part 10.1 |
| `/contact/` | `contact.html` | Part 10.2, "Ask a product question" |
| `/book-demo/` | `book-demo.html` | Part 10.3, the main conversion page |
| `/privacy/`, `/terms/` | `privacy.html`, `terms.html` | Part 14.1, drafts pending legal review |

Both forms post JSON to `formEndpoint`. The demo form sends multi-select answers as arrays, and each payload carries `form: "contact"` or `form: "demo"`.

The site is plain HTML, CSS and JavaScript. It uses fluid layouts with breakpoints for phones (Android), tablets, laptops and desktop PCs, 44px tap targets, and content tables that turn into labelled cards on small screens.

## Illustrations are not screenshots

The hero order-trail and the stock ledger on *How it works* are illustrations with sample data, and are labelled "Illustrative example" / "Illustrative sample data". Swap in real screenshots when you have them, and keep the label for as long as a visual is not a real screen.

## Keeping claims accurate

The copy describes what OneSync does in plain present tense and avoids anything it cannot stand behind: no customer logos, testimonials or statistics, no "GST compliant", no certifications or security guarantees, and no prices or plans. Before adding any of those, confirm them with the product owner and keep the evidence. Anything you are unsure the product does today should be softened or removed from `src/pages/`, especially the capability list on the Capabilities page and the FAQ answers.

## Before launch

The content document's launch checklist (Part 14.4 and 14.5) applies. Items in square brackets in the document were left out of the pages rather than invented, so the following still need real details:

- [ ] **Contact details.** Contact email, phone, business hours and address for the Contact page and footer. Set `contactEmail` in `src/site.json` so the form error message can show it.
- [ ] **Response timeframe.** Set `responseTime` in `src/site.json` (for example `2 working days`). Until then the form confirmations say "soon".
- [ ] **Support channels and hours.** For "Talk to a real person" on the homepage and How it works page.
- [ ] **Company details.** Legal name, location, year founded and a team note for the About page. Do not add customer numbers, awards or testimonials that cannot be verified.
- [ ] **Export and retention.** Export formats, export timing and data retention after cancelling, for the Your data section and the Terms.
- [ ] **Pricing approach and any trial or pilot.** For Editions and the FAQ. No prices, user limits or turnover ranges are published.
- [ ] **Privacy and Terms.** Both are drafts with a banner and `noindex`. Have them written or reviewed by a legal adviser, then remove the banner and `noindex`.
- [ ] **Sign In link.** The header's "Sign In" only appears once `appUrl` in `src/site.json` is set to the real app login URL.
- [ ] **Domain.** Replace the placeholder `https://www.onesync.example` in `src/site.json` (or pass `SITE_URL`). Canonicals, sitemap, robots and structured data all depend on it.
- [ ] **Enquiry forms.** Set `formEndpoint` in `src/site.json` to a service that accepts a JSON POST (Formspree, Netlify Forms, your own API) and send it to a monitored inbox. Until it is set, both forms validate and show a clearly labelled "Preview mode: not sent" message.
- [ ] **Claims review.** Confirm every statement describes something the product does today. Make no claim of GST, e-invoice or e-way bill support, and none about manufacturing execution, retail billing counters, payroll, HR or forecasting.
- [ ] **Search titles.** Several titles and descriptions given in the content document are longer than the document's own guideline of about 60 and 160 characters. They are used as written; shorten them if you want to follow the guideline.
- [ ] **Brand.** The logo mark is a simple placeholder. Replace it if there is an approved logo.
- [ ] **Social preview.** Add a 1200x630 PNG and an `og:image` tag in `src/layout.html`.
- [ ] **Fonts.** Manrope loads from Google Fonts. Self-host the WOFF2 files if you want zero third-party requests, and update the privacy page if you keep Google Fonts.
- [ ] **Analytics.** None is installed. If added, add a purpose, privacy wording and consent as needed, then update the privacy page.
- [ ] **Search tools.** Verify Search Console and Bing Webmaster Tools, submit `sitemap.xml`, protect staging from indexing.
