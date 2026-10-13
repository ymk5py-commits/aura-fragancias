import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(root,'../../..');
const previous=path.resolve(root,'../2026-10-plan-posteos');
const fontConfig=path.join(root,'fonts','fonts.conf');
await fs.writeFile(fontConfig,`<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${path.join(root,'fonts').replaceAll('&','&amp;')}</dir></fontconfig>`);
process.env.FONTCONFIG_FILE=fontConfig;
const plan=JSON.parse(await fs.readFile(path.join(root,'plan.json'),'utf8'));
const wine='#580c17',ivory='#f8f5f0',muted='#827773';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const source=await fs.readFile(path.join(repo,'public/brand/aura-wordmark-black.svg'),'utf8');
const paths=source.slice(source.indexOf('>')+1,source.lastIndexOf('</svg>')).trim();
const logo=(color=wine,x=450,y=70,w=180)=>`<svg x="${x}" y="${y}" width="${w}" height="${w*631/1889}" viewBox="0 0 1889 631">${paths.replace(/#000000/g,color)}</svg>`;
const rect=(x,y,w,h,color)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
const text=(x,y,value,size=26,color=wine,weight=400,extra='')=>`<text x="${x}" y="${y}" font-family="Jost, sans-serif" font-size="${size}" fill="${color}" font-weight="${weight}" ${extra}>${escape(value)}</text>`;
const centered=(y,value,size=26,color=wine,weight=400,extra='')=>text(540,y,value,size,color,weight,`text-anchor="middle" ${extra}`);
const svg=body=>`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">${body}</svg>`;
const dataUrl=(b,mime='image/jpeg')=>`data:${mime};base64,${b.toString('base64')}`;
const bottle=dataUrl(await fs.readFile(path.join(root,'assets/frasco-aura-estudio.png')),'image/png');
const footer=(color=muted)=>centered(1012,'aurafragancias.store',20,color,400,'letter-spacing="1"');
const photo=url=>`<image href="${url}" x="0" y="0" width="1080" height="1080" preserveAspectRatio="xMidYMid slice"/>`;
const wrap=(value,max)=>{const rows=[];let line='';for(const w of value.split(/\s+/)){if((line+' '+w).trim().length>max&&line){rows.push(line);line=w;}else line=(line+' '+w).trim();}if(line)rows.push(line);return rows;};
async function fit(value,max,width){const m=await sharp({text:{text:value,font:`Jost ${max}`,rgba:true,dpi:72}}).metadata();return Math.floor(Math.min(max,max*width/m.width));}

async function cover(p){
 const url=dataUrl(await fs.readFile(path.join(previous,'assets',`${p.key}-humano.jpg`)));
 const size=Math.min(...await Promise.all(p.headline.map(s=>fit(s,74,444))));
 const support=p.n===3?['10, 30 y 50 ml.','Acompañá tu rutina.']:p.n===7?['Gift Card desde Gs. 100.000.','PDF por WhatsApp.']:wrap(p.benefit,28);
 return svg(`<defs><linearGradient id="air"><stop offset="0" stop-color="${ivory}"/><stop offset="0.4" stop-color="${ivory}" stop-opacity="0.98"/><stop offset="0.63" stop-color="${ivory}" stop-opacity="0"/></linearGradient></defs>${photo(url)}${rect(0,0,1080,1080,'url(#air)')}${logo(wine,80,82,178)}${p.headline.map((s,i)=>text(80,340+i*size*1.12,s,size,wine,400,'letter-spacing="-1"')).join('')}${support.map((s,i)=>text(80,718+i*36,s,26,muted)).join('')}${text(80,915,'Deslizá para descubrir.',21,wine,400)}${text(80,1008,'aurafragancias.store',18,muted)}`);
}

async function productSlide(q){
 const titleSize=await fit(q.displayName,61,900);
 const notes=q.notes.slice(0,3).map(s=>{s=s.replace('BERGAMONTA','BERGAMOTA').replace('AMIZCLE','ALMIZCLE');return s.toLocaleLowerCase('es').replace(/^\p{L}/u,c=>c.toLocaleUpperCase('es'));}).join(' · ');
 const noteLines=wrap(notes,62);
 return svg(`${rect(0,0,1080,1080,ivory)}${logo()}${text(1000,108,q.code,23,muted,400,'text-anchor="end" letter-spacing="2"')}${centered(184,'INSPIRADO EN',17,muted,400,'letter-spacing="3"')}${centered(246,q.displayName,titleSize,wine,400,'letter-spacing="-1"')}<defs><radialGradient id="shadow"><stop offset="0" stop-color="#564036" stop-opacity=".13"/><stop offset="1" stop-color="#564036" stop-opacity="0"/></radialGradient></defs><ellipse cx="540" cy="905" rx="168" ry="18" fill="url(#shadow)"/><image href="${bottle}" x="280" y="266" width="520" height="650"/>${logo(wine,488,582,104)}${centered(666,q.code,27,wine,400,'letter-spacing="2"')}${centered(714,'EXTRAIT DE PARFUM',8.5,wine,400,'letter-spacing="1"')}${centered(784,'50 ml  ·  30%',10,wine)}${noteLines.map((s,i)=>centered(946+i*32,s,24,muted)).join('')}${footer()}`);
}

function cheque(){return `<g transform="translate(130 399) rotate(-4 410 183)">${rect(0,0,820,364,'#fffdf9')}${rect(618,0,202,364,wine)}${logo(wine,34,35,145)}${text(34,155,'Un regalo para elegir.',29)}${text(34,212,'Para: tu persona favorita',19,muted)}${text(34,251,'De: vos',19,muted)}${text(34,320,'Tu nombre. Tu dedicatoria.',16,muted)}${text(719,90,'GIFT CARD',14,ivory,400,'text-anchor="middle" letter-spacing="2"')}${text(719,186,'Gs.',18,ivory,400,'text-anchor="middle"')}${text(719,232,'150.000',36,ivory,400,'text-anchor="middle"')}${text(719,320,'Äura Fragancias',13,ivory,400,'text-anchor="middle"')}</g>`;}
function giftSlide(){return svg(`${rect(0,0,1080,1080,ivory)}${logo()}${centered(219,'Tu regalo. Su elección.',66)}${centered(283,'Gift Card con monto personalizable.',26,muted)}${cheque()}${centered(840,'Desde Gs. 100.000',32)}${centered(892,'PDF por WhatsApp, con nombre y dedicatoria.',24,muted)}${centered(936,'60 días desde la confirmación del pago.',24,muted)}${footer()}`);}

function closing(p){
 const gift=p.n===7;
 const title=gift?['Vos regalás.','Esa persona elige.']:['Encontrá tu','próxima fragancia.'];
 return svg(`${rect(0,0,1080,1080,wine)}${logo(ivory,450,88,180)}${title.map((s,i)=>centered(325+i*86,s,75,ivory)).join('')}${centered(484,gift?'Gift Card desde Gs. 100.000.':'Elegí tu inspiración y escribinos.',28,ivory)}${gift?centered(610,'60 días desde la confirmación del pago.',25,ivory):['10 ml','30 ml','50 ml'].map((s,i)=>text(210+i*330,609,s,24,ivory,400,'text-anchor="middle"')).join('')+(gift?'':['Gs. 30.000','Gs. 70.000','Gs. 120.000'].map((s,i)=>text(210+i*330,660,s,35,ivory,400,'text-anchor="middle"')).join(''))}${centered(804,'Pedí por WhatsApp',24,ivory)}${centered(861,'+595 994 414 986',38,ivory)}${centered(945,gift?'Entrega digital sin costo · Canje por WhatsApp':'Delivery cotizado según tu dirección.',22,ivory)}${footer(ivory)}`);
}

const publicDir=path.join(repo,'public/brand/campanas/2026-10-minimal');
await fs.mkdir(publicDir,{recursive:true});
for(const p of plan.posts){
 const art=[await cover(p),...await Promise.all(p.products.map(productSlide))];
 if(p.n===7)art.push(giftSlide());art.push(closing(p));
 const folder=path.join(root,'carruseles',String(p.n).padStart(2,'0'));
 await fs.mkdir(folder,{recursive:true});
 for(let i=0;i<art.length;i++){
  const buffer=await sharp(Buffer.from(art[i])).jpeg({quality:95,chromaSubsampling:'4:4:4'}).toBuffer();
  await fs.writeFile(path.join(folder,p.slideFiles[i]),buffer);
  await fs.writeFile(path.join(publicDir,p.slideFiles[i]),buffer);
 }
 const layers=await Promise.all(p.slideFiles.map(async(f,i)=>({input:await sharp(path.join(folder,f)).resize(360,360).toBuffer(),left:i*380+20,top:20})));
 await sharp({create:{width:1920,height:400,channels:3,background:ivory}}).composite(layers).jpeg({quality:94}).toFile(path.join(root,`vista-carrusel-${String(p.n).padStart(2,'0')}.jpg`));
 console.log(`Carrusel ${p.n}: diseño minimalista exportado.`);
}
const layers=await Promise.all(plan.posts.map(async(p,i)=>({input:await sharp(path.join(root,'carruseles',String(p.n).padStart(2,'0'),p.slideFiles[0])).resize(360,360).toBuffer(),left:i%5*380+20,top:Math.floor(i/5)*400+60})));
await sharp({create:{width:1920,height:850,channels:3,background:ivory}}).composite(layers).jpeg({quality:94}).toFile(path.join(root,'VISTA-10-CONTENIDOS.jpg'));
console.log('50 piezas minimalistas listas.');
