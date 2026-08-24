# SEO Strategy

## In scope
- Public marketing and acquisition pages:
  - `/`
  - `/features.html`
  - `/pricing.html`
  - `/guide.html`
- Public static collateral accidentally exposed under `frontend/*.html` when relevant to crawlability or duplicate-content risk

## Out of scope
- Authenticated in-app experiences after login
- API endpoints except where they affect crawlability (`robots.txt`, `sitemap.xml`)
- Admin/internal tools (`/admin/**`, `admin.html`)
- Invite-only landing page (`/invite-pro-trial`)

## Target audience
- Students, researchers, professionals, and teams evaluating an AI research platform

## Primary keywords
- AI research platform
- AI research assistant
- AI tool for students
- AI tool for researchers
- AI research OS

## Dismissed categories
- (None yet)

## Notes from latest scan
- The intended indexed set is the homepage, features, pricing, and primary guide pages.
- Additional HTML files under `frontend/` should be treated as non-indexable unless they are intentionally promoted into the public information architecture.
- Canonical host signals currently conflict between `dynamoai.in` and `app.dynamoai.in`; future scans should expect one preferred host to be chosen and used consistently.
