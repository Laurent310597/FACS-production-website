# FACS Website v20.3.1 — Bilingual Author Names and Article Slugs

## Updated fields

- Separate Vietnamese and English author names: `author_name_vi`, `author_name_en`.
- Separate Vietnamese and English article URLs: `slug_vi`, `slug_en`.

## Public website behavior

- Vietnamese Insights pages use `slug_vi` and `author_name_vi`.
- English Insights pages use `slug_en` and `author_name_en`.
- Switching VI/EN on an article replaces the URL with the corresponding localized slug.
- The original `slug` remains a permanent legacy alias, so previously shared links continue to work.

## Email behavior

- The Vietnamese section of an Insight notification links to the Vietnamese slug.
- The English section links to the English slug.

## Data protection

- Existing author names and slugs are copied into both new language fields during migration.
- Cross-language slug collision protection prevents ambiguous article URLs.
