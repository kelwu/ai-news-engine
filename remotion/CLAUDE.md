# Remotion composition conventions

**`Img` not `<img>`:** always use `Img` from `remotion` for images. Remotion's `Img` integrates with the render pipeline for frame-accurate asset loading — native `<img>` tags will produce blank frames in Lambda renders.

**Fonts:** load via `@remotion/google-fonts/{FontName}` at module level, then spread `fontFamily` into every text style. Never use a CSS `@import` or a `<link>` tag — those don't work in the Remotion renderer.

**Styles:** inline styles only. No CSS classes, no Tailwind. Remotion renders in a headless Chromium context where external stylesheets may not load reliably.

**Design tokens:** define colors and layout constants as module-level `const` before any component. This is the source of truth — don't hardcode hex values inline.

**Sub-components:** define helper components in the same file, above the main export. Splitting into separate files is fine only if the component is shared across compositions.

**Root container:** `AbsoluteFill` as the root element of every slide or composition.

**Animation hooks:** only import `useCurrentFrame`, `interpolate`, `spring`, etc. in compositions that animate. Static image compositions (like `CarouselSlide`) should not import them — it signals intent and avoids accidental frame-dependent bugs.

**`interpolate` calls:** always set `extrapolateLeft: "clamp"` and `extrapolateRight: "clamp"` unless you explicitly need extrapolation. Unclamped interpolation produces values outside [0, 1] for opacity and causes visual glitches.
