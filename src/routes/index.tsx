import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import mascot from "@/assets/mascot.png";
import zoneForest from "@/assets/zone-forest.jpg";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "ASD Explorer — A cozy gaze-tracking journey" },
      {
        name: "description",
        content:
          "A cozy pixel-art exploration game with eye-tracking missions. Walk a soft pastel world, meet friends, and play six mindful gaze games.",
      },
      { property: "og:title", content: "ASD Explorer" },
      { property: "og:description", content: "Cozy pixel-art world with eye-tracking missions." },
      { property: "og:image", content: zoneForest },
      { name: "twitter:image", content: zoneForest },
    ],
  }),
});

function LandingPage() {
  return (
    <main className="min-h-screen bg-soft-gradient">
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pt-16 pb-10 text-center">
        <img
          src={mascot}
          alt="Mochi the cozy mascot"
          width={180}
          height={180}
          className="animate-float pixel-perfect drop-shadow-xl"
        />
        <h1 className="mt-6 font-pixel text-2xl md:text-4xl text-glow text-foreground">
          ASD Explorer
        </h1>
        <p className="mt-4 max-w-xl text-base md:text-lg text-muted-foreground">
          Wander a cozy pastel world with your fluffy friend. Six gentle gaze
          missions wait along the path — calm, playful, and a little curious.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/play">
            <Button size="lg" className="font-pixel text-xs md:text-sm">▶ Begin journey</Button>
          </Link>
          <Link to="/dashboard">
            <Button size="lg" variant="outline" className="font-pixel text-xs md:text-sm">
              📊 Dashboard
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-20 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { e: "💎", t: "Crystal Clear", d: "Geometry vs social preference" },
          { e: "🌊", t: "River Run", d: "Saccade & smooth pursuit" },
          { e: "🧠", t: "Echo Trail", d: "Attention shift across scenes" },
          { e: "🦉", t: "Talk-Time", d: "Eye vs mouth scanning" },
          { e: "🌟", t: "Social Radar", d: "Social attention distribution" },
          { e: "🧩", t: "Maze Runner", d: "Scan-path variability" },
        ].map((m) => (
          <article
            key={m.t}
            className="rounded-2xl bg-card/80 p-5 shadow-cozy transition hover:scale-[1.02] hover:shadow-glow"
          >
            <div className="text-3xl">{m.e}</div>
            <h2 className="mt-2 font-pixel text-sm">{m.t}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{m.d}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
