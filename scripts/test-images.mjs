/**
 * Tests de los hosts de imágenes permitidos en next.config.mjs.
 *
 * Corre con:
 *   npm run test:images
 *
 * Las fotos subidas desde el panel viven en Firebase Storage y el loader
 * (src/lib/imageLoader.ts) las manda por /_next/image. Si el host no está en
 * `images.remotePatterns`, Vercel responde 400 INVALID_IMAGE_OPTIMIZE_REQUEST
 * y la foto no sale (pasó el 13-19 sep 2026 con todo el catálogo del panel).
 * Usa el mismo matcher que Next para que el test valga lo que vale producción.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasRemoteMatch } from 'next/dist/shared/lib/match-remote-pattern.js';
import nextConfig from '../next.config.mjs';

const { remotePatterns = [], domains = [] } = nextConfig.images;
const permitida = (url) => hasRemoteMatch(domains, remotePatterns, new URL(url));

test('foto de producto subida desde el panel (Firebase Storage) pasa por /_next/image', () => {
  assert.equal(
    permitida(
      'https://firebasestorage.googleapis.com/v0/b/aura-fragancias.firebasestorage.app/o/products%2FCC066-1781033426431-FOTO_AURA_WEB_(58).png?alt=media&token=31a17410-feae-4091-8fcd-11447ec5fb88',
    ),
    true,
  );
});

test('foto de Cloudinary sigue permitida', () => {
  assert.equal(permitida('https://res.cloudinary.com/demo/image/upload/v1/aura/CC001.jpg'), true);
});

test('otro bucket de Firebase Storage no se optimiza a costa nuestra', () => {
  assert.equal(
    permitida('https://firebasestorage.googleapis.com/v0/b/otro-proyecto.appspot.com/o/x.png?alt=media'),
    false,
  );
});

test('un host cualquiera queda rechazado', () => {
  assert.equal(permitida('https://example.com/foto.png'), false);
});
