import * as Phaser from "phaser";
import { MISSIONS } from "../missions";
import mascotUrl from "@/assets/mascot.png";
import pxSky from "@/assets/px-sky.png";
import pxHillsFar from "@/assets/px-hills-far.png";
import pxHillsMid from "@/assets/px-hills-mid.png";
import pxGround from "@/assets/px-ground.png";
import propFlower from "@/assets/prop-flower.png";
import propTree from "@/assets/prop-tree.png";
import propBall from "@/assets/prop-ball.png";
import propHouse from "@/assets/prop-house.png";
import propMushroom from "@/assets/prop-mushroom.png";
import propRock from "@/assets/prop-rock.png";
import propButterfly from "@/assets/prop-butterfly.png";
import propBench from "@/assets/prop-bench.png";
import propKite from "@/assets/prop-kite.png";
import themeCrystal from "@/assets/theme-crystal.png";
import themeRiver from "@/assets/theme-river.png";
import themeBalloon from "@/assets/theme-balloon.png";
import themeAnimal from "@/assets/theme-animal.png";
import themeStar from "@/assets/theme-star.png";
import themePuzzle from "@/assets/theme-puzzle.png";

export interface WorldSceneEvents {
  onMissionEnter: (id: string) => void;
  onPositionChange: (xPct: number, currentZone: string) => void;
}

const SEGMENT_WIDTH = 1920;
const TOTAL_SEGMENTS = MISSIONS.length + 1; // start + 6 mission stretches
const WORLD_WIDTH = SEGMENT_WIDTH * TOTAL_SEGMENTS;
const WORLD_HEIGHT = 640;
const GROUND_Y = WORLD_HEIGHT - 140;

// Per-mission themed prop key
const MISSION_THEME: Record<string, { key: string; scale: number; yOffset: number; float?: boolean }> = {
  crystal: { key: "t-crystal", scale: 0.22, yOffset: -10 },
  river:   { key: "t-river",   scale: 0.30, yOffset: 10 },
  echo:    { key: "t-balloon", scale: 0.22, yOffset: -220, float: true },
  owl:     { key: "t-animal",  scale: 0.20, yOffset: -10 },
  social:  { key: "t-star",    scale: 0.16, yOffset: -260, float: true },
  maze:    { key: "t-puzzle",  scale: 0.18, yOffset: -10 },
};

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

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
    this.load.image("t-crystal", themeCrystal);
    this.load.image("t-river", themeRiver);
    this.load.image("t-balloon", themeBalloon);
    this.load.image("t-animal", themeAnimal);
    this.load.image("t-star", themeStar);
    this.load.image("t-puzzle", themePuzzle);
  }

  create() {
    // ---- Sky: very soft, low-chroma gradient (ASD-friendly: low arousal)
    this.cameras.main.setBackgroundColor("#e8eef2");
    const sky = this.add.graphics();
    // pale sky → pale sage horizon, no saturated pinks
    sky.fillGradientStyle(0xe8eef2, 0xe8eef2, 0xdfe8e2, 0xdfe8e2, 1);
    sky.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // ---- Continuous tiled hills/grass via TileSprite (perfectly seamless because it wraps a single texture)
    const bgTex = this.textures.get("world-bg");
    bgTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    const tile = this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, "world-bg").setOrigin(0, 0);
    // scale the texture so it fills vertically while still tiling horizontally
    const srcImg = bgTex.getSourceImage() as HTMLImageElement;
    const scaleY = WORLD_HEIGHT / srcImg.height;
    tile.setTileScale(scaleY, scaleY);
    tile.setAlpha(0.85); // soften saturation

    // ---- Ground band: soft sage to unify the floor color
    const ground = this.add.graphics();
    ground.fillStyle(0xb6c9b0, 1);
    ground.fillRect(0, GROUND_Y + 10, WORLD_WIDTH, WORLD_HEIGHT - GROUND_Y);
    const groundShade = this.add.graphics();
    groundShade.fillStyle(0x000000, 0.04);
    groundShade.fillRect(0, GROUND_Y + 10, WORLD_WIDTH, 6);

    // ---- Gentle ambient props sprinkled the whole way (deterministic)
    const rand = seeded(20260428);
    const ambient = [
      { key: "p-flower", scale: 0.12, yOffset: 0,    sway: true },
      { key: "p-mushroom", scale: 0.16, yOffset: -10 },
      { key: "p-rock", scale: 0.16, yOffset: -10 },
      { key: "p-tree", scale: 0.42, yOffset: -90 },
      { key: "p-bench", scale: 0.22, yOffset: -20 },
      { key: "p-butterfly", scale: 0.10, yOffset: -180, float: true },
    ];
    const ambientCount = 110;
    for (let i = 0; i < ambientCount; i++) {
      const def = ambient[Math.floor(rand() * ambient.length)];
      const x = 240 + rand() * (WORLD_WIDTH - 480);
      const y = GROUND_Y + def.yOffset + (rand() - 0.5) * 12;
      const s = this.add.image(x, y, def.key).setOrigin(0.5, 1);
      s.setScale(def.scale * (0.85 + rand() * 0.35));
      (s.texture as Phaser.Textures.Texture).setFilter(Phaser.Textures.FilterMode.NEAREST);
      if (def.sway) {
        this.tweens.add({ targets: s, angle: rand() > 0.5 ? 4 : -4, yoyo: true, repeat: -1, duration: 1800 + rand() * 1200, ease: "Sine.easeInOut" });
      }
      if (def.float) {
        this.tweens.add({ targets: s, y: s.y - 24, x: s.x + (rand() > 0.5 ? 30 : -30), yoyo: true, repeat: -1, duration: 2400 + rand() * 1600, ease: "Sine.easeInOut" });
      }
    }

    // ---- Mission markers + themed clusters around each mission
    MISSIONS.forEach((mission, i) => {
      const x = (i + 1) * SEGMENT_WIDTH + SEGMENT_WIDTH / 2;
      const isDone = this.completed.has(mission.id);

      // Themed cluster: scatter the mission's icon around its area
      const theme = MISSION_THEME[mission.id];
      if (theme) {
        const clusterCount = 14;
        for (let k = 0; k < clusterCount; k++) {
          const tx = x + (rand() - 0.5) * (SEGMENT_WIDTH * 0.85);
          const ty = GROUND_Y + theme.yOffset + (rand() - 0.5) * 30;
          const sp = this.add.image(tx, ty, theme.key).setOrigin(0.5, 1);
          sp.setScale(theme.scale * (0.7 + rand() * 0.6));
          (sp.texture as Phaser.Textures.Texture).setFilter(Phaser.Textures.FilterMode.NEAREST);
          if (theme.float) {
            this.tweens.add({
              targets: sp,
              y: ty - 30,
              x: tx + (rand() > 0.5 ? 24 : -24),
              yoyo: true,
              repeat: -1,
              duration: 2200 + rand() * 1800,
              ease: "Sine.easeInOut",
            });
          } else {
            this.tweens.add({
              targets: sp,
              angle: rand() > 0.5 ? 3 : -3,
              yoyo: true,
              repeat: -1,
              duration: 2000 + rand() * 1400,
              ease: "Sine.easeInOut",
            });
          }
        }
      }

      const container = this.add.container(x, GROUND_Y - 80);
      const halo = this.add.circle(0, 0, 60, isDone ? 0xb6cfc4 : 0xc9d6e2, 0.35);
      const ring = this.add.circle(0, 0, 60, 0xffffff, 0).setStrokeStyle(3, isDone ? 0x8fb6a4 : 0x9fb3c6);
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
          .text(38, -40, "✓", { fontSize: "24px", color: "#5a8a76", fontStyle: "bold" })
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
      const s = this.add.circle(t.x, GROUND_Y - 80, 4, 0xeae3c8, 0.9);
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
