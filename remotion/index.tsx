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
            body: "Amazon's total investment in Anthropic has reached $33B, making it the largest AI bet in AWS history. The deal includes guaranteed compute on AWS and positions Anthropic as the default AI layer for enterprise cloud.",
            cards: [{ key: "Total committed", value: "$33B" }, { key: "Deal length", value: "10 yrs" }],
            kelsTake: "AWS isn't just a cloud host — they're positioning to own the compute backbone of frontier AI.",
            coverStat: { number: "$33B", label: "Amazon → Anthropic" },
          },
          {
            category: "PRODUCT · STRATEGY",
            headlinePrefix: "Meta targets",
            headlineHighlight: "$135B",
            headlineSuffix: "in AI capex.",
            body: "Meta is doubling down on AI infrastructure, projecting $115–135B in capital expenditure for 2026. The spend covers data centers, custom silicon, and open-source model development under the LLaMA family.",
            cards: [{ key: "2026 AI capex", value: "$115–135B" }, { key: "vs. prior year", value: "≈ 2×" }],
            kelsTake: "When Meta doubles capex, every PM building on open-source LLaMA should expect faster, cheaper model upgrades.",
            coverStat: { number: "$135B", label: "Meta 2026 AI spend" },
          },
          {
            category: "BIG TECH · AI",
            headlinePrefix: "OpenAI ships",
            headlineHighlight: "GPT-5",
            headlineSuffix: "with computer use.",
            body: "GPT-5 launches across all tiers with native computer-use capabilities, letting the model control browsers and apps autonomously. API pricing drops 40% vs GPT-4 Turbo, making it the most capable and affordable frontier model yet.",
            cards: [{ key: "Computer-use", value: "All tiers" }, { key: "API vs GPT-4T", value: "−40%" }],
            kelsTake: "Autonomous computer-use means PMs must audit which product workflows will be disintermediated in 90 days.",
            coverStat: { number: "−40%", label: "GPT-5 API pricing" },
          },
        ],
        images: {
          cover: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1080&q=80",
          story1: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&q=80",
          story2: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&q=80",
          story3: "https://images.unsplash.com/photo-1655720828018-edd2daec9349?w=600&q=80",
        },
      }}
    />
  </>
);

registerRoot(RemotionRoot);
