# Production audit — 1–21

This document records the production-hardening pass for the Narayan Bhandari site.

## Status
1. API routing/security gateway — completed; `api-secure.js` is the canonical gateway and Netlify routes point to it.
2. CMS architecture — completed; `admin.html` is the single CMS entry point; unused `admin-v4*` legacy entrypoints removed.
3. Admin authentication/security — hardened; login rate limiting, hashed credential store, JWT verification and recovery controls are present.
4. Like/Comment abuse controls — hardened; device-scoped unique likes, rate limiting, request validation and comment size limits are present.
5. GitHub write concurrency — hardened at the like path with retry/index repair; remaining GitHub-content writes still rely on SHA preconditions.
6. Upload/content security — hardened; MIME/extension/magic-byte/size checks and HTML sanitization are enforced by the API gateway.
7. Post routing/back behavior — canonical `/post/:id` route and browser history handling are present.
8. SEO/sitemap/share — dynamic sitemap, canonical post pages, JSON-LD and share-preview infrastructure are present; duplicate static sitemap removed.
9. About/Gallery/navigation — separate About and Gallery pages are present with responsive navigation.
10. Loksewa engine — existing stimulus/readiness/resume/PDF layers audited; no destructive consolidation was performed where regression risk was high.
11. Question-bank quality — readiness/blueprint validation is enforced server-side; content correctness still requires human subject-matter review.
12. Paragraph/data/pictorial regression — stimulus grouping and pictorial readiness checks are enforced in the exam API.
13. Resume/timer/answer handling — existing resume layers retained and server-side answer bounds are now validated.
14. PDF — existing PDF layer retained and covered by repository syntax/reference checks.
15. Exam admin/history/users — repaired: CMS now calls the correct history/users actions and user deletion is implemented server-side.
16. Analytics — GA4 server-side reporting integration remains in the CMS.
17. Accessibility — semantic labels, navigation ARIA and form metadata are present; full manual keyboard/screen-reader review remains a human QA task.
18. Performance — lazy loading and cache headers are present; JS consolidation was intentionally limited to avoid breaking the live exam.
19. Mobile/desktop — responsive rules are present across the core pages; production smoke covers route availability, while device-by-device visual QA remains manual.
20. GitHub Actions/repository cleanup — legacy admin files removed and a production smoke/audit workflow added.
21. Final production smoke — automated route/config/syntax checks added; live checks run on pushes to main.

## Important manual checks
- Log into `/admin` and verify the configured Netlify/GA environment variables.
- Start and submit each enabled Loksewa exam once on Android Chrome and desktop Chrome.
- Open a paragraph/data/pictorial question set and confirm the shared stimulus remains visible.
- Test password change and recovery only with the configured secrets.
