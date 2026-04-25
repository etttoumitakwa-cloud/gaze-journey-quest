import type { MissionMeta, MissionId } from "./types";

export const MISSIONS: MissionMeta[] = [
  {
    id: "crystal",
    title: "Crystal Clear",
    emoji: "💎",
    zone: "Crystal Cave",
    blurb: "Bright crystals shimmer beside patterned stones.",
    goal: "Geometry vs social preference",
    metricsKeys: ["geometryDwellMs", "socialDwellMs", "ratio", "totalDwellMs"],
  },
  {
    id: "river",
    title: "River Run",
    emoji: "🌊",
    zone: "Whisper River",
    blurb: "Pink leaves drift on flowing water.",
    goal: "Saccade + smooth pursuit tracking",
    metricsKeys: ["saccadeCount", "avgVelocity", "smoothPursuitMs"],
  },
  {
    id: "echo",
    title: "Echo Trail",
    emoji: "🧠",
    zone: "Lantern Grove",
    blurb: "A story unfolds across changing scenes.",
    goal: "Attention shift tracking",
    metricsKeys: ["piDivergence", "sceneShifts", "attentionDriftMs"],
  },
  {
    id: "owl",
    title: "Talk-Time",
    emoji: "🦉",
    zone: "Old Owl Tree",
    blurb: "A friendly owl tells you a tale.",
    goal: "Eye vs mouth scanning",
    metricsKeys: ["eyeDwellMs", "mouthDwellMs", "mouthEyeRatio"],
  },
  {
    id: "social",
    title: "Social Radar",
    emoji: "🌟",
    zone: "Sunny Meadow",
    blurb: "Many woodland friends gather here.",
    goal: "Social attention distribution",
    metricsKeys: ["socialAOIMs", "uniqueAOIs", "avgFixationMs"],
  },
  {
    id: "maze",
    title: "Maze Runner",
    emoji: "🧩",
    zone: "Hedge Maze",
    blurb: "Guide with your gaze through quiet halls.",
    goal: "Scan-path variability",
    metricsKeys: ["entropy", "dispersionPx", "pathLengthPx"],
  },
];

export const missionById = (id: MissionId) =>
  MISSIONS.find((m) => m.id === id)!;
