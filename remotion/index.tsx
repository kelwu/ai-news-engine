import { Composition, registerRoot } from "remotion";
import { AINewsReel, AINewsReelProps } from "./AINewsReel";
import { CarouselSlide } from "./CarouselSlide";

const defaultProps: AINewsReelProps = {
  headline: "OpenAI launches GPT-5",
  summary: "Three key things PMs need to know...",
  source: "The Verge",
  date: "April 19, 2026",
  voiceover_url: "",
  image_url: "",
  image_urls: ["", "", ""],
  duration: 45,
};

const RemotionRoot = () => (
  <>
    <Composition
      id="AINewsReel"
      component={AINewsReel}
      durationInFrames={1500}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={defaultProps}
      calculateMetadata={async ({ props }) => ({
        durationInFrames: Math.ceil(props.duration * 30),
      })}
    />
    <Composition
      id="CarouselSlide"
      component={CarouselSlide}
      durationInFrames={1}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={{
        slideIndex: 0,
        coverHeadline: "The AI infrastructure war just escalated.",
        date: "April 22, 2026",
        stories: [
          {
            category: "AI · FUNDING",
            headlinePrefix: "Amazon bets",
            headlineHighlight: "$33B",
            headlineSuffix: "on Anthropic.",
            cards: [{ key: "Total committed", value: "$33B" }, { key: "Deal length", value: "10 yrs" }],
            kelsTake: "AWS isn't just a cloud host — they're positioning to own the compute backbone of frontier AI.",
            coverStat: { number: "$33B", label: "Amazon → Anthropic" },
          },
          {
            category: "PRODUCT · STRATEGY",
            headlinePrefix: "Meta targets",
            headlineHighlight: "$135B",
            headlineSuffix: "in AI capex.",
            cards: [{ key: "2026 AI capex", value: "$115–135B" }, { key: "vs. prior year", value: "≈ 2×" }],
            kelsTake: "When Meta doubles capex, every PM building on open-source LLaMA should expect faster, cheaper model upgrades.",
            coverStat: { number: "$135B", label: "Meta 2026 AI spend" },
          },
          {
            category: "BIG TECH · AI",
            headlinePrefix: "OpenAI ships",
            headlineHighlight: "GPT-5",
            headlineSuffix: "with computer use.",
            cards: [{ key: "Computer-use availability", value: "All tiers" }, { key: "API price vs GPT-4T", value: "−40%" }],
            kelsTake: "Autonomous computer-use means PMs must audit which product workflows will be disintermediated in 90 days.",
            coverStat: { number: "−40%", label: "GPT-5 API pricing" },
          },
        ],
        images: { cover: "", story1: "", story2: "", story3: "" },
      }}
    />
  </>
);

registerRoot(RemotionRoot);
