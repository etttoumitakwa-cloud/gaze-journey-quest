export type GazeSample = { x: number; y: number; t: number };
export type GazeListener = (s: GazeSample) => void;

export type MissionId =
  | "crystal"
  | "river"
  | "echo"
  | "owl"
  | "social"
  | "maze";

export interface MissionMeta {
  id: MissionId;
  title: string;
  emoji: string;
  zone: string;
  blurb: string;
  goal: string;
  metricsKeys: string[];
}

export interface MissionResult {
  id: MissionId;
  startedAt: number;
  durationMs: number;
  metrics: Record<string, number>;
}

export interface SaveData {
  completed: MissionId[];
  results: MissionResult[];
  calibrated: boolean;
}
