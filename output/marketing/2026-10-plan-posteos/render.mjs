import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
const root=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(root,'../../..');
if(!process.env.FONTCONFIG_FILE){
 const config=path.join(root,'fonts','fonts.conf');
 await fs.writeFile(config,`<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${path.join(root,'fonts').replaceAll('&','&amp;')}</dir></fontconfig>`);
 process.env.FONTCONFIG_FILE=config;
}
const plan=JSON.parse(await fs.readFile(path.join(root,'plan.json'),'utf8'));
const generated=JSON.parse(await fs.readFile(path.join(root,'generation-humanizada.json'),'utf8'));
const wine='#580c17',ivory='#f8f5f0',sand='#eee7df',gold='#c4a275';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const logoSource=await fs.readFile(path.join(repo,'public/brand/aura-wordmark-black.svg'),'utf8');
const logoPaths=logoSource.slice(logoSource.indexOf('>')+1,logoSource.lastIndexOf('</svg>')).trim();
const logo=(color=wine,x=72,y=60,w=240)=>`<svg x="${x}" y="${y}" width="${w}" height="${w*631/1889}" viewBox="0 0 1889 631">${logoPaths.replace(/#000000/g,color)}</svg>`;
const rect=(x,y,w,h,fill,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const text=(x,y,content,size=26,color=wine,weight=400,extra='')=>`<text x="${x}" y="${y}" font-family="Jost, sans-serif" font-size="${size}" fill="${color}" font-weight="${weight}" ${extra}>${escape(content)}</text>`;
const headline=(lines,x,y,size=88,color=wine)=>lines.map((line,i)=>text(x,y+i*size*1.04,line,size,color,700,'style="font-family:Bricolage Grotesque, sans-serif;letter-spacing:-2px"')).join('');
const svg=body=>`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1080" viewBox="0 0 1080 1080">${body}</svg>`;
const dataUrl=(data,mime='image/jpeg')=>`data:${mime};base64,${data.toString('base64')}`;
const photo=(url,x=0,y=0,w=1080,h=1080,extra='')=>`<image href="${url}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" ${extra}/>`;
const footer=(index,color=wine)=>`<path d="M72 978H1008" stroke="${color}" opacity="0.35"/>${text(72,1020,'aurafragancias.store',22,color,500)}${text(1008,1020,`${index} / 5`,21,color,500,'text-anchor="end"')}`;
const wrap=(value,max=29)=>{let rows=[],line='';for(const word of value.split(/\s+/)){if((line+' '+word).trim().length>max&&line){rows.push(line);line=word;}else line=(line+' '+word).trim();}if(line)rows.push(line);return rows;};
async function fitted(lines,max=88,width=440){let size=max;for(const line of lines){const m=await sharp({text:{text:line,font:`Bricolage Grotesque Bold ${max}`,rgba:true,dpi:72}}).metadata();if(m.width>width)size=Math.min(size,max*width/m.width);}return Math.floor(size);}
for(const dir of ['assets','carruseles','fuentes'])await fs.mkdir(path.join(root,dir),{recursive:true});
const humanPhotos={};
for(const entry of generated){
 const out=path.join(root,'assets',`${entry.key}-humano.jpg`);
 try{await fs.access(out);}catch{await sharp(entry.path).resize(1080,1080,{fit:'cover'}).jpeg({quality:94}).toFile(out);}
 humanPhotos[entry.key]=dataUrl(await fs.readFile(out));
}
const productArt={};
for(const product of JSON.parse(await fs.readFile(path.join(root,'seleccion-productos.json'),'utf8')).products){
 const out=path.join(root,'assets',`${product.code}-catalogo.jpg`);
 const view=['DD022','UU021','UU052'].includes(product.code)?'0 280 1080 780':'0 270 1080 630';
 try{await fs.access(out);}catch{
  const source=path.join(root,'productos',`${product.code}${view.includes('270')?'-flyer.jpg':'.png'}`);
  await sharp(await fs.readFile(source)).jpeg({quality:94}).toFile(out);
 }
 productArt[product.code]={url:dataUrl(await fs.readFile(out)),view};
}
async function cover(p){
 const dark=[3,5,8].includes(p.n);const bg=dark?wine:ivory;const fg=dark?ivory:wine;
 const size=await fitted(p.headline,p.n===8?77:91,450);
 const bottom=326+(p.headline.length-1)*size*1.04;
 const support=p.n===3?['10, 30 y 50 ml.','Para acompañar tu rutina.']:p.n===7?['PDF por WhatsApp.','Desde Gs. 100.000.']:wrap(p.benefit,28);
 return svg(`<defs><linearGradient id="shade"><stop offset="0" stop-color="${bg}"/><stop offset="0.44" stop-color="${bg}" stop-opacity="0.97"/><stop offset="0.64" stop-color="${bg}" stop-opacity="0.05"/><stop offset="0.8" stop-color="${bg}" stop-opacity="0"/></linearGradient></defs>${photo(humanPhotos[p.key])}${rect(0,0,1080,1080,'url(#shade)')}${logo(fg)}${text(72,202,'FRAGANCIAS DE INSPIRACIÓN',19,fg,500,'letter-spacing="2.1"')}${headline(p.headline,72,326,size,fg)}${support.map((line,i)=>text(72,Math.max(610,bottom+90)+i*38,line,29,fg,400)).join('')}${text(72,850,'DESLIZÁ Y CONOCÉ LAS OPCIONES',18,fg,500,'letter-spacing="1"')}<path d="M72 886H154M144 876L154 886L144 896" fill="none" stroke="${fg}" stroke-width="2"/>${rect(0,950,1080,130,bg)}${footer(1,fg)}`);
}
function productSlide(p,product,index){
 const {url,view}=productArt[product.code];
 const title=product.displayName;const font=title.length>25?52:title.length>19?60:70;
 const notes=product.notes.slice(0,3).map(x=>x.replace('BERGAMONTA','BERGAMOTA').replace('AMIZCLE','ALMIZCLE')).join(' · ');
 const noteLines=wrap(notes,62);
 return svg(`${rect(0,0,1080,1080,ivory)}${logo(wine,72,52,230)}${text(1008,113,product.code,50,wine,700,'text-anchor="end"')}${text(72,182,'INSPIRADO EN',19,wine,500,'letter-spacing="3"')}${text(72,258,title,font,wine,600,'style="font-family:Bricolage Grotesque, sans-serif;letter-spacing:-1.3px"')}<svg x="72" y="300" width="936" height="500" viewBox="${view}" preserveAspectRatio="xMidYMid meet"><image href="${url}" width="1080" height="1350"/></svg>${noteLines.map((line,i)=>text(72,840+i*31,line,23,wine,500)).join('')}<path d="M72 891H1008" stroke="${gold}"/>${['10 ml','30 ml','50 ml'].map((s,i)=>text(72+i*320,925,s,19,wine,500)).join('')}${['Gs. 30.000','Gs. 70.000','Gs. 120.000'].map((s,i)=>text(72+i*320,964,s,31,wine,600)).join('')}${footer(index)}`);
}
function cheque(){return `<g transform="translate(128 420) scale(0.88) rotate(-5 450 200)">${rect(0,0,900,400,ivory)}${rect(675,0,225,400,wine)}<rect x="12" y="12" width="876" height="376" fill="none" stroke="${gold}"/>${logo(wine,40,35,180)}${text(40,172,'Un regalo para elegir.',35,wine,500)}${text(40,234,'Para: tu persona favorita',22)}${text(40,279,'De: vos',22)}${text(40,350,'Tu nombre. Tu dedicatoria.',19)}${text(788,110,'GIFT CARD',17,ivory,500,'text-anchor="middle" letter-spacing="2"')}${text(788,210,'Gs.',20,ivory,400,'text-anchor="middle"')}${text(788,264,'150.000',43,ivory,600,'text-anchor="middle"')}${text(788,348,'Äura Fragancias',15,ivory,400,'text-anchor="middle"')}</g>`;}
function giftSlide(index){return svg(`${rect(0,0,1080,1080,sand)}${logo()}${text(72,202,'GIFT CARD ÄURA',20,wine,500,'letter-spacing="3"')}${headline(['Tu regalo.','Su elección.'],72,292,76)}${cheque()}${text(72,834,'DESDE Gs. 100.000 · MONTO PERSONALIZABLE',25,wine,600)}${text(72,884,'PDF por WhatsApp, con nombre y dedicatoria.',27)}${text(72,927,'Válida 60 días desde la confirmación del pago.',24)}${footer(index)}`);}
function closing(p){
 const gift=p.n===7;
 const lines=gift?['Vos regalás.','Esa persona','elige.']:['¿Cuál va','con vos?'];
 return svg(`${rect(0,0,1080,1080,wine)}${logo(ivory)}${text(72,202,'TE AYUDAMOS A ELEGIR',20,ivory,500,'letter-spacing="2.4"')}${headline(lines,72,334,gift?89:106,ivory)}${text(72,gift?625:600,gift?'Gift Card desde Gs. 100.000.':'Escribinos con el código de tu favorita.',32,ivory,400)}${gift?text(72,680,'60 días desde la confirmación del pago.',27,ivory):['10 ml','30 ml','50 ml'].map((s,i)=>text(72+i*320,702,s,23,ivory,400)).join('')+(gift?'':['Gs. 30.000','Gs. 70.000','Gs. 120.000'].map((s,i)=>text(72+i*320,752,s,39,ivory,600)).join(''))}<path d="M72 805H1008" stroke="${gold}"/>${text(72,865,'WhatsApp +595 994 414 986',34,ivory,500)}${text(72,919,gift?'Entrega digital sin costo · Canje por WhatsApp':'Delivery a cotizar según tu dirección.',25,ivory)}${footer(5,ivory)}`);
}
const publicDir=path.join(repo,'public/brand/campanas/2026-10');await fs.mkdir(publicDir,{recursive:true});
for(const p of plan.posts){
 const art=[await cover(p),...p.products.map((q,i)=>productSlide(p,q,i+2))];
 if(p.n===7)art.push(giftSlide(4));art.push(closing(p));
 const folder=path.join(root,'carruseles',String(p.n).padStart(2,'0'));await fs.mkdir(folder,{recursive:true});
 for(let i=0;i<art.length;i++){
  const filename=p.slideFiles[i];
  await fs.writeFile(path.join(root,'fuentes',filename.replace('.jpg','.svg')),art[i]);
  const buffer=await sharp(Buffer.from(art[i])).jpeg({quality:95,chromaSubsampling:'4:4:4'}).toBuffer();
  await fs.writeFile(path.join(folder,filename),buffer);await fs.writeFile(path.join(publicDir,filename),buffer);
 }
 console.log(`Carrusel ${p.n}: cinco imágenes listas.`);
}
for(const p of plan.posts){
 const layers=await Promise.all(p.slideFiles.map(async(name,i)=>({input:await sharp(path.join(root,'carruseles',String(p.n).padStart(2,'0'),name)).resize(360,360).toBuffer(),left:i*380+20,top:50})));
 await sharp({create:{width:1920,height:430,channels:3,background:ivory}}).composite(layers).jpeg({quality:94}).toFile(path.join(root,`vista-carrusel-${String(p.n).padStart(2,'0')}.jpg`));
}
const covers=await Promise.all(plan.posts.map(async(p,i)=>({input:await sharp(path.join(root,'carruseles',String(p.n).padStart(2,'0'),p.slideFiles[0])).resize(360,360).toBuffer(),left:(i%5)*380+20,top:Math.floor(i/5)*400+60})));
await sharp({create:{width:1920,height:850,channels:3,background:ivory}}).composite(covers).jpeg({quality:94}).toFile(path.join(root,'VISTA-10-CONTENIDOS.jpg'));
console.log('50 imágenes y vistas de conjunto exportadas.');
