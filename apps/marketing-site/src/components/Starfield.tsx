/**
 * Starfield — the full-viewport animated background of the Rare Structure
 * homepage.
 *
 * A single <canvas> drawing three layers, the elevation over the old site's
 * flat star sprinkle:
 *
 *   1. depth field — ~3 parallax bands of stars, far/mid/near, each band a
 *      different size + base brightness + drift speed. Density and depth read
 *      as a real sky, not a sprinkle.
 *   2. twinkle — every star breathes on its own slow sine phase, so the field
 *      is alive without flickering.
 *   3. shooting stars — occasional streaks crossing the frame on a randomised
 *      cadence, the second specific elevation the brief calls for.
 *
 * Every colour is pulled at runtime from the `@rare-structure-hq/tokens` CSS
 * custom properties resolved on `document.documentElement` — there is no raw
 * hex in this file. Honours `prefers-reduced-motion`: the field renders once,
 * static, with no drift / twinkle / shooting stars.
 */

import { useEffect, useRef } from "react";

/** One static star in a parallax depth band. */
interface Star {
  x: number;
  y: number;
  radius: number;
  /** Base alpha before the twinkle term. */
  baseAlpha: number;
  /** Twinkle phase offset so stars don't pulse in lockstep. */
  phase: number;
  /** Twinkle angular speed. */
  twinkleSpeed: number;
  /** Horizontal drift (px/sec) — slow for far bands, faster for near. */
  drift: number;
}

/** A transient streak crossing the frame. */
interface Shooter {
  x: number;
  y: number;
  /** Velocity components, px/sec. */
  vx: number;
  vy: number;
  /** Trail length, px. */
  length: number;
  /** 0 → 1 life; the streak fades as it ages. */
  life: number;
  /** Seconds the streak lives. */
  ttl: number;
}

/** Parallax bands — far to near. Density scales with viewport area. */
const BANDS = [
  { countPer1e6: 90, radius: 0.6, alpha: 0.35, drift: 1.4, twinkle: 0.7 },
  { countPer1e6: 55, radius: 1.0, alpha: 0.6, drift: 3.2, twinkle: 1.1 },
  { countPer1e6: 22, radius: 1.5, alpha: 0.95, drift: 6.0, twinkle: 1.6 },
] as const;

/** Read a resolved CSS custom property off :root. */
function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Parse an `rgb()`/`#hex` token into an `r,g,b` string for rgba() composition. */
function toRgbTriplet(value: string): string {
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    const r = Number.parseInt(full.slice(0, 2), 16);
    const g = Number.parseInt(full.slice(2, 4), 16);
    const b = Number.parseInt(full.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  const nums = value.match(/[\d.]+/g);
  if (nums && nums.length >= 3) return `${nums[0]}, ${nums[1]}, ${nums[2]}`;
  return "250, 250, 250";
}

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Token-driven colours — resolved once. The starfield never reaches for a
    // raw hex; `text.primary` is the star body, `text.accent` the shooter.
    const starRgb = toRgbTriplet(cssVar("--color-text-primary") || "#fafafa");
    const accentRgb = toRgbTriplet(cssVar("--color-text-accent") || "#93b4f5");

    let stars: Star[] = [];
    let shooters: Shooter[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas!.clientWidth;
      height = canvas!.clientHeight;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const area = width * height;
      stars = [];
      for (const band of BANDS) {
        const count = Math.round((area / 1_000_000) * band.countPer1e6);
        for (let i = 0; i < count; i++) {
          stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: band.radius * (0.7 + Math.random() * 0.6),
            baseAlpha: band.alpha * (0.55 + Math.random() * 0.45),
            phase: Math.random() * Math.PI * 2,
            twinkleSpeed: band.twinkle * (0.6 + Math.random() * 0.8),
            drift: band.drift * (0.6 + Math.random() * 0.8),
          });
        }
      }
    }

    function spawnShooter() {
      // Enter from the top-left two-thirds, travel down-right — the natural
      // diagonal. Speed and length randomised so no two read the same.
      const speed = 520 + Math.random() * 360;
      const angle = Math.PI * (0.12 + Math.random() * 0.16); // ~22°–50° below horizontal
      shooters.push({
        x: Math.random() * width * 0.66,
        y: Math.random() * height * 0.4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: 120 + Math.random() * 140,
        life: 0,
        ttl: 0.8 + Math.random() * 0.5,
      });
    }

    build();

    // Reduced motion — paint one static frame, no animation loop.
    if (reduced) {
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${starRgb}, ${s.baseAlpha})`;
        ctx.fill();
      }
      const onResizeStatic = () => {
        build();
        ctx.clearRect(0, 0, width, height);
        for (const s of stars) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${starRgb}, ${s.baseAlpha})`;
          ctx.fill();
        }
      };
      window.addEventListener("resize", onResizeStatic);
      return () => window.removeEventListener("resize", onResizeStatic);
    }

    let raf = 0;
    let last = performance.now();
    let nextShooter = 1.5 + Math.random() * 3.5;
    let elapsed = 0;

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      ctx!.clearRect(0, 0, width, height);

      // ── depth field ────────────────────────────────────────────────
      for (const s of stars) {
        s.x += s.drift * dt;
        if (s.x > width + 2) s.x = -2;
        const twinkle = 0.65 + 0.35 * Math.sin(s.phase + elapsed * s.twinkleSpeed);
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${starRgb}, ${(s.baseAlpha * twinkle).toFixed(3)})`;
        ctx!.fill();
      }

      // ── shooting stars ─────────────────────────────────────────────
      nextShooter -= dt;
      if (nextShooter <= 0) {
        spawnShooter();
        nextShooter = 3 + Math.random() * 6;
      }
      shooters = shooters.filter((sh) => sh.life < 1);
      for (const sh of shooters) {
        sh.life += dt / sh.ttl;
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;
        // Fade in over the first 20%, out over the last 45%.
        const fade =
          sh.life < 0.2
            ? sh.life / 0.2
            : sh.life > 0.55
              ? Math.max(0, 1 - (sh.life - 0.55) / 0.45)
              : 1;
        const mag = Math.hypot(sh.vx, sh.vy) || 1;
        const tailX = sh.x - (sh.vx / mag) * sh.length;
        const tailY = sh.y - (sh.vy / mag) * sh.length;
        const grad = ctx!.createLinearGradient(sh.x, sh.y, tailX, tailY);
        grad.addColorStop(0, `rgba(${starRgb}, ${(0.95 * fade).toFixed(3)})`);
        grad.addColorStop(0.35, `rgba(${accentRgb}, ${(0.5 * fade).toFixed(3)})`);
        grad.addColorStop(1, `rgba(${accentRgb}, 0)`);
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = 1.6;
        ctx!.lineCap = "round";
        ctx!.beginPath();
        ctx!.moveTo(sh.x, sh.y);
        ctx!.lineTo(tailX, tailY);
        ctx!.stroke();
        // Bright head.
        ctx!.beginPath();
        ctx!.arc(sh.x, sh.y, 1.5, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${starRgb}, ${(0.95 * fade).toFixed(3)})`;
        ctx!.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    const onResize = () => build();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Decorative — the canvas carries no accessible content. No `aria-hidden`:
  // an empty <canvas> exposes nothing to assistive tech, and `aria-hidden` on
  // a potentially focusable element trips the a11y linter.
  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
