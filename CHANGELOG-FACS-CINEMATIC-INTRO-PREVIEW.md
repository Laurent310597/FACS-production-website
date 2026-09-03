# FACS Cinematic Intro Preview

## Scope

- Replaces the existing 3.6-second static logo overlay on the public homepage.
- Adds a cinematic, code-native 3D particle field and four connected capability orbits.
- Enlarges and rebalances the Finance, Tax, Legal and Operations markers around the central logo.
- Keeps the existing homepage, navigation, content, CMS, Supabase and email flows unchanged.

## Experience

- The sequence now follows a deliberate arrival, hold and departure rhythm: the field converges around `FACS.`, settles long enough to read, then pushes through into the live homepage.
- The four capability markers represent Finance, Tax, Legal and Operations.
- Animated connector paths and a central aperture clarify the relationship between each capability and the FACS brand.
- The full cinematic sequence runs for about 4.6 seconds before its final page fade, appears once per browser session and can be skipped immediately.
- Add `?intro=1` to the homepage URL to force a replay during design review.
- Add `?intro=1&motion=full` to force the full-motion review even when the device requests reduced motion.

## Performance and accessibility

- Uses the existing Framer Motion dependency plus a native Canvas projection engine.
- Adds no external model, video, iframe or runtime dependency.
- Uses a reduced particle count on small screens.
- Respects `prefers-reduced-motion` with a readable 3-second static treatment and keeps the skip control available.
- Preserves a working homepage if Canvas is unavailable.

## Release controls

- Preview branch: `feature/facs-cinematic-intro`.
- No Production merge is included in this scope.
- A pull request must only be created after Preview feedback and explicit approval.
