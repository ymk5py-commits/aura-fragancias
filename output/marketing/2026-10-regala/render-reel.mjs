// Reel de Äura: animación original del interruptor y revelado de la promoción.
// Ejecutar desde la raíz del repositorio. Usa las imágenes aprobadas de la campaña.
import sharp from 'sharp';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const dir = 'output/marketing/2026-10-regala';
const width = 1080, height = 1920, fps = 30, duration = 9.3;
const logo = (await fs.readFile('public/brand/aura-wordmark-burgundy.svg', 'utf8')).replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const photo = await sharp('public/editorial/regala-perfumes-aura.webp').resize(760, 950).png().toBuffer();
const encoded = photo.toString('base64');
const ease = n => { n = Math.min(1, Math.max(0, n)); return 1 - (1 - n) ** 3; };

function frame(t) {
  const on = ease((t - 1.35) / .45);
  const reveal = ease((t - 1.7) / .7);
  const intro = 1 - ease((t - 1.35) / .35);
  const ending = ease((t - 6.2) / .6);
  const cursor = ease((t - .55) / .7);
  const cursorOpacity = t < 1.65 ? cursor : 1 - ease((t - 1.65) / .35);
  const ring = Math.max(0, (t - 1.35) / .65);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs><linearGradient id="base" x2="0" y2="1"><stop stop-color="#f8f5f0"/><stop offset="1" stop-color="#eee7df"/></linearGradient><linearGradient id="fade" x2="0" y2="1"><stop stop-color="#f8f5f0" stop-opacity="0"/><stop offset=".65" stop-color="#f8f5f0"/></linearGradient><mask id="photoMask"><rect x="0" y="0" width="1080" height="1920" fill="white"/><rect x="0" y="1450" width="1080" height="470" fill="url(#fade)"/></mask><filter id="shadow"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#211719" flood-opacity=".14"/></filter></defs>
  <rect width="1080" height="1920" fill="url(#base)"/>
  <rect x="42" y="160" width="996" height="1590" rx="24" fill="none" stroke="#c4a275" stroke-opacity=".4"/>
  <svg x="330" y="220" width="420" height="140" viewBox="0 0 1889 631">${logo}</svg>
  <g fill="#580c17" text-anchor="middle" font-family="Jost, sans-serif">
    <text x="540" y="409" font-size="26" letter-spacing="5">ACTIVÁ TU PRÓXIMO AROMA</text>
    <g filter="url(#shadow)"><rect x="412" y="465" width="256" height="128" rx="64" fill="#ded9d3"/><rect x="412" y="465" width="256" height="128" rx="64" fill="#580c17" opacity="${on}"/><circle cx="${476 + on * 128}" cy="529" r="51" fill="#fffdf9"/></g>
    ${ring > 0 && ring < 1 ? `<circle cx="476" cy="529" r="${60 + ring * 100}" fill="none" stroke="#c4a275" stroke-width="4" opacity="${1 - ring}"/>` : ''}
    <g opacity="${intro}"><text x="540" y="742" font-size="58" font-family="Bricolage Grotesque, sans-serif" font-weight="600">Tu próxima fragancia</text><text x="540" y="805" font-size="39">empieza con un gesto.</text></g>
    <g opacity="${reveal}" transform="translate(0,${(1 - reveal) * 60})"><text x="540" y="864" font-size="262" font-family="Bricolage Grotesque, sans-serif" font-weight="600" letter-spacing="-13">20%</text><text x="540" y="931" font-size="47" letter-spacing="8">DE DESCUENTO</text><line x1="220" y1="985" x2="860" y2="985" stroke="#c4a275" stroke-width="2"/></g>
  </g>
  <g opacity="${reveal}" transform="translate(0,${(1 - reveal) * 35 + Math.sin(t * .7) * 5})"><image href="data:image/png;base64,${encoded}" x="160" y="995" width="760" height="950"/></g><rect x="0" y="1450" width="1080" height="550" fill="url(#fade)"/>

  <g opacity="${ending}" font-family="Jost, sans-serif" text-anchor="middle"><rect x="210" y="1530" width="660" height="84" rx="42" fill="#580c17"/><text x="540" y="1585" font-size="31" fill="#f8f5f0" letter-spacing="3">DESCUBRÍ LA PROMO  ↗</text></g>
  <g font-family="Jost, sans-serif" text-anchor="middle" fill="#580c17"><text x="540" y="1667" font-size="32" letter-spacing="2">aurafragancias.store</text><text x="540" y="1712" font-size="22">Consultá vigencia y fragancias participantes por WhatsApp.</text></g>
  <g opacity="${cursorOpacity}" transform="translate(${740 - cursor * 250},${875 - cursor * 320}) rotate(-18)"><path d="M0 0 L0 86 L23 65 L43 104 L62 94 L42 57 L72 55 Z" fill="#fffdf9" stroke="#580c17" stroke-width="5" stroke-linejoin="round"/></g>
  </svg>`;
}

await fs.mkdir(dir, { recursive: true });
const audio = '0.035*(sin(2*PI*174.61*t)+0.5*sin(2*PI*220*t)+0.3*sin(2*PI*261.63*t))*min(t/0.8,1)*min((9.3-t)/0.8,1)+if(between(t,1.35,1.40),0.12*sin(2*PI*1250*t)*exp(-80*(t-1.35)),0)';
const ffmpeg = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', 'png', '-i', 'pipe:0', '-f', 'lavfi', '-i', `aevalsrc=${audio.replaceAll(',', '\\,')}:s=48000:d=${duration}`, '-t', String(duration), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', `${dir}/AURA-reel-20-off-1080x1920.mp4`], { stdio: ['pipe', 'ignore', 'inherit'] });
const exit = once(ffmpeg, 'close');
for (let index = 0; index < Math.round(fps * duration); index++) {
  const time = index / fps;
  const png = await sharp(Buffer.from(frame(time))).png().toBuffer();
  if ([0, 60, 120, 240].includes(index)) await fs.writeFile(`${dir}/reel-frame-${index}.png`, png);
  if (!ffmpeg.stdin.write(png)) await once(ffmpeg.stdin, 'drain');
  if (index % 90 === 0) console.log(`Reel: ${index}/${Math.round(fps * duration)} fotogramas`);
}
ffmpeg.stdin.end();
const [code] = await exit;
if (code !== 0) throw new Error(`No se pudo exportar el reel (${code}).`);
console.log('Reel 1080 × 1920, 30 fps, 9,3 segundos exportado con audio original.');
