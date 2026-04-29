# Handoff: Product by Kel — AI News Carousel

## Overview
An Instagram carousel template for the channel **@productbykel** that auto-generates daily AI/Product Management news briefs. The carousel consists of 5 slides: a cinematic cover, 3 story slides, and a CTA. Content is AI-generated on load via the Claude API (currently using `window.claude.complete` in the prototype — swap for a real API call in production).

## About the Design Files
The files in this bundle are **high-fidelity design references built in HTML/React**. They are prototypes showing the intended look, behavior, and content structure — not production code to copy directly. The task is to **recreate these designs in your target codebase** (React, Next.js, etc.) using its established patterns and libraries. The HTML files can be opened in a browser for reference.

**Primary reference file:** `AI News Carousel.html`  
**Cream variant reference:** `AI News Carousel v4 (cream - reference).html`

## Fidelity
**High-fidelity.** This is a pixel-accurate prototype with final colors, typography, spacing, interactions, and content. Recreate the UI precisely using the measurements and tokens below.

---

## Slide Structure (5 slides, 1080×1080px each)

### Slide 1 — Cover
**Purpose:** Hook slide. Cinematic, grabs attention on the Instagram feed.

**Layout:**
- Full 1080×1080px canvas
- Background: real photo at 55% opacity (`background-size: cover`, `background-position: center 40%`)
- Dark gradient overlay on top: `linear-gradient(160deg, rgba(5,10,20,0.4) 0%, rgba(5,10,20,0.75) 55%, rgba(5,10,20,0.97) 100%)`
- Top accent stripe: 5px tall, `linear-gradient(90deg, #1A8EFF 0%, transparent 80%)`
- Content column: `padding: 52px 60px`, full height flex column

**Components:**
- **Top row** (flex row, `gap: 16px`, `margin-bottom: 48px`):
  - Handle: blue dot (7×7px, `#3B9EFF`) + `@productbykel` in white, 20px, weight 700
  - Divider: 1px wide, 20px tall, `rgba(255,255,255,0.25)`
  - Date label: `TECH BRIEF · APRIL 22, 2026`, color `#1A8EFF`, 18px, weight 700, letter-spacing 0.1em
- **Headline** (centered vertically in remaining flex space):
  - Font: DM Sans 800, 84px, white, line-height 1.02, letter-spacing -0.03em
  - AI-generated, 6–10 words
  - Below: 64×4px blue `#1A8EFF` underline bar, `border-radius: 2px`, `margin-bottom: 24px`
  - Hook text: `rgba(255,255,255,0.55)`, 24px weight 400, `"Here's what every PM and builder needs to know →"`
- **Stat cards row** (flex, `gap: 12px`, 3 cards):
  - Each: `flex: 1`, `background: rgba(255,255,255,0.08)`, `backdrop-filter: blur(16px)`, `border-radius: 14px`, `padding: 18px 20px`, `border: 1px solid rgba(255,255,255,0.14)`
  - Number: `#1A8EFF`, 40px, weight 700, letter-spacing -0.02em
  - Label: `rgba(255,255,255,0.5)`, 15px, margin-top 7px

---

### Slides 2–4 — Story Slides
**Purpose:** One news story per slide. Warm cream editorial feel with image thumbnail.

**Layout:**
- Background: `#F2EFE8` (warm cream)
- `padding: 52px 60px 44px`
- Top accent stripe: 5px, `linear-gradient(90deg, #1A8EFF 0%, transparent 80%)`

**Components:**
- **Top row** (`margin-bottom: 32px`):
  - Category label (underline treatment — NO pill/chip):
    - Text: `#1A8EFF`, 20px, weight 700, letter-spacing 0.12em, uppercase, `white-space: nowrap`
    - Underline: 2.5px tall div, background `#1A8EFF`, `border-radius: 1px`, full width of text, `margin-top: 8px`
  - Slide counter: `rgba(13,27,42,0.25)`, 20px, weight 500 — right-aligned
- **Headline + thumbnail row** (`gap: 28px`, `margin-bottom: 28px`):
  - Headline (`flex: 1`): `#0D1B2A`, 58px, weight 800, line-height 1.04, letter-spacing -0.03em, `-webkit-line-clamp: 4`
    - Key term highlighted in `#1A8EFF`
  - **Image thumbnail**: 210×168px, `border-radius: 16px`, `object-fit: cover`, `box-shadow: 0 8px 28px rgba(13,27,42,0.18)`, `border: 1px solid rgba(13,27,42,0.08)`, `margin-top: 4px`
    - Pulled from `IMAGES.story{n}` config
- **Data cards** (flex column, `gap: 10px`, `margin-bottom: 20px`):
  - Each card: `background: #FFFFFF`, `border-radius: 14px`, `padding: 22px 28px`, `border: 1px solid rgba(13,27,42,0.08)`, `box-shadow: 0 2px 12px rgba(13,27,42,0.06)`
  - Label: `rgba(13,27,42,0.48)`, 18px, weight 500
  - Value: `#1A8EFF`, 22px, weight 700, `white-space: nowrap`, `text-overflow: ellipsis`, max-width 260px
- **Kel's Take box** (`margin-top: auto`):
  - Background: `#0D1B2A` (dark navy)
  - `border-radius: 14px`, `padding: 20px 24px`
  - Label: `"KEL'S TAKE"`, color `#1A8EFF`, 18px, weight 700, letter-spacing 0.1em, uppercase, `margin-bottom: 10px`
  - Body text: white, 22px, weight 400, line-height 1.5
- **Bottom brand** (`margin-top: 20px`):
  - Blue dot (7×7px, `#3B9EFF`) + `@productbykel` in `#0D1B2A`, 20px, weight 700

---

### Slide 5 — CTA
**Purpose:** Follow prompt. Clean dark navy for contrast bookend.

**Layout:**
- Background: `linear-gradient(135deg, #07101d 0%, #0d1a2e 100%)`
- `padding: 60px 72px`
- Top accent stripe: 5px, `linear-gradient(90deg, #1A8EFF 0%, transparent 80%)`

**Components:**
- **Logo mark** (top left, `margin-bottom: auto`): PbkMark SVG — white square icon + blue dot/antenna, 32px
- **"Never miss a brief" label** (underline treatment, same as category label but white/blue):
  - Text: `#1A8EFF`, 18px, weight 700, letter-spacing 0.12em, uppercase
  - Underline: 2.5px, `#1A8EFF`
  - `margin-bottom: 24px`
- **Headline**: `"Follow\n@productbykel"`, white, 88px, weight 800, line-height 1.0, letter-spacing -0.03em, `margin-bottom: 16px`
- **Subtext**: `"for your Tech Brief"`, `rgba(255,255,255,0.45)`, 24px, `margin-bottom: 48px`
- **Platform rows** (flex column, `gap: 12px`):
  - Each: `background: rgba(255,255,255,0.07)`, `backdrop-filter: blur(16px)`, `border-radius: 14px`, `padding: 20px 24px`, `border: 1px solid rgba(255,255,255,0.12)`
  - Emoji icon: 24px, width 32px
  - Platform name: `rgba(255,255,255,0.4)`, 18px, weight 700, uppercase, letter-spacing 0.08em, width 110px
  - Handle: white, 20px, weight 600
  - Platforms: Instagram `@productbykel`, YouTube `youtube.com/@productbykel`, TikTok `@productbykel`

---

## Design Tokens

### Colors
| Token | Value | Usage |
|---|---|---|
| `S_BG` | `#F2EFE8` | Story/CTA cream background |
| `S_CARD` | `#FFFFFF` | Data card background |
| `S_TEXT` | `#0D1B2A` | Primary text on cream |
| `S_MUTED` | `rgba(13,27,42,0.48)` | Secondary text on cream |
| `S_MUTED2` | `rgba(13,27,42,0.25)` | Tertiary text (slide counter) |
| `S_BLUE` | `#1A8EFF` | Primary accent on cream slides |
| `BG_DEEP` | `#07101d` | Deep dark background (cover/CTA) |
| `BLUE` | `#3B9EFF` | Brand blue (logo dot, handle dot) |

### Typography
- **Font family:** DM Sans (Google Fonts) — weights 400, 500, 600, 700, 800
- **Cover headline:** 84px / weight 800 / line-height 1.02 / letter-spacing -0.03em
- **Story headline:** 58px / weight 800 / line-height 1.04 / letter-spacing -0.03em
- **CTA headline:** 88px / weight 800 / line-height 1.0 / letter-spacing -0.03em
- **Category label:** 20px / weight 700 / letter-spacing 0.12em / uppercase
- **Data card label:** 18px / weight 500
- **Data card value:** 22px / weight 700
- **Kel's Take body:** 22px / weight 400 / line-height 1.5
- **Handle/branding:** 20px / weight 700
- **Slide counter:** 20px / weight 500

### Spacing
- Slide padding: `52px 60px` (stories), `52px 60px 44px` (stories bottom), `60px 72px` (CTA)
- Card gap: `10–12px`
- Section gap: `28–32px`

### Border Radius
- Data cards: `14px`
- Image thumbnail: `16px`
- Stat cards: `14px`
- Accent underline: `1–2px`

---

## Image Config
Images are controlled via a config object at the top of the file. In production, this should come from a CMS or user input:

```js
const IMAGES = {
  cover:  "path/to/cover-image.jpg",   // Hero image for cover slide
  story1: "path/to/story1-image.jpg",  // Thumbnail for story slide 2
  story2: "path/to/story2-image.jpg",  // Thumbnail for story slide 3
  story3: "path/to/story3-image.jpg",  // Thumbnail for story slide 4
};
```

The cover image renders at 55% opacity with a dark gradient overlay.  
Story images render as 210×168px rounded thumbnails beside the headline.

---

## AI Content Generation
The carousel fetches news content from Claude on load. The prompt requests structured JSON:

```json
{
  "coverHeadline": "6-10 word punchy summary",
  "date": "April 22, 2026",
  "stories": [
    {
      "category": "AI · FUNDING",
      "headlinePrefix": "2-4 words",
      "headlineHighlight": "key term in blue",
      "headlineSuffix": "rest of headline.",
      "cards": [
        {"key": "Data label", "value": "Short stat"},
        {"key": "Data label", "value": "Short stat"}
      ],
      "kelsTake": "One actionable PM insight (15-20 words).",
      "coverStat": {"number": "$33B", "label": "Brief label"}
    }
  ]
}
```

**Note:** Card values must be short (numbers/abbreviations only) to avoid text overflow at 22px.

In production, replace `window.claude.complete()` with your backend API call to Claude or whichever LLM you use.

---

## Interactions & Behavior
- **Navigation:** Arrow keys (←/→), click zones (left/right 22% of slide), touch swipe (>40px threshold)
- **Slide persistence:** Current slide index stored in `localStorage`
- **Content regeneration:** "↻ Regen" button calls the AI fetch again, resets to slide 0
- **Loading state:** Cream background with bouncing blue dots while AI fetches

---

## Assets
| File | Usage |
|---|---|
| `assets/sample-cover-image.png` | Sample background photo (AI robots at computers) — replace with real editorial photos per post |

---

## Files
| File | Description |
|---|---|
| `AI News Carousel.html` | **Primary design reference** — final version with image bg cover + cream editorial story slides |
| `AI News Carousel v4 (cream - reference).html` | Alternate version — all-cream including cover, for reference |
| `assets/sample-cover-image.png` | Sample image used in the prototype |
