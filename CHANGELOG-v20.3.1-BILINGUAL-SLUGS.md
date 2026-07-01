# FACS Website v20.3.1 — Bilingual Article Slugs

- Added separate `slug_vi` and `slug_en` fields for each Insight article.
- Vietnamese pages use the Vietnamese slug; English pages use the English slug.
- Switching language on an article automatically replaces the URL with the matching localized slug.
- Existing legacy URLs continue to work through the original `slug` alias.
- Email notifications use the Vietnamese link in the Vietnamese section and the English link in the English section.
- Added cross-language slug collision protection.
