import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const GameContainer = lazy(() =>
  import("@/game/GameContainer").then((m) => ({ default: m.GameContainer })),
);

export const Route = createFileRoute("/play")({
  component: PlayPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Play — ASD Explorer" },
      { name: "description", content: "Explore the world and play gaze missions." },
    ],
  }),
});

function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-soft-gradient">
          <div className="rounded-2xl bg-card px-8 py-6 shadow-cozy">
            <p className="font-pixel text-sm">Loading world…</p>
          </div>
        </div>
      }
    >
      <GameContainer />
    </Suspense>
  );
}
