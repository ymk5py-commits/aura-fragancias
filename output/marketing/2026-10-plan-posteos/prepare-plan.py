from pathlib import Path
import json, csv, textwrap
root=Path(__file__).parent
plan=json.loads((root/'plan.json').read_text())
selection=json.loads((root/'seleccion-productos.json').read_text())
bycode={p['code']:p for p in selection['products']}
short={'CC016':'Acqua di Giò Profondo','DD161':'Good Girl Blush','UU002':'Santal 33','DD094':'La Vie Est Belle','UU049':'Amber Wood','CC104':'Polo Blue','DD089':'Light Blue Women','UU021':'One','CC087':'Light Blue Men','DD013':'Ralph','UU052':'Blue Mediterraneo','CC009':'Armani Code','DD022':'Black Opium','UU013':'Layton','DD101':'My Way','CC034':'Aventus','UU048':'Erba Gold','DD197':'Miss Dior','CC116':'Sauvage','DD159':'Cloud','CC122':'Ultra Male','UU036':'Lost Cherry','CC189':'Y Eau de Parfum','DD192':'La Bomba','UU041':'Coro','DD096':'Libre','CC157':'Uomo Born in Roma Intense','UU019':'Erba Pura','CC180':'The Most Wanted Parfum'}
headlines=[['Tu aroma,','tu estilo.'],['Elegir puede','ser simple.'],['A tu ritmo.','A tu medida.'],['Frescos','para tu día.'],['Hay momentos','que merecen','su aroma.'],['Un regalo','que dice','mucho.'],['Regalá','la libertad','de elegir.'],['Te escuchamos.','Te orientamos.'],['Elegí desde','donde estés.'],['Hay aromas','que nos','acercan.']]
benefits=['Tres inspiraciones para empezar a elegir.','Fresco, dulce o amaderado: encontrá tu perfil.','Tu favorita en 10, 30 y 50 ml.','Opciones para una rutina más fresca.','Tres inspiraciones para una ocasión especial.','Elegí pensando en esa persona.','PDF por WhatsApp · Desde Gs. 100.000.','Contanos tus gustos y te ayudamos a elegir.','Tienda online y entrega a coordinar.','Inspiraciones para momentos compartidos.']
intros=[
('Tu aroma también dice quién sos. ✨','Deslizá y conocé tres inspiraciones Äura de nuestras colecciones. ¿Cuál va más con tu estilo?'),
('¿Fresco, dulce o amaderado? 🤍','Te mostramos tres perfiles diferentes para empezar a elegir. Contanos qué aromas disfrutás y te ayudamos a recorrer el catálogo.'),
('Un aroma que acompañe tu rutina.','Elegí tu inspiración y la presentación que te resulte cómoda: 10, 30 o 50 ml. Las tres son Extrait de Parfum con 30% de concentración.'),
('Para esos días en los que buscás frescura. 🍋','Deslizá para conocer estas inspiraciones de perfiles frescos, cítricos o aromáticos que tenemos en el catálogo.'),
('Hay momentos que merecen su propio aroma.','Una cena, una salida, un encuentro. Explorá estas inspiraciones cálidas y con carácter para elegir la que vaya con vos.'),
('Hay regalos que se usan. Y otros que se recuerdan. 🎁','Te mostramos tres inspiraciones para regalar. Si no sabés cuál elegir, contanos los gustos de esa persona y te orientamos.'),
('Vos elegís el monto. Esa persona, su próxima fragancia. 🎁','Gift Card Äura desde Gs. 100.000, con importe personalizable, nombre y dedicatoria. La recibís por WhatsApp en PDF. Válida por 60 días desde la confirmación del pago. Deslizá para ver dos de las inspiraciones que puede elegir.'),
('Tu próxima fragancia puede empezar con una conversación. ✨','Si te atraen los perfiles dulces, frutales o avainillados, estas tres inspiraciones pueden ser un punto de partida. Contanos tus gustos y el momento para el que buscás el perfume.'),
('Tu próximo aroma, desde donde estés. 🤍','Explorá estas inspiraciones en nuestra tienda online, elegí la presentación y armá tu pedido. Coordinamos con vos la entrega; el delivery se cotiza según tu dirección.'),
('¿Qué aroma te lleva a un buen recuerdo?','Una persona, un lugar, un momento compartido. Descubrí estas inspiraciones Äura y contanos cuál te gustaría conocer.')]
for i,post in enumerate(plan['posts']):
    post['headline']=headlines[i];post['title']=' '.join(headlines[i]);post['benefit']=benefits[i]
    post['products']=[]
    for code in selection['groups'][i]:
        p=bycode[code]
        q={k:p.get(k) for k in ['code','name','inspiration','gender','family','notes']}
        q['displayName']=short[code]
        post['products'].append(q)
    post['slides']=['Portada humanizada']+[f"{p['code']} · Inspiración {p['displayName']}" for p in post['products']]
    if i==6:post['slides'].append('Gift Card · mínimo, vigencia y PDF por WhatsApp')
    post['slides'].append('Cierre · precios, asesoramiento y pedido')
    post['slideFiles']=[f"{post['file']}-s{j:02}.jpg" for j in range(1,6)]
    post['hook'],post['body']=intros[i]
    products='\n'.join(f"• {p['code']} · Inspirado en {p['displayName']}" for p in post['products'])
    conditions='\n\nGift Card: entrega digital sin costo, canje por WhatsApp y delivery de perfumes a cotizar. Los cupones no aplican a Gift Cards.' if i==6 else '\n\n10 ml Gs. 30.000 · 30 ml Gs. 70.000 · 50 ml Gs. 120.000. Delivery a cotizar.'
    core=f"{post['hook']}\n\n{post['body']}\n\n{products}{conditions}"
    post['instagram']=core+'\n\nPedinos el código por WhatsApp al +595 994 414 986 o entrá desde el enlace de nuestra biografía.\n\n#AuraFraganciasPy #PerfumesParaguay #Asuncion'
    url='https://www.aurafragancias.store/gift-card' if i==6 else 'https://www.aurafragancias.store'
    post['facebook']=core+f'\n\nElegí acá: {url}\nWhatsApp: +595 994 414 986.\n\n#AuraFraganciasPy #PerfumesParaguay'
    post['facebookTime']='12:00' if post['date']=='2026-10-21' else '10:00'
    post['instagramTime']='19:00'
    assert len(post['instagram'])<=2200
    assert len(post['slides'])==5
plan['format']={'width':1080,'height':1080,'type':'Carrusel de 5 imágenes en Instagram / publicación de 5 imágenes en Facebook','slidesPerContent':5,'totalSlides':50}
plan['approach']='Portada humanizada + fragancias reales del catálogo + cierre de venta. Humanizar, educar y mostrar el valor de Äura para convertir consultas y compras.'
plan['campaign']='Tu aroma, tu estilo.'
plan['prices']={'10 ML':30000,'30 ML':70000,'50 ML':120000,'verifiedOn':'2026-10-11'}
plan['catalogSource']='Catálogo público de la tienda (Firestore) y flyers oficiales de Marca; 104 productos visibles al revisar.'
plan['rules'].append('Las fichas usan las imágenes actuales del catálogo. Nombres de referencia siempre precedidos por Inspirado en; se vende la fragancia Äura.')
plan['rules'].append('Cada carrusel incluye cinco imágenes en orden, una sola publicación por red. Instagram usa carrusel; Facebook usa publicación con varias fotos.')
plan['rules']=list(dict.fromkeys(plan['rules']))
(root/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2))
copy='ÄURA · PLAN DE POSTEOS · 13 AL 31 DE OCTUBRE DE 2026\n10 CONTENIDOS · INSTAGRAM + FACEBOOK · 20 PUBLICACIONES\n\n'
for p in plan['posts']:
    copy+=f"{'='*60}\n{p['n']:02} · {p['date']} · {p['title']}\nInstagram {p['instagramTime']} · Facebook {p['facebookTime']} · Hora de Asunción\n{'='*60}\n\nINSTAGRAM\n{p['instagram']}\n\nFACEBOOK\n{p['facebook']}\n\nORDEN DE LAS IMÁGENES\n"+'\n'.join(f'{i+1}. {s}' for i,s in enumerate(p['slides']))+'\n\n'
(root/'COPYS-OCTUBRE-2026.txt').write_text(copy)
with (root/'CALENDARIO-OCTUBRE-2026.csv').open('w',newline='') as f:
    w=csv.writer(f);w.writerow(['Contenido','Fecha','Instagram','Facebook','Tema','Fragancias','Formato'])
    for p in plan['posts']:w.writerow([p['n'],p['date'],p['instagramTime'],p['facebookTime'],p['title'],' / '.join(q['code']+' '+q['displayName'] for q in p['products']),'5 imágenes · 1080 × 1080'])
print('Plan final: 10 carruseles, 50 imágenes y 29 fragancias. Copys y calendario listos.')
