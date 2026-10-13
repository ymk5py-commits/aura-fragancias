from pathlib import Path
import json, shutil, zipfile

root=Path(__file__).resolve().parent
repo=root.parents[2]
plan=json.loads((root/'plan.json').read_text())
public=repo/'public/brand/descargas'
public.mkdir(parents=True,exist_ok=True)
pdf=repo/'output/pdf/AURA-PDP-Octubre-2026.pdf'
readme='''ÄURA · CAMPAÑA OCTUBRE 2026
13 al 31 de octubre · Hora de Asunción

EDICIÓN MINIMALISTA · 12/10/2026
10 contenidos, 50 imágenes JPG de 1080 × 1080 px.
Cada carpeta contiene un carrusel de cinco imágenes.
Cargar en orden: s01, s02, s03, s04 y s05.

Instagram: un carrusel por contenido, a las 19:00.
Facebook: una publicación de cinco fotos por contenido, a las 10:00;
el 21 de octubre, a las 12:00.

El PDF contiene la guía de campaña, reglas de identidad, calendario,
miniaturas y textos. Los copys completos, con emojis y enlaces,
también se incluyen en TXT; el calendario se entrega en CSV.

Si cambian precios o disponibilidad, actualizar antes de publicar.
Gift Card: mínimo Gs. 100.000, PDF por WhatsApp, 60 días desde pago confirmado.
Delivery de perfumes a cotizar según dirección.

Las portadas usan fotografía publicitaria ilustrativa generada con IA;
no son testimonios ni retratos de clientes o empleados reales.
Las fichas usan un mockup del frasco Äura de 50 ml, basado en la
referencia aprobada, con logo oficial y código aplicado en vector.
Nombres y notas provienen del catálogo de Äura. Los precios se
concentran en el cierre del carrusel. Sin collages ni marcos.
'''
(root/'LEEME.txt').write_text(readme)
shutil.copyfile(pdf,public/pdf.name)
shutil.copyfile(root/'COPYS-OCTUBRE-2026.txt',public/'AURA-COPYS-OCTUBRE-2026.txt')
shutil.copyfile(root/'CALENDARIO-OCTUBRE-2026.csv',public/'AURA-CALENDARIO-OCTUBRE-2026.csv')
target=public/'AURA-10-carruseles-octubre-2026.zip'
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p in plan['posts']:
        for f in p['slideFiles']:
            source=root/'carruseles'/f"{p['n']:02}"/f
            z.write(source,f"{p['n']:02}-{p['key'][3:]}/{f}")
    for f in [pdf,root/'COPYS-OCTUBRE-2026.txt',root/'CALENDARIO-OCTUBRE-2026.csv',root/'LEEME.txt',root/'VISTA-10-CONTENIDOS.jpg']:
        z.write(f,f.name)
with zipfile.ZipFile(target) as z:
    assert z.testzip() is None
    assert len([n for n in z.namelist() if '-s0' in n and n.endswith('.jpg')])==50
print(f'Kit final verificado: {target} ({target.stat().st_size/1024/1024:.1f} MB)')
