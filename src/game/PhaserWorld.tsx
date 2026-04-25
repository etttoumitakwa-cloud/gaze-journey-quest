import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { WorldScene } from "./scenes/WorldScene";
import type { MissionId } from "./types";

interface Props {
  completed: MissionId[];
  onMissionEnter: (id: MissionId) => void;
  onPositionChange?: (xPct: number, zone: string) => void;
}

export interface WorldHandle {
  reactToMissionComplete: (id: MissionId) => void;
}

export function PhaserWorld({ completed, onMissionEnter, onPositionChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<WorldScene | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: containerRef.current.clientWidth,
      height: 640,
      backgroundColor: "#f5e8f5",
      physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 } } },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
      },
      pixelArt: false,
      banner: false,
    });

    const scene = new WorldScene();
    game.scene.add("world", scene, true, {
      events: {
        onMissionEnter: (id: string) => onMissionEnter(id as MissionId),
        onPositionChange: (xPct: number, zone: string) =>
          onPositionChange?.(xPct, zone),
      },
      completed,
    });

    sceneRef.current = scene;
    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify scene when a mission completes
  useEffect(() => {
    if (!sceneRef.current || completed.length === 0) return;
    const last = completed[completed.length - 1];
    sceneRef.current.reactToMissionComplete(last);
  }, [completed]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-2xl shadow-cozy"
      style={{ height: 640 }}
    />
  );
}
