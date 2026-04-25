import * as Phaser from "phaser";
import { MISSIONS } from "../missions";
import mascotUrl from "@/assets/mascot.png";
import zoneForest from "@/assets/zone-forest.jpg";
import zoneCrystal from "@/assets/zone-crystal.jpg";
import zoneRiver from "@/assets/zone-river.jpg";
import zoneEcho from "@/assets/zone-echo.jpg";
import zoneOwl from "@/assets/zone-owl.jpg";
import zoneMeadow from "@/assets/zone-meadow.jpg";
import zoneMaze from "@/assets/zone-maze.jpg";

export interface WorldSceneEvents {
  onMissionEnter: (id: string) => void;
  onPositionChange: (xPct: number, currentZone: string) => void;
}

const ZONE_BG: Record<string, string> = {
  start: zoneForest,
  crystal: zoneCrystal,
  river: zoneRiver,
  echo: zoneEcho,
  owl: zoneOwl,
  social: zoneMeadow,
  maze: zoneMaze,
};

const ZONE_WIDTH = 1920;
const TOTAL_ZONES = MISSIONS.length + 1; // start + 6 missions
const WORLD_WIDTH = ZONE_WIDTH * TOTAL_ZONES;
const WORLD_HEIGHT = 640;

export class WorldScene extends Phaser.Scene {
  private mascot!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private speed = 240;
  private events_!: WorldSceneEvents;
  private completed = new Set<string>();
  private zoneTriggers: { id: string; x: number; activated: boolean; label: Phaser.GameObjects.Container }[] = [];
  private bobTime = 0;
  private lastZoneIdx = -1;

  constructor() {
    super("world");
  }

  init(data: { events: WorldSceneEvents; completed: string[]; startX?: number }) {
    this.events_ = data.events;
    this.completed = new Set(data.completed);
  }

  preload() {
    this.load.image("mascot", mascotUrl);
    Object.entries(ZONE_BG).forEach(([k, url]) => this.load.image(`bg-${k}`, url));
  }

  create() {
    this.cameras.main.setBackgroundColor("#f5e8f5");

    // Build zones horizontally
    const zoneOrder = ["start", ...MISSIONS.map((m) => m.id)];
    zoneOrder.forEach((zoneId, i) => {
      const x = i * ZONE_WIDTH;
      const bg = this.add.image(x, 0, `bg-${zoneId}`).setOrigin(0, 0);
      bg.setDisplaySize(ZONE_WIDTH, WORLD_HEIGHT);

      // Soft transition gradient overlap
      if (i > 0) {
        const grad = this.add
          .rectangle(x, 0, 80, WORLD_HEIGHT, 0xfde8f4, 0.5)
          .setOrigin(0.5, 0);
        grad.setBlendMode(Phaser.BlendModes.SCREEN);
      }

      // Mission marker for non-start zones
      if (i > 0) {
        const mission = MISSIONS[i - 1];
        const triggerX = x + ZONE_WIDTH / 2;
        const isDone = this.completed.has(mission.id);

        const container = this.add.container(triggerX, WORLD_HEIGHT - 200);
        const halo = this.add.circle(0, 0, 60, isDone ? 0xa0e0c0 : 0xffd1e8, 0.4);
        const ring = this.add.circle(0, 0, 60, 0xffffff, 0).setStrokeStyle(3, isDone ? 0x6fc9a0 : 0xff9ec7);
        const text = this.add
          .text(0, 0, mission.emoji, { fontSize: "48px" })
          .setOrigin(0.5);
        const label = this.add
          .text(0, 80, mission.title, {
            fontFamily: "Quicksand, sans-serif",
            fontSize: "18px",
            color: "#3a2540",
            backgroundColor: "#ffffffcc",
            padding: { left: 10, right: 10, top: 4, bottom: 4 },
          })
          .setOrigin(0.5);
        const check = isDone
          ? this.add.text(38, -40, "✓", {
              fontSize: "24px",
              color: "#6fc9a0",
              fontStyle: "bold",
            }).setOrigin(0.5)
          : null;

        container.add([halo, ring, text, label]);
        if (check) container.add(check);

        this.tweens.add({
          targets: halo,
          scale: 1.15,
          alpha: 0.7,
          yoyo: true,
          repeat: -1,
          duration: 1400,
          ease: "Sine.easeInOut",
        });

        this.zoneTriggers.push({ id: mission.id, x: triggerX, activated: false, label: container });
      }
    });

    // Mascot
    this.mascot = this.add.image(200, WORLD_HEIGHT - 140, "mascot");
    this.mascot.setScale(0.18);

    // Camera
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.mascot, true, 0.1, 0.1);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Touch / pointer drag scroll fallback for mobile
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

    // Floating particles for cozy feel
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

    // Mascot bobbing
    this.bobTime += delta;
    this.mascot.y = WORLD_HEIGHT - 140 + Math.sin(this.bobTime / 250) * 6;

    // Trigger missions
    for (const t of this.zoneTriggers) {
      if (Math.abs(this.mascot.x - t.x) < 60 && !t.activated) {
        t.activated = true;
        this.events_.onMissionEnter(t.id);
      } else if (Math.abs(this.mascot.x - t.x) > 200) {
        t.activated = false;
      }
    }

    // Position broadcast
    const idx = Math.floor(this.mascot.x / ZONE_WIDTH);
    if (idx !== this.lastZoneIdx) {
      this.lastZoneIdx = idx;
      const zoneOrder = ["Quiet Glade", ...MISSIONS.map((m) => m.zone)];
      this.events_.onPositionChange(this.mascot.x / WORLD_WIDTH, zoneOrder[idx] ?? "");
    }
  }

  reactToMissionComplete(id: string) {
    this.completed.add(id);
    const t = this.zoneTriggers.find((z) => z.id === id);
    if (!t) return;
    // Happy mascot pop
    this.tweens.add({
      targets: this.mascot,
      scale: 0.22,
      yoyo: true,
      duration: 280,
      ease: "Back.easeOut",
    });
    // Sparkle burst at marker
    for (let i = 0; i < 12; i++) {
      const s = this.add.circle(t.x, WORLD_HEIGHT - 200, 4, 0xfff1a8, 0.9);
      const angle = (i / 12) * Math.PI * 2;
      this.tweens.add({
        targets: s,
        x: t.x + Math.cos(angle) * 80,
        y: WORLD_HEIGHT - 200 + Math.sin(angle) * 80,
        alpha: 0,
        duration: 800,
        onComplete: () => s.destroy(),
      });
    }
  }
}
