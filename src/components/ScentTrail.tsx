'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Sparkles } from 'lucide-react';
import type { LiquidEngine } from '../lib/scent-trail-engine';
import styles from './ScentTrail.module.css';

const SOURCE = '/editorial/aura-estela.svg';
type Connection = EventTarget & { saveData?: boolean };
type Controls = { burst: () => void; pause: (value: boolean) => void };

export default function ScentTrail() {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const controls = useRef<Controls | null>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = window.matchMedia('(max-width: 767px), (pointer: coarse)');
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    let engine: LiquidEngine | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let image: HTMLImageElement | null = null;
    let disposed = false;
    let loading = false;
    let failed = false;
    let visible = false;
    let isPaused = false;
    let releaseTimer: ReturnType<typeof setTimeout> | undefined;

    const allowed = () => !motion.matches && !connection?.saveData && !(memory && memory <= 2);
    const syncVisibility = () => engine?.setVisible(visible && !document.hidden && !isPaused && allowed());
    const resize = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      const imageHeight = Math.min(height * 0.98, width * 1.5);
      const imageWidth = imageHeight * 2 / 3;
      engine?.resize(width, height, { x: (width - imageWidth) / 2, y: (height - imageHeight) / 2, w: imageWidth, h: imageHeight });
    };
    const disposeEngine = () => {
      if (image) { image.onload = null; image.onerror = null; image = null; }
      clearTimeout(releaseTimer);
      engine?.destroy();
      engine = null;
      canvas?.remove();
      canvas = null;
      if (!disposed) setReady(false);
    };
    const fallback = () => { failed = true; disposeEngine(); };

    const initialize = async () => {
      if (disposed || loading || engine || failed || !visible || !allowed()) return;
      loading = true;
      try {
        const { LiquidEngine: Engine } = await import('../lib/scent-trail-engine');
        if (disposed || !allowed() || !visible) return;
        canvas = document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        stage.appendChild(canvas);
        engine = new Engine(canvas, {
          lowPower: mobile.matches,
          interactive: true, strength: 0.7, radius: 150,
          density: mobile.matches ? 0.3 : 0.55, dotSize: 1.2,
          spread: 0.65, turbulence: 0.65, returnSpeed: 1.2,
          streaks: true, restStyle: 'image', ambient: !mobile.matches,
          ambientIntensity: 0.25, speed: 0.65, intro: false,
          reducedMotion: false, bg: [0.129, 0.09, 0.098], imgBg: null, liquid: 0.65,
        }, fallback);
        engine.setVisible(false);
        image = new Image();
        image.decoding = 'async';
        image.onload = () => {
          if (disposed || !engine || !image) return;
          try {
            engine.onFirstFrame = () => { if (!disposed && engine) setReady(true); };
            engine.setImage(image);
            resize();
            syncVisibility();
          } catch { fallback(); }
        };
        image.onerror = fallback;
        image.src = SOURCE;
      } catch { fallback(); }
      finally { loading = false; }
    };

    const burst = () => {
      if (!engine || !visible || isPaused || !allowed()) return;
      const x = stage.clientWidth * 0.55;
      const y = stage.clientHeight * 0.5;
      engine.pointer('down', x, y, true);
      clearTimeout(releaseTimer);
      releaseTimer = setTimeout(() => engine?.pointer('up', x, y, true), 120);
    };
    controls.current = {
      burst,
      pause(value) { isPaused = value; syncVisibility(); },
    };

    const point = (event: PointerEvent) => {
      const bounds = stage.getBoundingClientRect();
      return [event.clientX - bounds.left, event.clientY - bounds.top] as const;
    };
    const onMove = (event: PointerEvent) => {
      if (isPaused || !allowed() || (event.pointerType === 'touch' && !event.buttons && !event.pressure)) return;
      const [x, y] = point(event);
      engine?.pointer('move', x, y, event.pointerType === 'touch');
    };
    const onDown = (event: PointerEvent) => {
      if (isPaused || !allowed()) return;
      const [x, y] = point(event);
      engine?.pointer('down', x, y, event.pointerType === 'touch');
    };
    const onUp = (event: PointerEvent) => {
      const [x, y] = point(event);
      engine?.pointer('up', x, y, event.pointerType === 'touch');
    };
    const onLeave = (event: PointerEvent) => {
      const [x, y] = point(event);
      engine?.pointer('leave', x, y, event.pointerType === 'touch');
    };
    const preferenceChanged = () => {
      if (!allowed()) disposeEngine();
      else void initialize();
      syncVisibility();
    };
    const viewport = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) void initialize();
      syncVisibility();
    }, { threshold: 0.08 });
    const size = new ResizeObserver(resize);
    viewport.observe(stage);
    size.observe(stage);
    document.addEventListener('visibilitychange', syncVisibility);
    motion.addEventListener('change', preferenceChanged);
    connection?.addEventListener('change', preferenceChanged);
    stage.addEventListener('pointermove', onMove, { passive: true });
    stage.addEventListener('pointerdown', onDown, { passive: true });
    stage.addEventListener('pointerup', onUp, { passive: true });
    stage.addEventListener('pointercancel', onUp, { passive: true });
    stage.addEventListener('pointerleave', onLeave, { passive: true });

    return () => {
      disposed = true;
      viewport.disconnect();
      size.disconnect();
      document.removeEventListener('visibilitychange', syncVisibility);
      motion.removeEventListener('change', preferenceChanged);
      connection?.removeEventListener('change', preferenceChanged);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);
      stage.removeEventListener('pointerleave', onLeave);
      disposeEngine();
      controls.current = null;
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.root} relative h-full w-full bg-aura-ink`} data-animated={ready} data-paused={paused}>
      <div ref={stageRef} className={styles.stage} style={{ touchAction: 'pan-y' }} aria-hidden="true">
        <img src={SOURCE} alt="" width={640} height={960} loading="lazy" decoding="async" className={styles.poster} />
      </div>
      {ready && <div className="absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-2 sm:inset-x-4 sm:top-4">
        <button type="button" onClick={() => controls.current?.burst()} disabled={paused} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-aura-ink/75 px-3 text-xs text-aura-gold-soft transition-colors hover:bg-aura-wine disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aura-gold-soft">
          <Sparkles size={14} aria-hidden="true" /> Sentí la estela
        </button>
        <button type="button" aria-label={paused ? 'Reanudar movimiento de la estela' : 'Pausar movimiento de la estela'} aria-pressed={paused} onClick={() => { const next = !paused; controls.current?.pause(next); setPaused(next); }} className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-aura-ink/75 text-aura-gold-soft hover:bg-aura-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aura-gold-soft">
          {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        </button>
      </div>}
    </div>
  );
}
