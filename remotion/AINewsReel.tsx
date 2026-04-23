import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/DmSans";

const { fontFamily } = loadFont();

export type AINewsReelProps = {
  headline: string;
  summary: string;
  source: string;
  date: string;
  voiceover_url: string;
  image_url: string;
  image_urls?: string[];
  duration: number;
};

function splitScript(script: string): string[] {
  const sentences = script
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunkCount = 4;
  const size = Math.ceil(sentences.length / chunkCount);
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += size) {
    chunks.push(sentences.slice(i, i + size).join(" "));
  }
  return chunks;
}

function ImageSlide({
  src,
  frame,
  switchIn,
  switchOut,
  durationInFrames,
  isFirst,
  isLast,
}: {
  src: string;
  frame: number;
  switchIn: number;
  switchOut: number;
  durationInFrames: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const CROSSFADE = 15;

  const opacity = interpolate(
    frame,
    [switchIn, switchIn + CROSSFADE, switchOut - CROSSFADE, switchOut],
    [isFirst ? 1 : 0, 1, 1, isLast ? 1 : 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scale = interpolate(frame, [switchIn, switchOut], [1.0, 1.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.72,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      />
    </AbsoluteFill>
  );
}

export const AINewsReel: React.FC<AINewsReelProps> = ({
  headline,
  summary,
  source,
  date,
  voiceover_url,
  image_url,
  image_urls,
  duration,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const images = image_urls?.length ? image_urls : [image_url];
  const N = images.length;
  const slot = durationInFrames / N;

  const segments = splitScript(summary);
  const segmentFrames = Math.floor(durationInFrames / segments.length);

  const globalOpacity = interpolate(
    frame,
    [0, fps * 0.5, durationInFrames - fps, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const headlineOpacity = interpolate(frame, [fps * 0.5, fps * 1.5], [0, 1], {
    extrapolateRight: "clamp",
  });
  const headlineY = interpolate(frame, [fps * 0.5, fps * 1.5], [28, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const logoOpacity = interpolate(frame, [fps * 0.3, fps * 1], [0, 1], {
    extrapolateRight: "clamp",
  });

  const sourceOpacity = interpolate(frame, [fps * 2, fps * 3], [0, 1], {
    extrapolateRight: "clamp",
  });

  const progress = frame / durationInFrames;

  const activeSegment = Math.min(
    Math.floor(frame / segmentFrames),
    segments.length - 1
  );
  const segmentStart = activeSegment * segmentFrames;
  const segmentFadeIn = interpolate(
    frame,
    [segmentStart, segmentStart + fps * 0.3],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", opacity: globalOpacity }}>
      {/* Crossfading images with Ken Burns */}
      {images.map((src, i) => (
        <ImageSlide
          key={i}
          src={src}
          frame={frame}
          switchIn={i * slot}
          switchOut={(i + 1) * slot}
          durationInFrames={durationInFrames}
          isFirst={i === 0}
          isLast={i === N - 1}
        />
      ))}

      {/* Gradient overlays */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 35%, transparent 50%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      {/* Top accent stripe */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 5,
          background: "linear-gradient(90deg, #1A8EFF 0%, transparent 80%)",
          zIndex: 2,
        }}
      />

      {/* @productbykel logo */}
      <div
        style={{
          position: "absolute",
          top: 64,
          left: 52,
          display: "flex",
          alignItems: "center",
          gap: 8,
          opacity: logoOpacity,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: "#3DBEFF",
          }}
        />
        <span
          style={{
            color: "white",
            fontFamily,
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.3px",
          }}
        >
          @productbykel
        </span>
      </div>

      {/* Headline */}
      <div
        style={{
          position: "absolute",
          top: "28%",
          left: 52,
          right: 52,
          opacity: headlineOpacity,
          transform: `translateY(${headlineY}px)`,
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(26,142,255,0.15)",
            border: "1px solid rgba(26,142,255,0.3)",
            borderRadius: 8,
            padding: "6px 14px",
            display: "inline-block",
            marginBottom: 12,
          }}
        >
          <span
            style={{
              color: "#1A8EFF",
              fontFamily,
              fontSize: 18,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            TECH BRIEF
          </span>
        </div>
        <p
          style={{
            color: "white",
            fontFamily,
            fontSize: 46,
            fontWeight: 800,
            lineHeight: 1.15,
            textShadow: "0 2px 20px rgba(0,0,0,0.8)",
            margin: 0,
          }}
        >
          {headline}
        </p>
      </div>

      {/* Animated subtitle segments */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 40,
          right: 40,
          opacity: segmentFadeIn,
          backgroundColor: "rgba(0,0,0,0.55)",
          borderRadius: 12,
          padding: "18px 24px",
        }}
      >
        <p
          style={{
            color: "white",
            fontFamily,
            fontSize: 38,
            fontWeight: 600,
            lineHeight: 1.45,
            margin: 0,
          }}
        >
          {segments[activeSegment]}
        </p>
      </div>

      {/* Source + date */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 52,
          opacity: sourceOpacity,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            color: "rgba(255,255,255,0.5)",
            fontFamily,
            fontSize: 18,
          }}
        >
          Via {source} · {date}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: "rgba(255,255,255,0.1)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            backgroundColor: "#1A8EFF",
          }}
        />
      </div>

      {/* Audio */}
      {voiceover_url ? <Audio src={voiceover_url} /> : null}
    </AbsoluteFill>
  );
};
