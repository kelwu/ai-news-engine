import { AbsoluteFill, Img } from "remotion";
import { loadFont } from "@remotion/google-fonts/DmSans";

const { fontFamily } = loadFont();

// ── Design tokens ─────────────────────────────────────────────────
const BG_DEEP = "#07101d";
const BG_CARD = "#0d1e32";
const BLUE = "#3DBEFF";
const S_BLUE = "#1A8EFF";
const S_BG = "#F2EFE8";
const S_CARD = "#FFFFFF";
const S_TEXT = "#0D1B2A";
const S_MUTED = "rgba(13,27,42,0.48)";
const S_MUTED2 = "rgba(13,27,42,0.25)";
const MUTED = "rgba(255,255,255,0.40)";

// ── Types ─────────────────────────────────────────────────────────
type StoryData = {
  category: string;
  headlinePrefix?: string;
  headlineHighlight?: string;
  headlineSuffix?: string;
  headline?: string;
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
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 8, alignSelf: "flex-start" }}>
      <span style={{ color: S_BLUE, fontSize: 20, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", whiteSpace: "nowrap", fontFamily }}>{label}</span>
      <div style={{ height: 2.5, background: S_BLUE, borderRadius: 1 }} />
    </div>
  );
}

function DataCardLight({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: S_CARD, borderRadius: 14, padding: "22px 28px",
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
      border: "1px solid rgba(13,27,42,0.08)", boxShadow: "0 2px 12px rgba(13,27,42,0.06)",
    }}>
      <span style={{ color: S_MUTED, fontSize: 24, fontWeight: 500, lineHeight: 1.3, fontFamily }}>{label}</span>
      <span style={{ color: S_BLUE, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", flexShrink: 0, textAlign: "right", maxWidth: 260, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontFamily }}>{value}</span>
    </div>
  );
}

function KelsTakeLight({ text }: { text: string }) {
  return (
    <div style={{ background: S_TEXT, borderRadius: 14, padding: "20px 24px" }}>
      <div style={{ color: S_BLUE, fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, fontFamily }}>Kel's Take</div>
      <p style={{ color: "#fff", fontSize: 22, fontWeight: 400, lineHeight: 1.5, margin: 0, fontFamily }}>{text}</p>
    </div>
  );
}

// ── Slide 0: Cover ────────────────────────────────────────────────
function CoverSlide({ coverHeadline, date, stories, images }: Pick<CarouselSlideProps, "coverHeadline" | "date" | "stories" | "images">) {
  return (
    <AbsoluteFill style={{ background: "#0a0e14", overflow: "hidden" }}>
      {/* Full-bleed background image */}
      {images.cover ? (
        <AbsoluteFill>
          <Img src={images.cover} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%", opacity: 0.55 }} />
        </AbsoluteFill>
      ) : null}
      {/* Gradient overlay */}
      <AbsoluteFill style={{ background: "linear-gradient(160deg, rgba(5,10,20,0.4) 0%, rgba(5,10,20,0.75) 55%, rgba(5,10,20,0.97) 100%)" }} />
      {/* Top accent stripe */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg, ${S_BLUE} 0%, transparent 80%)`, zIndex: 2 }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "52px 60px" }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: BLUE }} />
            <span style={{ color: "#fff", fontSize: 20, fontWeight: 700, fontFamily }}>@productbykel</span>
          </div>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.25)" }} />
          <span style={{ color: S_BLUE, fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", fontFamily }}>TECH BRIEF · {date.toUpperCase()}</span>
        </div>

        {/* Headline block */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h1 style={{ color: "#fff", fontSize: 92, fontWeight: 800, lineHeight: 1.02, letterSpacing: "-0.03em", marginBottom: 20, margin: "0 0 20px", fontFamily }}>
            {coverHeadline}
          </h1>
          <div style={{ width: 64, height: 4, background: S_BLUE, borderRadius: 2, marginBottom: 24 }} />
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 34, fontWeight: 400, lineHeight: 1.5, margin: 0, fontFamily }}>
            Here's what every PM and builder needs to know →
          </p>
        </div>

        {/* Stat cards */}
        <div style={{ display: "flex", gap: 12 }}>
          {stories.map((s, i) => (
            <div key={i} style={{
              flex: 1, borderRadius: 14, padding: "18px 20px",
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}>
              <div style={{ color: S_BLUE, fontSize: 48, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1, fontFamily }}>{s.coverStat?.number}</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 26, marginTop: 10, lineHeight: 1.3, fontFamily }}>{s.coverStat?.label}</div>
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

      <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "52px 60px 44px" }}>
        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <CategoryLabel label={story.category} />
          <span style={{ color: S_MUTED2, fontSize: 20, fontWeight: 500, fontFamily }}>{slideNum}/{total}</span>
        </div>

        {/* Headline + thumbnail */}
        <div style={{ display: "flex", gap: 28, alignItems: "flex-start", marginBottom: 28 }}>
          <h2 style={{
            flex: 1, color: S_TEXT, fontSize: 58, fontWeight: 800, lineHeight: 1.04,
            letterSpacing: "-0.03em", margin: 0, fontFamily,
            display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden",
          } as React.CSSProperties}>
            {story.headlinePrefix && <>{story.headlinePrefix} </>}
            {story.headlineHighlight && <span style={{ color: S_BLUE }}>{story.headlineHighlight}</span>}
            {story.headlineSuffix && <> {story.headlineSuffix}</>}
            {!story.headlinePrefix && story.headline}
          </h2>
          {imgUrl ? (
            <div style={{ width: 210, height: 168, borderRadius: 16, overflow: "hidden", flexShrink: 0, marginTop: 4, boxShadow: "0 8px 28px rgba(13,27,42,0.18)", border: "1px solid rgba(13,27,42,0.08)" }}>
              <Img src={imgUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : null}
        </div>

        {/* Data cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {(story.cards || []).map((c, i) => <DataCardLight key={i} label={c.key} value={c.value} />)}
        </div>

        {/* Kel's Take */}
        <div style={{ marginTop: "auto" }}>
          <KelsTakeLight text={story.kelsTake} />
        </div>

        {/* Bottom brand */}
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8 }}>
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
    <AbsoluteFill style={{ background: "#0a0e14", overflow: "hidden" }}>
      {/* Top accent stripe */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg, ${S_BLUE} 0%, transparent 80%)`, zIndex: 2 }} />
      <AbsoluteFill style={{ background: "linear-gradient(135deg, #07101d 0%, #0d1a2e 100%)" }} />

      <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "60px 72px" }}>
        <div style={{ marginBottom: "auto", paddingTop: 4 }}>
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
            <rect x="1" y="11" width="20" height="20" rx="2.5" stroke="#fff" strokeWidth="3.5" fill="none" />
            <circle cx="13" cy="4" r="3.5" fill={BLUE} />
            <line x1="13" y1="7" x2="9" y2="11" stroke={BLUE} strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "inline-flex", flexDirection: "column", gap: 8, alignSelf: "flex-start", marginBottom: 24 }}>
            <span style={{ color: S_BLUE, fontSize: 18, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily }}>Never miss a brief</span>
            <div style={{ height: 2.5, background: S_BLUE, borderRadius: 1 }} />
          </div>
          <h2 style={{ color: "#fff", fontSize: 88, fontWeight: 800, lineHeight: 1.0, letterSpacing: "-0.03em", marginBottom: 16, margin: "0 0 16px", fontFamily }}>
            Follow<br />@productbykel
          </h2>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 24, marginBottom: 48, fontFamily }}>for your Tech Brief</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {platforms.map((p, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 18,
                background: "rgba(255,255,255,0.07)",
                backdropFilter: "blur(16px)",
                borderRadius: 14, padding: "20px 24px",
                border: "1px solid rgba(255,255,255,0.12)",
              }}>
                <span style={{ fontSize: 24, width: 32, textAlign: "center" }}>{p.icon}</span>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 18, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", width: 110, fontFamily }}>{p.name}</span>
                <span style={{ color: "#fff", fontSize: 20, fontWeight: 600, fontFamily }}>{p.handle}</span>
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
