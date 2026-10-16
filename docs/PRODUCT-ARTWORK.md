# Imágenes expresivas del catálogo

La versión 4 amplía las notas fotográficas, repite las mismas notas en distintos planos y suma una salpicadura de agua transparente. Conserva el frasco, los trazos del logo y los datos impresos. La selección de ingredientes sigue las notas reales del catálogo; la foto original de administración permanece intacta.

- Composición compartida: `src/lib/server/productArtwork.ts`.
- Agua: `public/products/botanico-v4/_assets/agua-splash.png`.
- Generación: herramienta integrada de imágenes, con fondo transparente.
- Formato de catálogo: JPEG de 960 × 1200; vista rápida: PNG transparente de 1000 × 820.
- URLs nuevas con `v=4` para renovar la caché. Las versiones 1–3 conservan la composición clásica.
- Los recortes de las notas y el frasco siguen en `public/products/botanico-v3/_assets/`.

## Prompt del recurso de agua

Use case: product-mockup. Asset type: transparent photographic water-splash overlay to be layered BEHIND an existing perfume bottle and real ingredient cutouts in a luxury fragrance web catalog. Generate only clear water: a graceful, energetic, asymmetric arc of splashing water rising from lower left and sweeping around the outer sides, with scattered suspended droplets and a few slender curling ribbons. Keep the central 40% mostly empty and completely transparent, so a separately composited bottle and its label remain unobstructed. Several droplets may float high at the sides. Physically believable macro studio water photography, crisp refraction and sparkling highlights, warm neutral studio lighting, clear colorless water, refined but visibly expressive. Shape fits comfortably within a square canvas without touching edges. Actual transparent background. No bottle, no fruit, no flowers, no foliage, no text, no logo, no ground plane, no opaque backdrop, no frame, no checkerboard, no large solid water sheet.
