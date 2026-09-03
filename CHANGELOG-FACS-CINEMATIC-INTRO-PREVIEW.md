# FACS Cinematic Intro Preview

## Scope

- Replaces the existing 3.6-second static logo overlay on the public homepage.
- Adds a cinematic, code-native 3D particle field and four connected capability orbits.
- Keeps the existing homepage, navigation, content, CMS, Supabase and email flows unchanged.

## Experience

- The sequence begins in the FACS navy environment, converges around `FACS.`, and pushes through into the live homepage.
- The four capability markers represent Finance, Tax, Legal and Operations.
- The intro runs once per browser session and can be skipped immediately.
- Add `?intro=1` to the homepage URL to force a replay during design review.

## Performance and accessibility

- Uses the existing Framer Motion dependency plus a native Canvas projection engine.
- Adds no external model, video, iframe or runtime dependency.
- Uses a reduced particle count on small screens.
- Respects `prefers-reduced-motion` and exits through a short static treatment.
- Preserves a working homepage if Canvas is unavailable.

## Release controls

- Preview branch: `feature/facs-cinematic-intro`.
- No Production merge is included in this scope.
- A pull request must only be created after Preview feedback and explicit approval.
