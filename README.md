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
assets/js/site.js     Contour fields, navigation, contact form, video loading
assets/js/twin.js     Project twin (animated 3D site model, canvas only, no libraries)
assets/img/           Favicon
```

## Media

Photographs and video are hotlinked from Pexels under the Pexels licence (free for commercial use, no attribution required; a credit line is in the footer anyway). They are not stored in this repository. Each `<video>` carries up to three sources (`data-src-uhd` 3840×2160, `data-src-qhd` 2560×1440, `data-src-hd` 1920×1080); `site.js` picks the largest that suits the screen, loads it only when the element scrolls into view, and leaves the poster image in place when the visitor prefers reduced motion or has data saving on. Photographs use `srcset` up to 3840 px wide.

To replace them with the firm's own photography, put the files in `assets/img/` and change the URLs in the pages (or in the generator's `PHOTOS` / `VIDEOS` tables).

The "project twin" on the home and sectors pages is an illustrative model drawn in `twin.js`: terrain contours, a reservoir, a treatment plant, farmland, a solar array and a data-centre campus, with water and power flows. It is labelled as illustrative and does not depict any real project. `data-twin="project|water|agri|dc"` selects which elements are shown.

## Things to change before launch

1. **Contact email** — `CONTACT_EMAIL` at the top of `assets/js/site.js`. It is used by the contact form and shown on the contact page.
2. **Search engines** — every page carries `<meta name="robots" content="noindex, nofollow">` while the site is in preview. Remove that line from all pages when the firm's domain is live.
3. **Company details** — the footer and `ko/privacy.html` section 7 (개인정보 보호책임자) need the registered company name, address and the privacy officer's name once the company is incorporated.
4. **Custom domain** — in the repository settings, Pages → Custom domain. GitHub will create a `CNAME` file. All links in the site are relative, so nothing else needs to change.
5. **Photos and video** — currently Pexels stock media (see Media above). Replace with the firm's own project photography when available.

## Editing

Pages are plain HTML. Shared parts (header, footer) are repeated in each file; a change to them has to be made in every page. Keep the design rules: paper background, serif headings, one accent colour, hairlines instead of boxes; photography and video are aerial, muted and infrastructural, never people-centred or corporate stock.

## Design notes

Palette: paper `#F7F3EE`, ink `#2A2925`, graphite `#5F5C55`, hairline `#D8D1C5`, survey blue `#1F4E79`, deep water `#0F1B26`.
Type: Source Serif 4 (headings, article text), Noto Serif KR (Korean headings), Pretendard (body).
