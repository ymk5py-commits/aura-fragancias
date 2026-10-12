from pathlib import Path
import json, re, html
from datetime import date
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from fontTools.ttLib import TTFont as Font
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
PLAN = json.loads((ROOT / 'plan.json').read_text())
OUT = REPO / 'output/pdf/AURA-PDP-Octubre-2026.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
W, H, M = 595.276, 841.89, 40
IW = W - 2 * M
WINE, IVORY, SAND, GOLD, INK = '#580c17', '#f8f5f0', '#eee7df', '#c4a275', '#292223'

for name, source, weight in [('Jost', 'Jost', 400), ('JostBold', 'Jost', 600), ('Bricolage', 'Bricolage', 700)]:
    target = ROOT / 'fonts' / (name + '-static.ttf')
    if not target.exists():
        font = Font(ROOT / 'fonts' / (source + '.ttf'))
        axes = {a.axisTag: a.defaultValue for a in font['fvar'].axes}
        axes['wght'] = weight
        instantiateVariableFont(font, axes, inplace=True).save(target)
    pdfmetrics.registerFont(TTFont(name, str(target)))

c = canvas.Canvas(str(OUT), pagesize=(W,H), pageCompression=1)
c.setTitle('Äura - Guía de campaña y plan de posteos - Octubre 2026')
c.setAuthor('Äura Fragancias')
page = 0

def rect(x,y,w,h,color):
    c.setFillColor(HexColor(color)); c.rect(x,y,w,h,fill=1,stroke=0)

def line(y):
    c.setStrokeColor(HexColor(GOLD)); c.setLineWidth(.5); c.line(M,y,W-M,y)

def label(text,x,y,color=WINE,size=8):
    c.setFillColor(HexColor(color)); c.setFont('JostBold',size); c.drawString(x,y,text)

def clean(text):
    # Caption originals, including emoji, are supplied separately in the text file.
    return re.sub(r'[\U00010000-\U0010ffff\u2728\ufe0f]', '', text).strip()

def para(text,x,top,width=IW,size=11,leading=None,color=INK,bold=False):
    st=ParagraphStyle('p',fontName='JostBold' if bold else 'Jost',fontSize=size,
        leading=leading or size*1.36,textColor=HexColor(color),spaceAfter=0)
    text=html.escape(clean(text)).replace('\n','<br/>')
    p=Paragraph(text,st); _,height=p.wrap(width,H)
    p.drawOn(c,x,top-height)
    assert top-height >= 45, f'Text overflow on page {page}: {top-height}'
    return top-height

def title(text,y=688,size=31,width=IW):
    st=ParagraphStyle('t',fontName='Bricolage',fontSize=size,leading=size*1.05,textColor=HexColor(WINE))
    p=Paragraph(html.escape(text),st); _,height=p.wrap(width,H);p.drawOn(c,M,y-height)
    return y-height

def start(section,number):
    global page
    page+=1;rect(0,0,W,H,IVORY)
    c.drawImage(str(REPO/'public/brand/aura-wordmark-burgundy.png'),M,746,width=120,height=40,mask='auto')
    label('GUÍA DE CAMPAÑA  /  OCTUBRE 2026',M,725)
    label(f'{number:02}  /  {section.upper()}',M,704,color='#766767')
    line(54);label('ÄURA FRAGANCIAS  ·  aurafragancias.store',M,35,size=7)
    label(f'{page:02}',W-M-12,35,size=8)

def finish(): c.showPage()

def card(x,top,width,height,kicker,heading,body):
    rect(x,top-height,width,height,SAND)
    label(kicker,x+16,top-25,size=8)
    para(heading,x+16,top-40,width-32,15,18,WINE,True)
    para(body,x+16,top-86,width-32,10,13)

start('Plan de posteos',1)
title('Tu aroma,\ntu estilo.'.replace('\n',' '),y=685,size=43)
para('10 contenidos para conectar, orientar y vender.',M,615,size=16,color=WINE)
para('13 al 31 de octubre de 2026\nInstagram + Facebook · Hora de Asunción',M,577,size=12)
c.drawImage(str(ROOT/'VISTA-10-CONTENIDOS.jpg'),M,255,width=IW,height=IW*850/1920)
line(227)
para('10 carruseles · 50 imágenes · 29 fragancias',M,205,size=19,color=WINE,bold=True)
para('Portadas humanizadas, productos reales del catálogo y un cierre claro para comprar. Esta guía organiza la campaña con la identidad actual de Äura.',M,162,size=12)
finish()

start('Esencia y valor',2)
title('Un aroma para cada estilo.')
para('Hacemos más fácil elegir una fragancia de inspiración: variedad, tres presentaciones y orientación cercana por WhatsApp. El perfume se muestra como parte de la vida cotidiana y como una opción de regalo.',M,632,size=12)
cw=(IW-14)/2
card(M,540,cw,167,'01  /  ELECCIÓN','Variedad para explorar','Inspiraciones para hombre, mujer y unisex. La campaña presenta 29 opciones del catálogo visible, con códigos para pedir sin confusiones.')
card(M+cw+14,540,cw,167,'02  /  PRESENTACIONES','A tu medida','10 ml: Gs. 30.000\n30 ml: Gs. 70.000\n50 ml: Gs. 120.000\nExtrait de Parfum · 30% de concentración.')
card(M,359,cw,167,'03  /  CERCANÍA','Te ayudamos a elegir','Preguntar por preferencias y ocasión de uso. Invitar a conversar por WhatsApp sin prometer duración fija ni un resultado idéntico en todas las personas.')
card(M+cw+14,359,cw,167,'04  /  REGALOS','Libertad para elegir','Gift Card desde Gs. 100.000, monto personalizable y PDF por WhatsApp. Vigencia: 60 días desde la confirmación del pago.')
para('Público: adultos que buscan una fragancia personal o un regalo.\nVoz: cercana, clara y elegante; voseo natural: elegí, contanos, escribinos.\nCompra: tienda online y WhatsApp. Delivery cotizado según la dirección.',M,164,size=10.5)
finish()

start('Pilares editoriales',3)
title('Humanizar. Educar. Vender.')
para('Una idea principal por contenido. Cada escena humana conduce a opciones concretas del catálogo y a un próximo paso sencillo.',M,628,size=12)
for top,kicker,head,body,ids in [
    (552,'01  /  HUMANIZAR','Personas y momentos','Rutinas, regalos y vínculos. Mostrar cómo el perfume acompaña momentos reconocibles, con calidez y naturalidad.','13, 23 y 31 de octubre'),
    (397,'02  /  EDUCAR','Elegir con más claridad','Explicar perfiles olfativos, presentaciones y opciones frescas. Usar palabras simples y mostrar tres ejemplos reales.','15, 17 y 19 de octubre'),
    (242,'03  /  MOSTRAR VALOR Y VENDER','Del interés a la consulta','Presentar ocasiones de uso, Gift Card, asesoramiento y compra online. Cerrar con códigos, precios y WhatsApp.','21, 25, 27 y 29 de octubre')]:
    rect(M,top-138,IW,138,SAND);label(kicker,M+18,top-24)
    para(head,M+18,top-38,IW-36,18,21,WINE,True)
    para(body,M+18,top-68,IW-36,11,14)
    label(ids,M+18,top-121,size=9)
finish()

start('Identidad visual',4)
title('La misma Äura, en cada pieza.')
para('Se conserva el logo oficial y la identidad de la tienda. La referencia de Novudent aporta organización del mensaje, jerarquía y consistencia editorial.',M,630,size=11.5)
for i,(color,name) in enumerate([(WINE,'Borgoña'),(IVORY,'Marfil'),(SAND,'Arena'),(GOLD,'Champán')]):
    x=M+i*(IW/4);rect(x,524,IW/4-10,52,color)
    label(name,x,508,size=9);label(color,x,493,size=8)
para('Bricolage Grotesque',M,462,size=23,color=WINE,bold=True)
para('Títulos con presencia. Jost para información, notas, precios y copys.\nMárgenes de seguridad: mínimo 72 px en las piezas de 1080 × 1080.',M,424,size=11)
c.drawImage(str(ROOT/'carruseles/01'/PLAN['posts'][0]['slideFiles'][0]),M,147,width=240,height=240)
para('Reglas de composición',M+260,383,235,15,19,WINE,True)
para('• Logo con aire y contraste.\n• Una foto protagonista.\n• Texto breve y jerarquizado.\n• Código visible en cada ficha.\n• “Inspirado en” antes del nombre.\n• Precios coherentes en todo el carrusel.\n• Un cierre con acción concreta.',M+260,349,235,10.5,16)
para('Fotografía publicitaria ilustrativa generada con IA. Las personas no se presentan como clientes, empleados ni testimonios reales. Las imágenes de las fichas provienen del catálogo de Äura.',M,119,size=9.5)
finish()

start('Calendario',5)
title('Octubre, del 13 al 31.')
para('Diez contenidos en ambas redes. Cada contenido ocupa una publicación en Instagram y otra en Facebook: 20 publicaciones en total.',M,631,size=11.5)
rect(M,552,IW,30,WINE)
for x,t in [(M+10,'FECHA'),(M+79,'CONTENIDO'),(M+395,'IG'),(M+452,'FB')]:label(t,x,563,IVORY)
for i,p in enumerate(PLAN['posts']):
    y=552-(i+1)*29;rect(M,y,IW,29,SAND if i%2==0 else IVORY)
    label(date.fromisoformat(p['date']).strftime('%d/%m'),M+10,y+10,size=9)
    label(p['title'],M+79,y+10,size=9)
    label(p['instagramTime'],M+395,y+10,size=9)
    label(p['facebookTime'],M+452,y+10,size=9)
para('Zona horaria: America/Asuncion.\nInstagram: carrusel de cinco imágenes.\nFacebook: publicación con las mismas cinco fotos.\nLos horarios iniciales se apoyan en las sugerencias de Metricool; revisar resultados al finalizar la campaña.',M,231,size=11)
para('Qué mirar al cierre',M,134,size=15,color=WINE,bold=True)
para('Consultas por WhatsApp y ventas vinculadas a cada código; visitas al perfil y a la tienda; guardados, compartidos y comentarios. Usar esas señales para ajustar el siguiente mes.',M,106,size=10.5)
finish()

for p in PLAN['posts']:
    start(f"Contenido {p['n']:02}",5+p['n'])
    bottom=title(p['title'],size=27)
    label(f"{date.fromisoformat(p['date']).strftime('%d/%m/%Y')}  ·  INSTAGRAM {p['instagramTime']}  ·  FACEBOOK {p['facebookTime']}",M,bottom-22,size=9)
    para(p['objective'],M,bottom-36,size=10.5)
    size=(IW-4*7)/5
    for i,name in enumerate(p['slideFiles']):
        x=M+i*(size+7)
        c.drawImage(str(ROOT/'carruseles'/f"{p['n']:02}"/name),x,442,width=size,height=size)
        label(f'{i+1} / 5',x,430,size=7)
    col=(IW-22)/2
    for network,x in [('instagram',M),('facebook',M+col+22)]:
        label(network.upper()+'  /  COPY',x,405,size=9)
        # Fit both captions on this one content page, preserving all words.
        raw=clean(p[network]);fs=10
        while True:
            st=ParagraphStyle('fit',fontName='Jost',fontSize=fs,leading=fs*1.27)
            test=Paragraph(html.escape(raw).replace('\n','<br/>'),st)
            _,ht=test.wrap(col,H)
            if ht<=325:break
            fs-=.2
            assert fs>=8.3, f"Caption too long for page {page}"
        para(raw,x,388,col,fs,fs*1.27)
    finish()

start('Uso y seguimiento',16)
title('Todo listo para publicar.')
para('Archivos y orden',M,633,size=17,color=WINE,bold=True)
para('Cada carpeta numerada contiene las cinco imágenes del carrusel. Cargar s01, s02, s03, s04 y s05 en ese orden. Los JPG son de 1080 × 1080 px y sirven para las dos redes. El archivo de copys conserva los emojis y los enlaces para copiar y pegar.',M,602,size=11)
para('Antes de cada fecha',M,509,size=17,color=WINE,bold=True)
para('Si cambian precios o disponibilidad, actualizar la publicación programada antes de que salga. Responder consultas con el código de la fragancia. Confirmar el importe del delivery según la dirección; coordinar pago y entrega con el cliente.',M,478,size=11)
para('Gift Card',M,388,size=17,color=WINE,bold=True)
para('Desde Gs. 100.000, monto personalizable. Entrega digital sin costo por WhatsApp en PDF, con nombre y dedicatoria. Válida 60 días desde la confirmación del pago. Canje por WhatsApp. Los cupones no aplican a Gift Cards; el envío físico de perfumes se cotiza por dirección.',M,357,size=11)
para('Fuentes y criterio de trabajo',M,248,size=17,color=WINE,bold=True)
para('Catálogo público y precios de aurafragancias.store revisados el 11/10/2026: 104 productos visibles; 29 seleccionados para esta campaña. Imágenes de producto: flyers oficiales y catálogo de Äura. Logo: archivos oficiales de la tienda.\n\nReferencia de organización: “Novudent - Guía de posteos” y “Novudent - Manual de marca” (borrador v2, 8/10/2026). Se toma el método editorial, conservando la identidad propia de Äura. Esta es una guía de campaña, no un nuevo manual de marca.',M,217,size=9.8)
finish()
c.save()
print(f'PDF creado: {OUT} · {page} páginas')
