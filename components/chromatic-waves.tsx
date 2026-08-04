"use client";

import { useEffect, useRef } from "react";

type Wave = {
  amp: number;
  freq: number;
  speed: number;
  phase: number;
  yFrac: number;
  hue: number;
};

const WAVES: Wave[] = [
  { amp: 34, freq: 0.0016, speed: 0.42, phase: 0.0, yFrac: 0.72, hue: 258 },
  { amp: 26, freq: 0.0024, speed: -0.34, phase: 1.2, yFrac: 0.85, hue: 320 },
  { amp: 40, freq: 0.0011, speed: 0.3, phase: 2.4, yFrac: 0.58, hue: 190 },
  { amp: 22, freq: 0.0032, speed: -0.5, phase: 0.6, yFrac: 0.95, hue: 300 },
  { amp: 30, freq: 0.0019, speed: 0.26, phase: 3.1, yFrac: 0.42, hue: 230 },
];

/**
 * "Chromatic Waves" — the Scentury21 signature atmospheric background.
 * Layered, hue-shifting sine waves drawn on a canvas with additive blending.
 */
export default function ChromaticWaves({
  className = "",
  intensity = 0.5,
}: {
  className?: string;
  intensity?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const t0 = performance.now();

    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      for (const wave of WAVES) {
        const hue = (wave.hue + t * 7) % 360;
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, `hsla(${hue}, 92%, 66%, ${0.15 * intensity})`);
        grad.addColorStop(0.5, `hsla(${(hue + 80) % 360}, 96%, 66%, ${0.22 * intensity})`);
        grad.addColorStop(1, `hsla(${(hue + 160) % 360}, 92%, 66%, ${0.15 * intensity})`);
        ctx.fillStyle = grad;

        const baseY = h * wave.yFrac;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 6) {
          const y = baseY + Math.sin(x * wave.freq + t * wave.speed * 1000 + wave.phase) * wave.amp;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    if (reduced) {
      draw(t0);
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [intensity]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
