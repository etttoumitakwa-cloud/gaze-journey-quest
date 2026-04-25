import { useGaze } from "./useGaze";

interface Props {
  active: boolean;
}

/** Tiny visible gaze cursor — calming pastel dot. */
export function GazeOverlay({ active }: Props) {
  const { point } = useGaze(active);
  if (!active || !point) return null;
  return (
    <div
      className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2"
      style={{ left: point.x, top: point.y }}
    >
      <div className="h-5 w-5 rounded-full bg-primary/40 shadow-glow ring-2 ring-primary/70" />
    </div>
  );
}
