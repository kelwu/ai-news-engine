# AI News Engine — Project Context

## What This Is
An automated Instagram content pipeline for **@productbykel** — a channel targeting PMs and AI builders. Every 2–3 days it ingests AI news, generates a script and carousel, and publishes to Instagram. Built as a build-in-public series for YouTube.

---

## Tech Stack
- **Frontend/Backend:** Next.js (App Router) + Tailwind, hosted on Vercel
- **Database + Storage:** Supabase (PostgreSQL + Storage buckets)
- **AI:** Claude API (Sonnet) — script generation, carousel copy, image prompts
- **Images:** fal.ai + Flux 1.1 Pro (generates 3 images per episode)
- **Voiceover:** ElevenLabs
- **Video rendering:** Remotion Lambda (AWS) — renders reel as MP4, carousel as JPEG stills
- **News sources:** NewsAPI + TLDR AI RSS feed
- **Publishing:** Instagram Graph API v25.0

---

## Pipeline Flow

```
/api/ingest
  → fetches NewsAPI + TLDR RSS, creates episode row (status: "ingested")

/api/generate-script
  → Claude agent with tool use (fetches full article text for top candidates)
  → picks best story for reel, suggests 3–5 carousel candidates
  → writes: script, selected_story, carousel_candidates, recommended_format, format_reason
  → status: "story_selection"

[Manual gate — dashboard]
  → User sees inline StorySelector on main page
  → Picks format: reel / carousel / both
  → Selects exactly 3 stories for carousel (Claude pre-selects, user can override)

/api/confirm-stories
  → If carousel: calls Claude to generate full carousel_data JSON
  → status: "scripted"

/api/generate-image
  → Claude writes 2 image prompts from the reel headline
  → Generates 3 images via fal.ai (og:image + 2 AI-generated)
  → Stores as image_url (primary) + image_urls[] (array)
  → status: "imaged"

/api/voiceover
  → ElevenLabs TTS from the reel script
  → status: "voiced"

/api/render       → Remotion Lambda renders reel MP4 (9:16, 1080×1920)
/api/render-carousel → Remotion Lambda renders 5 carousel JPEGs (1:1, 1080×1080)

/api/publish
  → Posts reel and/or carousel to Instagram Graph API
  → status: "published"
```

---

## Episode Status Values
`pending` → `ingested` → `story_selection` → `scripted` → `imaged` → `voiced` → `rendered` → `published`

---

## Supabase Schema (episodes table)
Key columns:
- `id`, `scheduled_for`, `status`, `error`
- `raw_stories` — JSON array of all fetched stories
- `selected_story` — `{ headline, source, url }` — the reel story
- `script` — 45-second voiceover script (110–130 words)
- `caption`, `hashtags`
- `carousel_candidates` — `[{ story_index, reason }]` — Claude's suggestions
- `carousel_data` — full structured JSON for carousel slides
- `carousel_urls` — array of 5 rendered JPEG URLs
- `recommended_format` — `"reel" | "carousel" | "both"`
- `format_reason` — one sentence from Claude
- `image_url` — primary image
- `image_urls` — array of 3 images
- `voiceover_url`
- `video_url`

---

## Dashboard Pages
- `/` — Today's episode: pipeline status, inline story selector (when status = story_selection), continue pipeline button, link to review
- `/review` — Preview voiceover, reel video, carousel slides; render + publish controls
- `/select` — Standalone story selection page (same as inline, accessible via direct URL)
- `/episodes` — Episode history
- `/settings` — Settings

---

## Carousel Design (CarouselSlide.tsx — Remotion)

**5 slides, 1080×1080:**

**Slide 0 — Cover:**
- Cream `#F2EFE8` background
- Full-width image embedded at top (~380px), no overlay
- Below: @productbykel · TECH BRIEF · DATE brand row
- Large headline (80px, dark navy)
- Three orange dots separator
- Subtext: "Here's what every PM and builder needs to know →"
- 3 stat cards at bottom (white cards, orange numbers from coverStat)

**Slides 1–3 — Story:**
- Cream background
- Orange top accent stripe
- Category label: rectangular outlined box, no border-radius (e.g. "AI · FUNDING")
- Headline with orange highlight keyword + image thumbnail (210×168, right side)
- Body text (2–3 sentences)
- 2 data cards (white, orange value)
- "Kel's Take" block (dark navy bg, orange label, white text)
- @productbykel brand mark at bottom

**Slide 4 — CTA:**
- Cream background
- PbK logo mark (dark stroke, orange dot)
- "Never miss a brief" rectangular outlined tag
- Large "Follow @productbykel" headline
- Platform list: Instagram, YouTube, TikTok (white cards)

**Design tokens:**
- `S_BG = #F2EFE8` (cream)
- `S_BLUE = #EA580C` (burnt orange — all accents)
- `S_TEXT = #0D1B2A` (dark navy)
- `S_CARD = #FFFFFF`
- Font: DM Sans

---

## Reel Design (AINewsReel.tsx — Remotion)
- 1080×1920 (9:16 vertical)
- Crossfading images (Ken Burns effect) over dark background
- Orange accent stripe at top
- @productbykel brand dot + handle
- "TECH BRIEF" badge (orange)
- Large headline
- Animated subtitle segments (script split into 4 chunks, fade in/out)
- Orange progress bar at bottom
- ElevenLabs voiceover audio

---

## Claude Agent (generate-script)
Uses tool use with two tools:
- `fetch_article` — fetches full article text (strips HTML, first 4000 chars)
- `finalize_output` — structured output with all fields

System prompt targets: PM/builder audience, 45-second reel, carousel with 3 stories, format recommendation logic.

---

## carousel_data JSON Structure
```json
{
  "coverHeadline": "6-10 word punchy headline",
  "date": "April 27, 2026",
  "stories": [
    {
      "category": "AI · FUNDING",
      "source": "TechCrunch",
      "url": "https://...",
      "headlinePrefix": "1-3 word intro",
      "headlineHighlight": "key term in orange",
      "headlineSuffix": "rest of headline.",
      "body": "2-3 sentences. Specific details.",
      "cards": [
        { "key": "stat label", "value": "$33B" },
        { "key": "second stat", "value": "10 yrs" }
      ],
      "kelsTake": "One PM-specific insight sentence.",
      "coverStat": { "number": "$33B", "label": "Amazon → Anthropic" }
    }
  ]
}
```

---

## Key Decisions
- **Manual review gate** before publish — user approves every episode (v1)
- **Story selection gate** — Claude recommends, user picks final 3 for carousel
- **Image provider is modular** — swap isolated to `/api/generate-image`
- **Remotion Lambda** over Creatomate — full ownership of render pipeline
- **Format flexibility** — each episode can be reel-only, carousel-only, or both

---

## What's Working
- Full pipeline end-to-end is coded
- Instagram credentials in `.env.local` (token expires ~60 days, needs refresh)
- Remotion Lambda function deployed in us-west-2
- Remotion serve URL updated to latest bundle (67eincz25f)
- New cream/orange design deployed

## What's Next / To Validate
- End-to-end test render with real images
- Confirm carousel and reel render correctly with new design
- Set up Vercel Cron for automated daily ingestion
- Long-term: token refresh automation for Instagram access token
