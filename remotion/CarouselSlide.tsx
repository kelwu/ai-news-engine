import { AbsoluteFill, Img } from "remotion";
import { loadFont } from "@remotion/google-fonts/PlusJakartaSans";

const { fontFamily } = loadFont();

// ── Design tokens ─────────────────────────────────────────────────
const BLUE    = "#EA580C";
const S_BLUE  = "#EA580C";
const S_BG    = "#F2EFE8";
const S_CARD  = "#FFFFFF";
const S_TEXT  = "#0D1B2A";
const S_MUTED = "rgba(13,27,42,0.48)";
const S_MUTED2 = "rgba(13,27,42,0.25)";

// ── Types ─────────────────────────────────────────────────────────
type StoryData = {
  category: string;
  source?: string;
  url?: string;
  headlinePrefix?: string;
  headlineHighlight?: string;
  headlineSuffix?: string;
  headline?: string;
  body?: string;
  cards: Array<{ key: string; value: string }>;
  kelsTake: string;
  coverStat: { number: string; label: string };
};

export type CarouselSlideProps = {
  slideIndex: number;
  coverHeadline: string;
  date: string;
  stories: StoryData[];
  images: { cover: string; story1: string; story2: string; story3: string };
};

// ── Shared sub-components ─────────────────────────────────────────
function CategoryLabel({ label }: { label: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", alignSelf: "flex-start", border: `2px solid ${S_BLUE}`, padding: "6px 16px", borderRadius: 0 }}>
      <span style={{ color: S_BLUE, fontSize: 20, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", whiteSpace: "nowrap", fontFamily }}>{label}</span>
    </div>
  );
}

// Vertical card: label on top, large value below
function DataCardLight({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      flex: 1, background: S_CARD, borderRadius: 14, padding: "20px 20px",
      display: "flex", flexDirection: "column", gap: 8,
      border: "1px solid rgba(13,27,42,0.08)", boxShadow: "0 2px 12px rgba(13,27,42,0.06)",
    }}>
      <span style={{ color: S_MUTED, fontSize: 22, fontWeight: 500, lineHeight: 1.3, fontFamily }}>{label}</span>
      <span style={{ color: S_BLUE, fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1, fontFamily }}>{value}</span>
    </div>
  );
}

function KelsTakeLight({ text }: { text: string }) {
  return (
    <div style={{ background: S_TEXT, borderRadius: 14, padding: "20px 24px" }}>
      <div style={{ color: S_BLUE, fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, fontFamily }}>Signal</div>
      <p style={{ color: "#fff", fontSize: 26, fontWeight: 400, lineHeight: 1.5, margin: 0, fontFamily }}>{text}</p>
    </div>
  );
}

// ── Slide 0: Cover ────────────────────────────────────────────────
function CoverSlide({ coverHeadline, date, stories, images }: Pick<CarouselSlideProps, "coverHeadline" | "date" | "stories" | "images">) {
  return (
    <AbsoluteFill style={{ background: S_BG, overflow: "hidden" }}>
      {/* Full-bleed image */}
      {images.cover ? (
        <AbsoluteFill>
          <Img src={images.cover} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%" }} />
        </AbsoluteFill>
      ) : null}

      {/* Cream gradient overlay — editorial feel, image visible but cream dominates */}
      <AbsoluteFill style={{ background: "linear-gradient(160deg, rgba(242,239,232,0.45) 0%, rgba(242,239,232,0.72) 45%, rgba(242,239,232,0.97) 100%)" }} />

      {/* Top accent stripe */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg, ${S_BLUE} 0%, transparent 80%)`, zIndex: 2 }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "52px 60px" }}>
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: S_BLUE }} />
            <span style={{ color: S_TEXT, fontSize: 26, fontWeight: 700, fontFamily }}>@productbykel</span>
          </div>
          <div style={{ width: 1, height: 20, background: S_MUTED, flexShrink: 0 }} />
          <span style={{ color: S_BLUE, fontSize: 26, fontWeight: 700, letterSpacing: "0.08em", fontFamily }}>TECH BRIEF · {date.toUpperCase()}</span>
        </div>

        {/* Headline block — centered vertically */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h1 style={{ color: S_TEXT, fontSize: 92, fontWeight: 800, lineHeight: 1.02, letterSpacing: "-0.03em", margin: "0 0 20px", fontFamily }}>
            {coverHeadline}
          </h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 24 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: S_BLUE }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: S_BLUE }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: S_BLUE }} />
          </div>
          <p style={{ color: S_TEXT, fontSize: 34, fontWeight: 400, lineHeight: 1.5, margin: 0, fontFamily }}>
            Here's what every PM and builder needs to know →
          </p>
        </div>

        {/* Stat cards — bottom */}
        <div style={{ display: "flex", gap: 12 }}>
          {stories.map((s, i) => (
            <div key={i} style={{
              flex: 1, background: "rgba(255,255,255,0.75)", borderRadius: 14, padding: "18px 20px",
              border: "1px solid rgba(13,27,42,0.1)", boxShadow: "0 2px 16px rgba(13,27,42,0.08)",
            }}>
              <div style={{ color: S_BLUE, fontSize: 48, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1, fontFamily }}>{s.coverStat?.number}</div>
              <div style={{ color: S_MUTED, fontSize: 26, marginTop: 10, lineHeight: 1.3, fontFamily }}>{s.coverStat?.label}</div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Slides 1–3: Story ─────────────────────────────────────────────
function StorySlide({ story, slideNum, total, imgUrl }: { story: StoryData; slideNum: number; total: number; imgUrl: string }) {
  return (
    <AbsoluteFill style={{ background: S_BG, overflow: "hidden" }}>
      {/* Top accent stripe */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg, ${S_BLUE} 0%, transparent 80%)` }} />

      <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "48px 60px 40px" }}>

        {/* ZONE 1: Header — fixed */}
        <div style={{ flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <CategoryLabel label={story.category} />
          <span style={{ color: S_MUTED2, fontSize: 20, fontWeight: 500, fontFamily }}>{slideNum}/{total}</span>
        </div>

        {/* ZONE 2: Headline + thumbnail — fixed */}
        <div style={{ flexShrink: 0, display: "flex", gap: 28, alignItems: "flex-start", marginBottom: 20 }}>
          <h2 style={{
            flex: 1, color: S_TEXT, fontSize: 52, fontWeight: 800, lineHeight: 1.04,
            letterSpacing: "-0.03em", margin: 0, paddingBottom: 4, fontFamily,
            display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden",
          } as React.CSSProperties}>
            {story.headlinePrefix && <>{story.headlinePrefix} </>}
            {story.headlineHighlight && <span style={{ color: S_BLUE }}>{story.headlineHighlight}</span>}
            {story.headlineSuffix && <> {story.headlineSuffix}</>}
            {!story.headlinePrefix && story.headline}
          </h2>
          {imgUrl ? (
            <div style={{ width: 180, height: 144, borderRadius: 14, overflow: "hidden", flexShrink: 0, marginTop: 4, boxShadow: "0 8px 28px rgba(13,27,42,0.18)", border: "1px solid rgba(13,27,42,0.08)" }}>
              <Img src={imgUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : null}
        </div>

        {/* ZONE 3: Body — flex:1, takes all remaining space */}
        <div style={{ flex: 1, overflow: "hidden", marginBottom: 20 }}>
          {story.body && (
            <p style={{ color: S_MUTED, fontSize: 28, fontWeight: 400, lineHeight: 1.65, margin: 0, fontFamily }}>
              {story.body}
            </p>
          )}
        </div>

        {/* ZONE 4: Data cards — fixed */}
        <div style={{ flexShrink: 0, display: "flex", gap: 10, marginBottom: 20 }}>
          {(story.cards || []).map((c, i) => <DataCardLight key={i} label={c.key} value={c.value} />)}
        </div>

        {/* ZONE 5: Signal — fixed */}
        <div style={{ flexShrink: 0 }}>
          <KelsTakeLight text={story.kelsTake} />
        </div>

        {/* ZONE 6: Brand — fixed */}
        <div style={{ flexShrink: 0, marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: BLUE, flexShrink: 0 }} />
          <span style={{ color: S_TEXT, fontSize: 20, fontWeight: 700, fontFamily }}>@productbykel</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Slide 4: CTA ──────────────────────────────────────────────────
function CtaSlide() {
  const platforms = [
    { icon: "📸", name: "Instagram", handle: "@productbykel" },
    { icon: "▶", name: "YouTube", handle: "youtube.com/@productbykel" },
    { icon: "♪", name: "TikTok", handle: "@productbykel" },
  ];
  return (
    <AbsoluteFill style={{ background: S_BG, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg, ${S_BLUE} 0%, transparent 80%)`, zIndex: 2 }} />

      <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "60px 72px" }}>
        <div style={{ marginBottom: "auto", paddingTop: 4 }}>
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
            <rect x="1" y="11" width="20" height="20" rx="2.5" stroke={S_TEXT} strokeWidth="3.5" fill="none" />
            <circle cx="13" cy="4" r="3.5" fill={S_BLUE} />
            <line x1="13" y1="7" x2="9" y2="11" stroke={S_BLUE} strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", alignSelf: "flex-start", border: `2px solid ${S_BLUE}`, padding: "6px 16px", borderRadius: 0, marginBottom: 24 }}>
            <span style={{ color: S_BLUE, fontSize: 22, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily }}>Never miss a brief</span>
          </div>
          <h2 style={{ color: S_TEXT, fontSize: 88, fontWeight: 800, lineHeight: 1.0, letterSpacing: "-0.03em", margin: "0 0 16px", fontFamily }}>
            Follow<br />@productbykel
          </h2>
          <p style={{ color: S_MUTED, fontSize: 28, marginBottom: 48, fontFamily }}>for your Tech Brief</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {platforms.map((p, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 18,
                background: S_CARD, borderRadius: 14, padding: "20px 24px",
                border: "1px solid rgba(13,27,42,0.08)", boxShadow: "0 2px 8px rgba(13,27,42,0.05)",
              }}>
                <span style={{ fontSize: 28, width: 36, textAlign: "center" }}>{p.icon}</span>
                <span style={{ color: S_MUTED, fontSize: 24, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", width: 140, fontFamily }}>{p.name}</span>
                <span style={{ color: S_TEXT, fontSize: 26, fontWeight: 600, fontFamily }}>{p.handle}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Main component ────────────────────────────────────────────────
export const CarouselSlide: React.FC<CarouselSlideProps> = ({ slideIndex, coverHeadline, date, stories, images }) => {
  if (slideIndex === 0) {
    return <CoverSlide coverHeadline={coverHeadline} date={date} stories={stories} images={images} />;
  }
  if (slideIndex >= 1 && slideIndex <= 3) {
    const story = stories[slideIndex - 1];
    const imgKey = `story${slideIndex}` as keyof typeof images;
    return <StorySlide story={story} slideNum={slideIndex + 1} total={5} imgUrl={images[imgKey]} />;
  }
  return <CtaSlide />;
};
