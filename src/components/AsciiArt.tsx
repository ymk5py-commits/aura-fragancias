'use client';

import { useEffect, useRef } from 'react';

interface AsciiArtProps {
  src: string;
  poster: string;
  className?: string;
}

/** Reproduce la pieza sólo mientras se ve y si el usuario acepta movimiento. */
export default function AsciiArt({ src, poster, className = '' }: AsciiArtProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const sincronizar = () => {
      if (visible && !movimientoReducido.matches) {
        void video.play().catch(() => {
          // El póster queda visible si el navegador impide la reproducción.
        });
      } else {
        video.pause();
      }
    };
    const observador = new IntersectionObserver(([entrada]) => {
      visible = entrada.isIntersecting;
      sincronizar();
    }, { threshold: 0.15 });

    observador.observe(video);
    movimientoReducido.addEventListener('change', sincronizar);
    return () => {
      observador.disconnect();
      movimientoReducido.removeEventListener('change', sincronizar);
      video.pause();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className={className}
      src={src}
      poster={poster}
      preload="none"
      loop
      muted
      playsInline
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}