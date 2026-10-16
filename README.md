# Nexus Frontier Partners — website

Static site for Nexus Frontier Partners (provisional name). Plain HTML, CSS and one small script: no build step, no dependencies. Hosted on GitHub Pages; a custom domain can be mapped later.

## Structure

```
index.html            Home (English)
what-we-do.html       Services
sectors.html          Sectors
how-we-work.html      Six requirements, five stages, two routes, fees
about.html            The firm and its principles
insights.html         Article list
insights/*.html       Articles (English)
contact.html          Contact form (opens the visitor's mail app)
privacy.html          Privacy notice (English)
404.html              Not-found page
ko/                   Korean pages (same names)
assets/css/site.css   Styles
assets/js/site.js     Contour fields, navigation, contact form
assets/img/           Favicon
```

## Things to change before launch

1. **Contact email** — `CONTACT_EMAIL` at the top of `assets/js/site.js`. It is used by the contact form and shown on the contact page.
2. **Search engines** — every page carries `<meta name="robots" content="noindex, nofollow">` while the site is in preview. Remove that line from all pages when the firm's domain is live.
3. **Company details** — the footer and `ko/privacy.html` section 7 (개인정보 보호책임자) need the registered company name, address and the privacy officer's name once the company is incorporated.
4. **Custom domain** — in the repository settings, Pages → Custom domain. GitHub will create a `CNAME` file. All links in the site are relative, so nothing else needs to change.
5. **Photos** — the site uses drawn contour fields instead of photographs. To add site photography later, place images in `assets/img/` and swap the `.field` blocks in the sector tiles.

## Editing

Pages are plain HTML. Shared parts (header, footer) are repeated in each file; a change to them has to be made in every page. Keep the design rules: paper background, serif headings, one accent colour, hairlines instead of boxes, no stock photography.

## Design notes

Palette: paper `#F7F3EE`, ink `#2A2925`, graphite `#5F5C55`, hairline `#D8D1C5`, survey blue `#1F4E79`, deep water `#0F1B26`.
Type: Source Serif 4 (headings, article text), Noto Serif KR (Korean headings), Pretendard (body).
