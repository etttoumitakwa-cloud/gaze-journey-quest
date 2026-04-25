import type { MissionId, MissionResult, SaveData } from "./types";

const KEY = "asd-explorer-save-v1";

const empty: SaveData = { completed: [], results: [], calibrated: false };

export function loadSave(): SaveData {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    return { ...empty, ...JSON.parse(raw) };
  } catch {
    return empty;
  }
}

export function saveResult(result: MissionResult) {
  const data = loadSave();
  data.results.push(result);
  if (!data.completed.includes(result.id)) data.completed.push(result.id);
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function setCalibrated(v: boolean) {
  const data = loadSave();
  data.calibrated = v;
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function isUnlocked(_id: MissionId): boolean {
  // All missions are explorable; world progression is positional.
  return true;
}

export function resetSave() {
  localStorage.removeItem(KEY);
}
