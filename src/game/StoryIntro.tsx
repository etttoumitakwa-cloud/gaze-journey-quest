import { Button } from "@/components/ui/button";

interface Props {
  onBegin: () => void;
}

/**
 * Soft, low-stimulation story intro for GazeWorld.
 * Calm cool palette, no flashing or saturated colors.
 */
export function StoryIntro({ onBegin }: Props) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[oklch(0.18_0.03_240)]/80 p-6 backdrop-blur-sm">
      <div className="max-w-xl rounded-3xl bg-card p-8 shadow-cozy">
        <div className="text-center text-3xl">🌫️ ✨</div>
        <h2 className="mt-4 text-center font-pixel text-base md:text-lg">
          The Tale of GazeWorld
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Long ago, the planet <strong className="text-foreground">GazeWorld</strong> was full
          of colour and friendship — until the <strong className="text-foreground">Shadow Fog</strong> covered
          the land, hiding all the faces, friends, and wonders.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Only a child with <strong className="text-foreground">magic eyes</strong> can lift the fog,
          one world at a time. Wherever you look, the fog clears and the world wakes up.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Kingdom emoji="🫧" name="Bubble Meadow" age="toddlers" />
          <Kingdom emoji="🌲" name="Crystal Forest" age="preschool" />
          <Kingdom emoji="⭐" name="Star Citadel" age="middle childhood" />
        </div>
        <div className="mt-6 flex justify-center">
          <Button onClick={onBegin} size="lg" className="font-pixel text-xs">
            ▶ Lift the fog
          </Button>
        </div>
      </div>
    </div>
  );
}

function Kingdom({ emoji, name, age }: { emoji: string; name: string; age: string }) {
  return (
    <div className="rounded-xl bg-muted p-3 text-center">
      <div className="text-2xl">{emoji}</div>
      <div className="mt-1 text-xs font-medium text-foreground">{name}</div>
      <div className="text-[10px] text-muted-foreground">{age}</div>
    </div>
  );
}
