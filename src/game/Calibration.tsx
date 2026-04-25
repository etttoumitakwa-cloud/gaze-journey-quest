import { useEffect, useRef, useState } from "react";
import { gaze } from "./gaze";
import { setCalibrated } from "./storage";
import { Button } from "@/components/ui/button";

interface Props {
  onDone: () => void;
  onSkip: () => void;
}

const POINTS = [
  [10, 10], [50, 10], [90, 10],
  [10, 50], [50, 50], [90, 50],
  [10, 90], [50, 90], [90, 90],
];

export function Calibration({ onDone, onSkip }: Props) {
  const [stage, setStage] = useState<"intro" | "loading" | "calibrating" | "done" | "fallback">("intro");
  const [idx, setIdx] = useState(0);
  const [clicks, setClicks] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const start = async () => {
    setStage("loading");
    const state = await gaze.init();
    if (state === "fallback") {
      setStage("fallback");
      return;
    }
    gaze.showVideo(true);
    setStage("calibrating");
  };

  const handleDotClick = () => {
    const [px, py] = POINTS[idx];
    const x = (window.innerWidth * px) / 100;
    const y = (window.innerHeight * py) / 100;
    // Record 5 samples per point
    for (let i = 0; i < 5; i++) gaze.recordCalibration(x, y);
    const next = clicks + 1;
    setClicks(next);
    if (next >= 5) {
      setClicks(0);
      if (idx + 1 >= POINTS.length) {
        gaze.showVideo(false);
        setCalibrated(true);
        setStage("done");
        setTimeout(onDone, 800);
      } else {
        setIdx(idx + 1);
      }
    }
  };

  useEffect(() => {
    return () => gaze.showVideo(false);
  }, []);

  if (stage === "intro") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-soft-gradient p-6">
        <div className="max-w-lg rounded-3xl bg-card p-8 shadow-cozy">
          <div className="mb-4 text-5xl">👀</div>
          <h2 className="font-pixel text-xl text-foreground">Calibrate your gaze</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            We'll ask permission to use your camera, then you'll click 9 dots while looking at each one.
            Sit comfortably with steady lighting. Takes about a minute.
          </p>
          <div className="mt-6 flex gap-3">
            <Button onClick={start} className="flex-1">Start calibration</Button>
            <Button variant="outline" onClick={() => { gaze.enableFallback(); onSkip(); }}>
              Use mouse instead
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "loading") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-soft-gradient">
        <div className="rounded-2xl bg-card px-8 py-6 text-center shadow-cozy">
          <div className="mb-2 animate-pulse text-3xl">📷</div>
          <p className="text-sm text-muted-foreground">Loading camera & eye-tracking…</p>
        </div>
      </div>
    );
  }

  if (stage === "fallback") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-soft-gradient p-6">
        <div className="max-w-md rounded-3xl bg-card p-8 text-center shadow-cozy">
          <div className="mb-4 text-4xl">🖱️</div>
          <h2 className="font-pixel text-lg">Camera unavailable</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            We'll use your mouse position as a gaze proxy so you can still play.
          </p>
          <Button className="mt-6 w-full" onClick={onSkip}>Continue</Button>
        </div>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-soft-gradient">
        <div className="rounded-2xl bg-card px-10 py-8 text-center shadow-glow">
          <div className="text-5xl">✨</div>
          <p className="mt-3 font-pixel text-lg">All set!</p>
        </div>
      </div>
    );
  }

  const [px, py] = POINTS[idx];
  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full bg-card px-5 py-2 text-sm shadow-cozy">
        Look at the dot and click it · {idx + 1}/{POINTS.length} · {clicks}/5
      </div>
      <button
        onClick={handleDotClick}
        className="absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 animate-pulse-glow rounded-full bg-primary"
        style={{ left: `${px}%`, top: `${py}%` }}
        aria-label="calibration dot"
      />
    </div>
  );
}
