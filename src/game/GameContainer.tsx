import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PhaserWorld } from "./PhaserWorld";
import { Calibration } from "./Calibration";
import { GazeOverlay } from "./GazeOverlay";
import { ShadowFogOverlay } from "./ShadowFogOverlay";
import { StoryIntro } from "./StoryIntro";
import { CrystalClearMission } from "./missions/CrystalClearMission";
import { RiverRunMission } from "./missions/RiverRunMission";
import { EchoTrailMission } from "./missions/EchoTrailMission";
import { TalkTimeMission } from "./missions/TalkTimeMission";
import { SocialRadarMission } from "./missions/SocialRadarMission";
import { MazeRunnerMission } from "./missions/MazeRunnerMission";
import { TrapShadowMission } from "./missions/TrapShadowMission";
import type { MissionId, MissionResult } from "./types";
import { loadSave, saveResult } from "./storage";
import { MISSIONS } from "./missions";
import { Button } from "@/components/ui/button";
import { gaze } from "./gaze";

const STORY_KEY = "gazeworld:storyseen";

/** Map mission progress (0..6) to a kingdom name. */
function kingdomFor(progressX: number): string {
  if (progressX < 0.34) return "Bubble Meadow";
  if (progressX < 0.67) return "Crystal Forest";
  return "Star Citadel";
}

export function GameContainer() {
  const [needsCalibration, setNeedsCalibration] = useState(true);
  const [showStory, setShowStory] = useState(
    () => typeof window !== "undefined" && !localStorage.getItem(STORY_KEY),
  );
  const [activeMission, setActiveMission] = useState<MissionId | null>(null);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [completed, setCompleted] = useState<MissionId[]>([]);
  const [zone, setZone] = useState("Bubble Meadow");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const save = loadSave();
    setCompleted(save.completed);
    if (save.calibrated) setNeedsCalibration(false);
    return () => {
      gaze.stop();
    };
  }, []);


  const handleMissionEnter = (id: MissionId) => {
    if (completed.includes(id)) return;
    setActiveMission(id);
  };

  const handleMissionComplete = (r: MissionResult) => {
    saveResult(r);
    setCompleted((prev) => (prev.includes(r.id) ? prev : [...prev, r.id]));
    setActiveMission(null);
  };

  const renderMission = () => {
    if (!activeMission) return null;
    const props = {
      onComplete: handleMissionComplete,
      onCancel: () => setActiveMission(null),
    };
    switch (activeMission) {
      case "crystal": return <CrystalClearMission {...props} />;
      case "river":   return <RiverRunMission {...props} />;
      case "echo":    return <EchoTrailMission {...props} />;
      case "owl":     return <TalkTimeMission {...props} />;
      case "social":  return <SocialRadarMission {...props} />;
      case "maze":    return <MazeRunnerMission {...props} />;
    }
  };

  if (needsCalibration) {
    return (
      <Calibration
        onDone={() => setNeedsCalibration(false)}
        onSkip={() => setNeedsCalibration(false)}
      />
    );
  }

  const allDone = completed.length >= MISSIONS.length;
  // Fog density eases as the child completes missions (lifts the fog)
  const fogDensity = Math.max(0.18, 0.55 - completed.length * 0.06);
  const showOverlays = !activeMission && !showStory && !bonusOpen;

  return (
    <div className="min-h-screen bg-soft-gradient p-4 md:p-6">
      <header className="mx-auto mb-4 flex max-w-6xl items-center justify-between gap-4">
        <div>
          <h1 className="font-pixel text-base md:text-lg text-foreground">🌫️ GazeWorld</h1>
          <p className="text-xs text-muted-foreground">
            Kingdom: <span className="font-medium text-foreground">{kingdomFor(progress)}</span>
            {zone && zone !== kingdomFor(progress) && (
              <> · <span className="text-foreground">{zone}</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1">
            {MISSIONS.map((m) => (
              <span
                key={m.id}
                title={m.title}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition ${
                  completed.includes(m.id)
                    ? "bg-secondary shadow-glow"
                    : "bg-card/60 opacity-60"
                }`}
              >
                {m.emoji}
              </span>
            ))}
          </div>
          <Link to="/dashboard">
            <Button variant="outline" size="sm">📊 Dashboard</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl">
        <PhaserWorld
          completed={completed}
          onMissionEnter={handleMissionEnter}
          onPositionChange={(p, z) => {
            setProgress(p);
            setZone(z);
          }}
        />
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-card/60">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        {allDone && (
          <div className="mt-6 rounded-2xl bg-card p-6 text-center shadow-glow">
            <div className="text-4xl">🌟</div>
            <h2 className="mt-2 font-pixel text-lg">The fog has lifted!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              GazeWorld is bright again. View your gaze patterns on the dashboard.
            </p>
            <Link to="/dashboard">
              <Button className="mt-4">Open dashboard</Button>
            </Link>
          </div>
        )}
      </main>

      <ShadowFogOverlay active={showOverlays} density={fogDensity} />
      <GazeOverlay active={showOverlays} />
      {renderMission()}
      {bonusOpen && (
        <TrapShadowMission
          onComplete={() => setBonusOpen(false)}
          onCancel={() => setBonusOpen(false)}
        />
      )}
      {!activeMission && !showStory && !bonusOpen && (
        <button
          onClick={() => setBonusOpen(true)}
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-card px-4 py-3 text-sm shadow-glow ring-1 ring-border hover:scale-105 transition"
          title="Bonus: Trap the Shadow"
        >
          <span className="text-lg">👻</span>
          <span className="font-pixel text-xs">Trap the Shadow</span>
        </button>
      )}
      {showStory && (
        <StoryIntro
          onBegin={() => {
            localStorage.setItem(STORY_KEY, "1");
            setShowStory(false);
          }}
        />
      )}
    </div>
  );
}

