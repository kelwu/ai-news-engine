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

const CROSSFADE = 15;

type Motion = { scaleFrom: number; scaleTo: number; xFrom: number; xTo: number; yFrom: number; yTo: number };

const MOTIONS: Motion[] = [
  { scaleFrom: 1.00, scaleTo: 1.20, xFrom: -25, xTo: 25,  yFrom: 0,   yTo: -15 }, // zoom in, pan right + up
  { scaleFrom: 1.20, scaleTo: 1.00, xFrom: 25,  xTo: -25, yFrom: -15, yTo: 0   }, // zoom out, pan left + down
  { scaleFrom: 1.05, scaleTo: 1.25, xFrom: 0,   xTo: 0,   yFrom: 20,  yTo: -20 }, // zoom in, pan up
  { scaleFrom: 1.25, scaleTo: 1.05, xFrom: 0,   xTo: 0,   yFrom: -20, yTo: 20  }, // zoom out, pan down
  { scaleFrom: 1.00, scaleTo: 1.22, xFrom: 25,  xTo: -25, yFrom: 15,  yTo: -15 }, // zoom in, diagonal
  { scaleFrom: 1.22, scaleTo: 1.00, xFrom: -25, xTo: 25,  yFrom: -15, yTo: 15  }, // zoom out, reverse diagonal
];

function ImageSlide({
  src,
  motion,
  frame,
  switchIn,
  switchOut,
  isFirst,
  isLast,
}: {
  src: string;
  motion: Motion;
  frame: number;
  switchIn: number;
  switchOut: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const opacity = interpolate(
    frame,
    [switchIn, switchIn + CROSSFADE, switchOut - CROSSFADE, switchOut],
    [isFirst ? 1 : 0, 1, 1, isLast ? 1 : 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scale = interpolate(frame, [switchIn, switchOut], [motion.scaleFrom, motion.scaleTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const tx = interpolate(frame, [switchIn, switchOut], [motion.xFrom, motion.xTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const ty = interpolate(frame, [switchIn, switchOut], [motion.yFrom, motion.yTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.85,
          transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
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
  const N_SLOTS = 6; // 6 visual moments cycling through the 3 images for more dynamism
  const slot = (durationInFrames + CROSSFADE * (N_SLOTS - 1)) / N_SLOTS;

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
      {/* Crossfading images with overlapping slots — proper crossfade, no black gaps */}
      {Array.from({ length: N_SLOTS }, (_, i) => {
        const switchIn = i * (slot - CROSSFADE);
        const switchOut = switchIn + slot;
        return (
          <ImageSlide
            key={i}
            src={images[i % images.length]}
            motion={MOTIONS[i % MOTIONS.length]}
            frame={frame}
            switchIn={switchIn}
            switchOut={switchOut}
            isFirst={i === 0}
            isLast={i === N_SLOTS - 1}
          />
        );
      })}

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
          background: "linear-gradient(90deg, #EA580C 0%, transparent 80%)",
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
            backgroundColor: "#EA580C",
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
            backgroundColor: "rgba(234,88,12,0.15)",
            border: "1px solid rgba(234,88,12,0.3)",
            borderRadius: 8,
            padding: "6px 14px",
            display: "inline-block",
            marginBottom: 12,
          }}
        >
          <span
            style={{
              color: "#EA580C",
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
            backgroundColor: "#EA580C",
          }}
        />
      </div>

      {/* Audio */}
      {voiceover_url ? <Audio src={voiceover_url} /> : null}
    </AbsoluteFill>
  );
};
