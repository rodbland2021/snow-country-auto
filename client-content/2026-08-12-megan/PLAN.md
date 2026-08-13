# Snow Country Auto Website - Plan of Action (2026-08-13)

Context recap, gap analysis, pushback points, and a scope-of-work skeleton
for turning Megan's 2026-08-12 content dump into a quoted project. See
`DIGEST.md` in this folder for the raw content summary.

## Where this project actually stands

- Business: Snow Country Auto, 29 Lee Ave, Jindabyne NSW 2627. Owned by
  Kristian; his wife Megan is the day-to-day contact and will maintain the
  site herself (non-technical).
- Current live site (snowcountryautos.com.au) is an old, unmaintained
  WordPress site that hasn't been touched since a change of ownership - it
  still carries stale/generic SEO-stuffed titling, confirmed live today.
- 2026-04-01/02: a WordPress rebuild was designed and approved (Hostinger
  managed WP + Cloudflare + Astra theme + WPForms + Yoast SEO, built
  programmatically via the WP REST API, handed to Megan as Editor). Wix was
  formally evaluated and ruled out because it has no API for page/content
  creation - only for CMS/product data.
- That build was never started - it was blocked on real content and photos
  from Megan. Nothing in `scripts/sca-wp-build/` was ever executed against
  a live WordPress install (the handover guide and plan exist only as
  drafted documents).
- An earlier static HTML/CSS/JS mockup exists in the root of this repo
  (`index.html`, `shop.html`, `book.html`, Stripe checkout via Cloudflare
  Worker) - that was explicitly a **design reference only**, built for
  Kristian, and included features (shop, online booking) that were
  deferred out of scope for the actual WordPress build.
- GitHub backlog already has 6 open issues on this repo (#1-6): three Shop
  Phase 4 items, Kristian's own Stripe account, confirm branding name, and
  an agentic-search readiness audit. Shop/Stripe items are pre-existing
  scope-creep from the mockup, not part of the agreed WP build.
- Four months later, Megan has now sent a partial content dump from a
  session with a Chamber of Commerce advisor and asked Rod to take it from
  here and finish it.

## Gap analysis - what's usable vs what's missing

**Usable now (near copy-ready):**
- Home page copy (About, Why Choose Us, service overview, local/seasonal
  framing, tagline "Service with Altitude")
- Full 20-item services list
- Blog name shortlist + 10 content pillars with example post titles
- Contact basics (address, phone, SMS, email, Facebook)
- Domain registrar (Webcentral, username SNO-278)

**Missing, now drafted from the current site (awaiting Megan's review):**
- Diesel Tuning page copy (doc had a title only) - see `drafts/diesel-tuning.md`
- 4WD Specialist page copy (folder was empty) - see `drafts/4wd-specialist.md`
- Brands page copy/list (folder was empty) - see `drafts/brands.md`

**Still missing:**
- Contact Us page detail beyond the basics above (folder empty)
- FAQs (folder empty)
- Photos (none attached - only a naming-convention note)
- Any budget/timeline confirmation since the April plan

## Pushback on the Chamber of Commerce advice / Megan's requests

Being friends doesn't change the fact some of this advice needs a second
opinion before it goes into a quote:

1. **"Similar look" reference is a Wix template.** We already ruled Wix out
   in April specifically because it can't be driven by an API - it would
   mean fully manual admin work with no repeatable build process, and
   breaks Megan's non-technical maintenance requirement. Recommendation:
   use that Wix template purely as a *visual/layout* reference and keep
   building on WordPress. Frame this clearly to Megan so it doesn't read as
   ignoring her brief - we're matching the look, not the platform.

2. **Podium pop-up.** Podium is a paid lead-management/webchat/reviews SaaS
   product, typically several hundred dollars a month - well outside the
   ~$20-30/month hosting budget the original plan assumed. Before quoting
   it, need to know what specific problem it's meant to solve (webchat?
   review requests? missed-call text-back?). A WPForms enquiry form plus
   the existing SMS number and a Google Business Profile message button
   likely covers most of the same need at $0 recurring cost. Worth asking
   whether the Chamber of Commerce advisor has any affiliation with Podium,
   and whether Kristian/Megan have actually budgeted for a SaaS subscription
   here.

3. **"Separate page for each section, there's a lot of content."** True for
   the big pillars (Home, Diesel Tuning, 4WD Specialist, Services, Contact,
   FAQ, Blog) but 20 separate pages for every individual service works
   against Megan being able to maintain the site herself - more pages means
   more places to keep something like a phone number in sync (the original
   handover guide already has to remind her to update the footer *and* the
   Contact page separately). Recommendation: one Services page with the 20
   items as sections/anchors, keeping only Diesel Tuning and 4WD Specialist
   as their own pages (as already flagged in her doc), rather than 20
   individual URLs.

4. **Century Gothic.** It's a licensed desktop font, not a free web font -
   using it properly needs a paid web-font license and adds load weight.
   Recommend a close, free Google Fonts alternative (e.g. Poppins or
   Questrial - both geometric sans-serifs visually close to Century
   Gothic) instead, consistent with how the earlier mockup already uses
   free Google Fonts.

5. **Blog.** The pillar/topic list is solid, but a blog is only worth the
   build cost if someone actually keeps publishing to it. Their own note
   ("get boys to talk into Chat to create blog content") suggests they
   intend to generate posts themselves via AI, which is fine, but worth
   confirming realistic cadence before we build out a full blog
   infrastructure. Recommendation: ship the blog *structure* plus 2-3 seed
   posts at launch, not a large content backlog nobody has committed to
   maintaining.

6. **AI-generated mechanic images.** Agree entirely with Megan's instinct
   here - AI-generated "Snowy Mountains mechanic" images tend to look
   generically North American, not Australian alpine. Push further than
   just avoiding AI, though: real photos of the actual workshop, signage,
   team and a vehicle or two on the hoist will read as more trustworthy for
   a local service business than any generated image, and also help local
   SEO / Google Business Profile trust signals. Recommend a short photo
   session (Rod, Megan, or a local photographer) rather than trying to
   prompt-engineer around the AI look problem.

7. **Shop and online booking.** Neither appears in this content dump.
   Both were explicitly deferred in the April plan (shop to a future
   WooCommerce phase; booking because Megan wasn't keen). Recommendation:
   keep both explicitly out of scope for this quote unless Megan says
   otherwise - don't let the old mockup's built-out Stripe shop pull scope
   back in by default.

## Branding - resolved

Megan's email signature confirms it: "Snow Country Auto" (snowcountryauto.com.au,
ABN 94 675 334 086, MVRL61982). Not "Automotive" or "Autos". GitHub issue #5
closed with this evidence.

## Diesel Tuning / 4WD Specialist / Brands - drafted, not just asked about

Rather than asking Megan whether to write these or leave them blank, drafted
all three directly from her approved Home page copy plus content already live
on snowcountryautos.com.au (pulled via its open WP REST API - the current site
exposes /wp-json/wp/v2/pages with full page content). See
`drafts/diesel-tuning.md`, `drafts/4wd-specialist.md`, `drafts/brands.md`.

Per Rod: all brand names already shown on the current site carry straight
over to the new one - no gatekeeping on whether Snow Country Auto is still
an authorised reseller for each one. Full list carried over: ARB, Ironman
4x4, Old Man Emu, Fulcrum Suspension (Bilstein/Sachs/Monroe/King Springs),
Roadsafe 4WD, Super Pro Bushes, Drivetech 4x4 (inc. Sumo Springs), Warn,
Safari, Hayman Reese, Redarc, KORR Lighting, GME, Polaris Systems, Sakura
Filtration, Companion Brands, Torqit Performance, Super Mini Booster, plus
tyre brands Kumho, Bridgestone, Federal, Mastercraft, Continental, GT
Radial, Toyo, Mickey Thompson. All sent inline in the questions email for
Megan to mark up (not asked as an open question).

## Open questions to send Megan (remaining gaps before quoting)

1. Contact Us - beyond address/phone/SMS/email/Facebook already supplied:
   opening hours? Google Map embed? Has the Instagram account (noted as
   "TBA") been created since?
2. FAQs - can she send 5-10 real customer questions, or should Rod draft a
   starter set from the Home content for her to approve?
3. Photos - can she organise a short shoot of the workshop, team, and a
   vehicle or two, plus current logo files (vector/transparent PNG)?
4. Podium pop-up - what's it meant to do, and is there budget for a
   recurring SaaS cost, or is a free form/SMS/GBP-message approach fine?
5. Webcentral (SNO-278) - can she share access (1Password/invite, not a
   plaintext password over email) so DNS can be handled at cutover?
6. Old site wp-admin - does she have login access, in case anything on the
   current site (old enquiry form entries, etc.) is worth pulling before
   replacement?
7. Booking form and shop - still deferred, or has her thinking changed
   since April?
8. Budget/timeline - is the original ~$20-30/month hosting budget still
   right, and is there a target launch date (e.g. before next snow
   season)?

## Toward a scope of work / quote

Structure recommendation - fixed-price phases, not hourly, so it stays
simple and unambiguous for a friend-and-client relationship:

- **Phase 0 - Content close-out:** resolve the open questions above,
  confirm branding, get real photos organised. Gates everything else.
- **Phase 1 - Missing copy:** draft Diesel Tuning, 4WD Specialist, Brands,
  Contact detail, and FAQ content for her review/approval, built from what
  she's already supplied plus her answers to Phase 0.
- **Phase 2 - Build:** execute the WordPress API build (this plan already
  exists from April but needs a fresh pass given it's 4 months old and the
  content has changed) - Hostinger managed WP, Cloudflare DNS/CDN, Astra
  theme, WPForms, Yoast SEO, all pages + menus + settings via the REST API.
- **Phase 3 - Review + handover:** internal review, Megan review round,
  domain cutover from the old site, editor account + updated one-page PDF
  guide, walkthrough.
- **Out of scope for this quote (future phases, priced separately if/when
  wanted):** blog content pipeline beyond seed posts, online booking,
  WooCommerce shop, Podium or equivalent, agentic-search/AI-discovery
  readiness (already tracked as open issue #6).

Payment/agreement: a short, plain-English scope of work plus a fixed price
per phase (e.g. 50% on approval, 50% on handover), confirmed in writing
even if that's just an emailed agreement - not a heavy legal contract, but
specific enough that "done" is unambiguous for both sides. Lawpath (already
used for other Blandford legal docs) can produce a simple one-page services
agreement template if a formal signed document is wanted on top of the
emailed quote.

## Not yet done

- Questions above have not been sent to Megan - drafting them is complete,
  sending is Rod's call.
- No quote or services agreement has been drafted yet - needs Rod's pricing
  input first.
- GitHub issues for the concrete work items below are being filed on
  `rodbland2021/snow-country-auto` for tracking, but nothing has been
  communicated to Megan.
