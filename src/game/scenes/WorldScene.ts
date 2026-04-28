import * as Phaser from "phaser";
import { MISSIONS } from "../missions";
import mascotUrl from "@/assets/mascot.png";
import worldBg from "@/assets/world-meadow.jpg";
import propFlower from "@/assets/prop-flower.png";
import propTree from "@/assets/prop-tree.png";
import propBall from "@/assets/prop-ball.png";
import propHouse from "@/assets/prop-house.png";
import propMushroom from "@/assets/prop-mushroom.png";
import propRock from "@/assets/prop-rock.png";
import propButterfly from "@/assets/prop-butterfly.png";
import propBench from "@/assets/prop-bench.png";
import propKite from "@/assets/prop-kite.png";

export interface WorldSceneEvents {
  onMissionEnter: (id: string) => void;
  onPositionChange: (xPct: number, currentZone: string) => void;
}

const SEGMENT_WIDTH = 1920;
const TOTAL_SEGMENTS = MISSIONS.length + 1; // start + 6 mission stretches
const WORLD_WIDTH = SEGMENT_WIDTH * TOTAL_SEGMENTS;
const WORLD_HEIGHT = 640;
const GROUND_Y = WORLD_HEIGHT - 140;

// Deterministic pseudo-random so the world feels stable, never re-shuffles
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const PROP_KEYS = [
  "p-flower",
  "p-tree",
  "p-ball",
  "p-house",
  "p-mushroom",
  "p-rock",
  "p-butterfly",
  "p-bench",
  "p-kite",
] as const;

interface PropDef {
  key: (typeof PROP_KEYS)[number];
  scale: number;
  yOffset: number; // relative to ground
  sway?: boolean;
  float?: boolean;
}

const PROP_DEFS: Record<(typeof PROP_KEYS)[number], PropDef> = {
  "p-flower":    { key: "p-flower",    scale: 0.12, yOffset: 0,    sway: true },
  "p-tree":      { key: "p-tree",      scale: 0.42, yOffset: -90 },
  "p-ball":      { key: "p-ball",      scale: 0.14, yOffset: -10 },
  "p-house":     { key: "p-house",     scale: 0.42, yOffset: -90 },
  "p-mushroom":  { key: "p-mushroom",  scale: 0.16, yOffset: -10 },
  "p-rock":      { key: "p-rock",      scale: 0.16, yOffset: -10 },
  "p-butterfly": { key: "p-butterfly", scale: 0.10, yOffset: -180, float: true },
  "p-bench":     { key: "p-bench",     scale: 0.22, yOffset: -20 },
  "p-kite":      { key: "p-kite",      scale: 0.18, yOffset: -260, float: true },
};

export class WorldScene extends Phaser.Scene {
  private mascot!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private speed = 240;
  private events_!: WorldSceneEvents;
  private completed = new Set<string>();
  private zoneTriggers: { id: string; x: number; activated: boolean; label: Phaser.GameObjects.Container }[] = [];
  private bobTime = 0;
  private lastSegmentIdx = -1;

  constructor() {
    super("world");
  }

  init(data: { events: WorldSceneEvents; completed: string[] }) {
    this.events_ = data.events;
    this.completed = new Set(data.completed);
  }

  preload() {
    this.load.image("mascot", mascotUrl);
    this.load.image("world-bg", worldBg);
    this.load.image("p-flower", propFlower);
    this.load.image("p-tree", propTree);
    this.load.image("p-ball", propBall);
    this.load.image("p-house", propHouse);
    this.load.image("p-mushroom", propMushroom);
    this.load.image("p-rock", propRock);
    this.load.image("p-butterfly", propButterfly);
    this.load.image("p-bench", propBench);
    this.load.image("p-kite", propKite);
  }

  create() {
    this.cameras.main.setBackgroundColor("#f5e8f5");

    // ---- Single continuous environment: tile the same background across the world
    for (let i = 0; i < TOTAL_SEGMENTS; i++) {
      const bg = this.add.image(i * SEGMENT_WIDTH, 0, "world-bg").setOrigin(0, 0);
      bg.setDisplaySize(SEGMENT_WIDTH, WORLD_HEIGHT);
    }

    // ---- Sprinkle props deterministically. Density grows slightly with distance,
    // so the environment doesn't *change*, it just gets richer as the player explores.
    const rand = seeded(20260428);
    const propCount = 140;
    for (let i = 0; i < propCount; i++) {
      const t = i / propCount; // 0..1 along the world
      // Avoid spawning right on top of the start spot
      const x = 280 + rand() * (WORLD_WIDTH - 560);

      // Weight: early world has more flowers/mushrooms, later world adds variety
      const variety = 0.35 + t * 0.65;
      const idx = Math.floor(rand() * PROP_KEYS.length * variety) % PROP_KEYS.length;
      const def = PROP_DEFS[PROP_KEYS[idx]];

      const jitter = (rand() - 0.5) * 14;
      const y = GROUND_Y + def.yOffset + jitter;
      const sprite = this.add.image(x, y, def.key);
      const sScale = def.scale * (0.85 + rand() * 0.35);
      sprite.setScale(sScale);

      // Keep pixel-art crispness
      sprite.setOrigin(0.5, 1);
      (sprite.texture as Phaser.Textures.Texture).setFilter(Phaser.Textures.FilterMode.NEAREST);

      if (def.sway) {
        this.tweens.add({
          targets: sprite,
          angle: rand() > 0.5 ? 4 : -4,
          yoyo: true,
          repeat: -1,
          duration: 1800 + rand() * 1200,
          ease: "Sine.easeInOut",
        });
      }
      if (def.float) {
        this.tweens.add({
          targets: sprite,
          x: sprite.x + (rand() > 0.5 ? 40 : -40),
          y: sprite.y - 20,
          yoyo: true,
          repeat: -1,
          duration: 2400 + rand() * 1600,
          ease: "Sine.easeInOut",
        });
      }
    }

    // ---- Mission markers (still anchored to segment centers, but no scene swap)
    MISSIONS.forEach((mission, i) => {
      const triggerX = (i + 1) * SEGMENT_WIDTH + SEGMENT_WIDTH / 2 - SEGMENT_WIDTH;
      // ^ keep mission centers spaced evenly: at segment (i+1) center
      const x = (i + 1) * SEGMENT_WIDTH + SEGMENT_WIDTH / 2;
      const isDone = this.completed.has(mission.id);

      const container = this.add.container(x, GROUND_Y - 80);
      const halo = this.add.circle(0, 0, 60, isDone ? 0xa0e0c0 : 0xffd1e8, 0.4);
      const ring = this.add.circle(0, 0, 60, 0xffffff, 0).setStrokeStyle(3, isDone ? 0x6fc9a0 : 0xff9ec7);
      const text = this.add.text(0, 0, mission.emoji, { fontSize: "48px" }).setOrigin(0.5);
      const label = this.add
        .text(0, 80, mission.title, {
          fontFamily: "Quicksand, sans-serif",
          fontSize: "18px",
          color: "#3a2540",
          backgroundColor: "#ffffffcc",
          padding: { left: 10, right: 10, top: 4, bottom: 4 },
        })
        .setOrigin(0.5);
      container.add([halo, ring, text, label]);
      if (isDone) {
        const check = this.add
          .text(38, -40, "✓", { fontSize: "24px", color: "#6fc9a0", fontStyle: "bold" })
          .setOrigin(0.5);
        container.add(check);
      }

      this.tweens.add({
        targets: halo,
        scale: 1.15,
        alpha: 0.7,
        yoyo: true,
        repeat: -1,
        duration: 1400,
        ease: "Sine.easeInOut",
      });

      this.zoneTriggers.push({ id: mission.id, x, activated: false, label: container });
      void triggerX;
    });

    // ---- Mascot
    this.mascot = this.add.image(200, GROUND_Y, "mascot");
    this.mascot.setScale(0.18);
    (this.mascot.texture as Phaser.Textures.Texture).setFilter(Phaser.Textures.FilterMode.NEAREST);

    // ---- Camera
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.mascot, true, 0.1, 0.1);

    // ---- Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Touch / pointer drag
    let dragStartX = 0;
    let mascotStartX = 0;
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      dragStartX = p.x;
      mascotStartX = this.mascot.x;
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      const dx = p.x - dragStartX;
      this.mascot.x = Phaser.Math.Clamp(mascotStartX - dx, 100, WORLD_WIDTH - 100);
    });

    // Cozy floating particles
    for (let i = 0; i < 30; i++) {
      const px = Phaser.Math.Between(0, WORLD_WIDTH);
      const py = Phaser.Math.Between(50, 400);
      const dot = this.add.circle(px, py, Phaser.Math.Between(2, 4), 0xffffff, 0.6);
      this.tweens.add({
        targets: dot,
        y: py - 30,
        alpha: 0.2,
        yoyo: true,
        repeat: -1,
        duration: Phaser.Math.Between(2000, 4000),
        ease: "Sine.easeInOut",
      });
    }

    // Hint
    const hint = this.add
      .text(this.cameras.main.width / 2, 40, "← → or A/D to explore   •   Drag to walk", {
        fontFamily: "Quicksand, sans-serif",
        fontSize: "16px",
        color: "#3a2540",
        backgroundColor: "#ffffffd0",
        padding: { left: 14, right: 14, top: 8, bottom: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.tweens.add({ targets: hint, alpha: 0, delay: 4000, duration: 1500 });
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;
    let vx = 0;
    if (this.cursors.left?.isDown || this.wasd.left.isDown) vx = -1;
    if (this.cursors.right?.isDown || this.wasd.right.isDown) vx = 1;

    if (vx !== 0) {
      this.mascot.x = Phaser.Math.Clamp(
        this.mascot.x + vx * this.speed * dt,
        100,
        WORLD_WIDTH - 100,
      );
      this.mascot.setFlipX(vx < 0);
    }

    this.bobTime += delta;
    this.mascot.y = GROUND_Y + Math.sin(this.bobTime / 250) * 6;

    for (const t of this.zoneTriggers) {
      if (Math.abs(this.mascot.x - t.x) < 60 && !t.activated) {
        t.activated = true;
        this.events_.onMissionEnter(t.id);
      } else if (Math.abs(this.mascot.x - t.x) > 200) {
        t.activated = false;
      }
    }

    const idx = Math.floor(this.mascot.x / SEGMENT_WIDTH);
    if (idx !== this.lastSegmentIdx) {
      this.lastSegmentIdx = idx;
      // Single environment name — never changes, to avoid env-switch stress
      this.events_.onPositionChange(this.mascot.x / WORLD_WIDTH, "Quiet Meadow");
    }
  }

  reactToMissionComplete(id: string) {
    this.completed.add(id);
    const t = this.zoneTriggers.find((z) => z.id === id);
    if (!t) return;
    this.tweens.add({
      targets: this.mascot,
      scale: 0.22,
      yoyo: true,
      duration: 280,
      ease: "Back.easeOut",
    });
    for (let i = 0; i < 12; i++) {
      const s = this.add.circle(t.x, GROUND_Y - 80, 4, 0xfff1a8, 0.9);
      const angle = (i / 12) * Math.PI * 2;
      this.tweens.add({
        targets: s,
        x: t.x + Math.cos(angle) * 80,
        y: GROUND_Y - 80 + Math.sin(angle) * 80,
        alpha: 0,
        duration: 800,
        onComplete: () => s.destroy(),
      });
    }
  }
}
