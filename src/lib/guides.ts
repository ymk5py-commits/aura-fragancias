import type { Perfume } from '../types';

export const GUIDES = [
  {
    slug: 'perfumes-para-el-calor', title: 'Cómo elegir un perfume para el calor de Paraguay',
    description: 'Notas frescas, intensidad y aplicación: una guía práctica para elegir tu fragancia de día en Paraguay.',
    date: '2026-10-04', eyebrow: 'Clima y aromas',
    intro: 'En los días cálidos, la mejor elección es la fragancia que te resulta cómoda durante el día. Una familia olfativa puede orientarte, pero probar el aroma en tu piel ayuda a decidir mejor que su nombre o su popularidad.',
    sections: [
      { title: 'Empezá por el perfil que disfrutás', text: 'Si buscás sensación de frescura, explorá notas cítricas como bergamota, limón o pomelo, y perfiles aromáticos o acuáticos. Si preferís algo más cálido, también podés elegirlo: la cantidad que aplicás y el lugar donde lo vas a usar importan tanto como la familia.' },
      { title: 'Pensá en el momento del día', text: 'Un plan al aire libre, una oficina con aire acondicionado y una salida de noche son situaciones distintas. Usá los filtros de ocasión e intensidad del catálogo para comparar. El perfume para todos los días puede ser diferente del que elegís para una cena o una celebración.' },
      { title: 'Probá una aplicación moderada', text: 'Empezá con poca cantidad y observá cómo evoluciona antes de reaplicar. La duración y la proyección varían con la piel, el clima y la aplicación; una estimación de horas no es una garantía para todas las personas. Evitá dejar el frasco al sol o dentro de un vehículo caliente.' },
      { title: 'Elegí un tamaño para probar', text: 'Si todavía no conocés la inspiración, 10 ml permite incorporarla a tu rutina sin elegir un frasco grande. Cuando encontrás tu favorita, podés comparar las presentaciones de 30 y 50 ml. Äura ofrece las tres con la misma concentración del 30%.' },
    ],
    matches: (p: Perfume) => p.category === 'Daily' && /c[ií]tric|acu[aá]tic|arom[aá]tic/i.test(p.family || ''),
  },
  {
    slug: 'perfumes-para-oficina', title: 'Cómo elegir un perfume para la oficina',
    description: 'Elegí una fragancia para trabajar: intensidad, notas, aplicación y formatos para el uso diario.',
    date: '2026-10-04', eyebrow: 'Tu rutina',
    intro: 'Para trabajar, una fragancia puede acompañarte de forma cómoda durante el día. El objetivo es encontrar un aroma que disfrutás y una aplicación adecuada para el espacio que compartís con otras personas.',
    sections: [
      { title: 'Compará ocasión e intensidad', text: 'En el catálogo de Äura podés filtrar por uso diario y revisar la intensidad de cada inspiración. La intensidad describe el perfil del perfume; no significa que necesites aplicar más cantidad. Tomala como una orientación junto con las notas y la familia olfativa.' },
      { title: 'Buscá las notas que te hacen sentir cómodo', text: 'Los perfiles cítricos, florales, aromáticos y amaderados ofrecen opciones diferentes para una rutina de trabajo. No existe una única familia correcta para oficina. Compará las notas de las fichas y elegí según tus preferencias, en lugar de depender únicamente de la marca que inspira el aroma.' },
      { title: 'Adaptá la aplicación al espacio', text: 'Una sala de reuniones pequeña y un trabajo al aire libre no requieren la misma presencia. Empezá con una aplicación moderada y respetá las preferencias de quienes comparten el lugar. Si tu espacio de trabajo restringe el uso de fragancias, seguí esa indicación.' },
      { title: 'Separá la rutina de las ocasiones especiales', text: 'Podés tener una fragancia habitual para trabajar y otra para planes de noche. Si querés probar esa diferencia, el formato de 10 ml permite conocer varias inspiraciones; 30 y 50 ml acompañan mejor una favorita que ya usás con frecuencia. Elegí por el uso real que le vas a dar.' },
    ],
    matches: (p: Perfume) => p.category === 'Daily',
  },
  {
    slug: 'elegir-presentacion', title: 'Perfumes de 10, 30 o 50 ml: qué presentación elegir',
    description: 'Compará los formatos de Äura según tu rutina: probar una inspiración, usarla todos los días o llevar tu favorita.',
    date: '2026-10-04', eyebrow: 'Formatos Äura',
    intro: 'La presentación cambia la cantidad de perfume que llevás, no la concentración. En Äura, los formatos de 10, 30 y 50 ml se elaboran como Extrait de Parfum con 30% de concentración. El tamaño adecuado depende de cuánto conocés la fragancia y de cómo la vas a usar.',
    sections: [
      { title: '10 ml: descubrir una inspiración', text: 'Es una opción para conocer un aroma, alternar varias fragancias o llevar un frasco pequeño. Si todavía no sabés cómo evoluciona una inspiración en tu piel, podés empezar por este formato y elegir después una presentación mayor. No necesitás decidir toda tu colección de una vez.' },
      { title: '30 ml: incorporar una favorita a tu rutina', text: 'El tamaño intermedio acompaña una fragancia que ya conocés o que querés usar con frecuencia. Antes de elegirlo, revisá las notas, la ocasión y la intensidad en su ficha. Si alternás perfumes según tus planes, también podés combinar distintos tamaños en una misma compra.' },
      { title: '50 ml: más cantidad de un aroma que elegís seguido', text: 'Conviene comparar esta opción cuando ya encontraste una favorita. Revisá el precio actual en la ficha y dividilo por los mililitros si querés comparar el costo por cantidad. El mayor tamaño no siempre implica el menor precio por ml; los valores vigentes son los que muestra la tienda.' },
      { title: 'Comprá con el tamaño y precio a la vista', text: 'Cada ficha permite seleccionar 10, 30 o 50 ml antes de agregar al carrito. Revisá la presentación, las unidades y el importe de tu selección. Äura despacha a todo Paraguay; el envío es gratis desde Gs. 300.000 y, para otros importes, se coordina según el destino.' },
    ],
    matches: (p: Perfume) => (p.salesScore || 0) > 0 || p.badge === 'Bestseller',
  },
];
