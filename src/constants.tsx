
import { Perfume, WholesaleScale } from './types';

export const WHATSAPP_NUMBER = "595994414986"; 
export const INSTAGRAM_URL = "https://www.instagram.com/aura_fraganciaspy/";
export const FACEBOOK_URL = "https://www.facebook.com/aurafraganciaspy";
export const TIKTOK_URL = "https://www.tiktok.com/@aura_fraganciaspy";
export const CATALOG_URL = "https://drive.google.com/file/d/1W9KvpiZubUwsYwUvXCcGFdFBL1aAy5OM/view?usp=drive_link";
export const BRAND_NAME = "ÄURA";
export const BANNER_IMAGE = "https://www.druni.es/blog/wp-content/uploads/2026/03/03_Perfumes_unisex_PORTADA.jpg";
export const BANNER_MEN = "https://www.radioformula.com.mx/__export/1768509508491/sites/formula/img/2026/01/15/perfume_de_hombre_exitosox_portada.png_2053803405.png";
export const BANNER_WOMEN = "https://www.publimetro.cl/resizer/v2/4FVX5RHIXNFUDFHANGI55FN7NY.png?smart=true&auth=a1838dd1ac5d2278ecef798a4761e2b6980176f645d03e3b056a66b15f05b4db&width=1600&height=900";
export const BANNER_UNISEX = "https://fragarabic.com/cdn/shop/articles/Botellas_de_perfumes_arabes.jpg?v=1724446535&width=2048";

export const SCALES: WholesaleScale[] = [
  { units: "10 – 20 Unidades", discount: "Escala 1" },
  { units: "30 – 50 Unidades", discount: "Escala 2" },
];

export const PRICES = [
  { size: "10 ML", price: 30000, label: "30.000 Gs.", desc: "Ideal para probar o llevar de viaje." },
  { size: "30 ML", price: 70000, label: "70.000 Gs.", desc: "Tamaño estándar.", favorite: true },
  { size: "50 ML", price: 120000, label: "120.000 Gs.", desc: "Mejor valor.", bestValue: true },
];

export const SHIPPING_ZONES = [
  { name: "ASUNCIÓN", price: 20000 },
  { name: "GRAN ASUNCIÓN", price: 25000 },
  { name: "INTERIOR DEL PAÍS (ENCOMIENDA)", price: 35000 },
];

export const LEGAL_TEXTS = {
  inspirations: {
    title: "Nuestras Inspiraciones",
    content: `En Äura, nos especializamos en la creación de fragancias de alta gama desarrolladas con esencias premium importadas. 
    
    Es fundamental aclarar que nuestros productos son "Inspiraciones Olfativas". Esto significa que:
    
    1. No son copias ni falsificaciones: Son formulaciones propias que buscan capturar la esencia y el perfil aromático de las fragancias más icónicas del mundo.
    2. Referencia Olfativa: Los nombres de marcas, marcas registradas y perfumes de terceros mencionados en nuestro catálogo se utilizan exclusivamente como "Referencia Olfativa". Su única finalidad es ayudar a nuestros clientes a identificar el estilo, la familia y las notas que prefieren.
    3. Independencia de Marca: Äura no tiene ninguna vinculación comercial, patrocinio ni asociación con los propietarios de las marcas originales mencionadas. Cada marca es propiedad de su respectivo titular.
    
    Nuestra promesa es ofrecerte una experiencia de lujo accesible con una concentración del 30% (Extrait de Parfum), garantizando una fijación y estela excepcionales.`
  },
  terms: {
    title: "Términos y Condiciones",
    content: `Al utilizar este sitio web y realizar compras a través de nuestros canales oficiales, aceptas los siguientes términos:
    
    - Uso del Sitio: El contenido de esta web es para información general y catálogo de productos. Queda prohibida la reproducción total o parcial del diseño o marca Äura sin autorización.
    - Pedidos: Los pedidos se gestionan principalmente vía WhatsApp para brindar un asesoramiento personalizado. El stock está sujeto a disponibilidad inmediata.
    - Precios: Los precios expresados en Guaraníes (Gs.) pueden ser modificados sin previo aviso, respetándose siempre el precio pactado al momento de confirmar el pedido por WhatsApp.
    - Responsabilidad: Äura no se hace responsable por reacciones alérgicas. Recomendamos realizar una prueba de sensibilidad en una pequeña zona de la piel antes de su uso regular.
    - Menores de edad: Las compras deben ser realizadas por personas mayores de 18 años o bajo supervisión de un tutor.`
  },
  shipping: {
    title: "Envíos y Devoluciones",
    content: `Políticas de Envío (Paraguay):
    - Cobertura: Realizamos envíos a todo el territorio nacional paraguayo.
    - Plazos: En Asunción y Gran Asunción, las entregas se realizan habitualmente en un plazo de 24 a 48 horas hábiles. Para el interior del país, los plazos dependen de la transportadora elegida (generalmente 2 a 5 días hábiles).
    - Costos: El costo de envío varía según la zona y se informará detalladamente al cerrar el pedido vía WhatsApp.
    
    Políticas de Devoluciones y Cambios:
    - Garantía de Calidad: Revisamos individualmente cada frasco antes de su despacho.
    - Cambios: Debido a la naturaleza del producto (cosmética/perfumería), solo se aceptarán cambios o devoluciones en caso de defectos de fábrica demostrables en el atomizador o roturas durante el transporte (reportadas en el momento de la recepción).
    - Higiene: Por razones de higiene y salud pública, no se aceptan devoluciones de perfumes cuyo sello de seguridad haya sido removido o que hayan sido utilizados, excepto por la falla técnica mencionada.`
  }
};

// Para agregar tus propias imágenes, simplemente coloca el link de la imagen en el campo "imageUrl" de cada perfume.
// Ejemplo: imageUrl: "https://tu-link-de-imagen.jpg"
export const PERFUMES: Perfume[] = [
  // CABALLEROS (CC)
  { code: "CC157", name: "Valentino Uomo Born In Roma Intense", inspiration: "Valentino", family: "ORIENTAL AVAINILLADO", notes: ["VAINILLA", "LAVANDA", "VETIVER"], intensity: 5, duration: "12h+", gender: "Man", category: "Night", badge: "New", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219357/CC157_zrgxcz.png" },
  { code: "CC180", name: "The Most Wanted Parfum", inspiration: "Azzaro", family: "ORIENTAL ESPACIADO", notes: ["CARDAMOMO", "TÓFE", "AMBARWOOD"], intensity: 5, duration: "12h+", gender: "Man", category: "Night", badge: "Bestseller", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219357/CC180_fjtxba.png" },
  { code: "CC136", name: "INVICTUS VICTORY ELIXIR", inspiration: "Paco Rabanne", family: "ORIENTAL AMADERADA", notes: ["LAVANDA", "CARDAMOMO", "PIMIENTA NEGRA"], intensity: 5, duration: "12h+", gender: "Man", category: "Night", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219350/CC136_io1xb1.png" },
  { code: "CC034", name: "CREED AVENTUS", inspiration: "Creed", family: "AFRUTADO DULCE CUERO AMADERADO", notes: ["PIÑA", "GROSELLAS NEGRAS", "BERGAMOTA", "MANZANA"], intensity: 4, duration: "10-12h", gender: "Man", category: "Casual", badge: "Bestseller", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219340/CC034_mmpsoj.png" },
  { code: "CC047", name: "EROS VERSACE", inspiration: "Versace", family: "AVAINILLADO, AROMATICO, VERDE", notes: ["MENTA", "HABA TONKA", "VAINILLA"], intensity: 5, duration: "12h+", gender: "Man", category: "Night", badge: "Bestseller", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219339/CC047_eqm9o5.png" },
  { code: "CC137", name: "TOY BOY MOSCHINO", inspiration: "Moschino", family: "AMADERADA ESPECIADA", notes: ["ROSA", "PIMIENTA", "PERA"], intensity: 4, duration: "10h", gender: "Man", category: "Casual", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219367/CC137_jmup2o.png" },
  { code: "CC139", name: "Le Beau Jean Paul Gaultier", inspiration: "JPG", family: "AMADERADA AROMATICA", notes: ["LIMÓN", "ABEDUL", "PIÑA"], intensity: 4, duration: "10h", gender: "Man", category: "Daily", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219353/CC139_kai8wr.png" },
  { code: "CC148", name: "LE BEAU PARADISE GARDEN JPG", inspiration: "JPG", family: "VERDE, COCO, DULCE, ACUÁTICA", notes: ["COCO", "NOTAS VERDE", "NOTAS ACUOSAS"], intensity: 4, duration: "10h", gender: "Man", category: "Daily", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219353/CC148_vv1ysy.png" },
  { code: "CC024", name: "BLEU CHANEL", inspiration: "Chanel", family: "CITRICOS, FRESCO ESPECIADO, BALSAMICO", notes: ["TORONJA", "INSIENSO", "JENGIBRE"], intensity: 4, duration: "10-12h", gender: "Man", category: "Daily", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219340/CC024_zqos95.png" },
  { code: "CC016", name: "AQCUA DI GIO PROFONDO GIRGIO ARMANI", inspiration: "Giorgio Armani", family: "FRESCO, AMADERADO, CITRICO", notes: ["BERGAMOTA", "ROMERO", "PACHULÍ"], intensity: 4, duration: "10h", gender: "Man", category: "Daily", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219340/CC016_mdwnkl.png" },
  { code: "CC074", name: "INVICTUS INTENSE PACO RABANNE", inspiration: "Paco Rabanne", family: "AMBARADO, FRESCO ESPECIADO, WHISKY", notes: ["WHISKY", "AMBAR", "FLOR DE AZAHAR DEL NARANJO"], intensity: 5, duration: "12h+", gender: "Man", category: "Night", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219345/CC074_a4i3wr.png" },
  { code: "CC073", name: "INVICTUS MEN PACO RABANNE", inspiration: "Paco Rabanne", family: "CITRICOS, MARINO, AROMATICO", notes: ["NOTAS MARINAS", "TORONJA", "LAUREL"], intensity: 4, duration: "10h", gender: "Man", category: "Daily", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775221588/CC073_feqjmx.png" },
  { code: "CC012", name: "ALLURE SPORT MEN CHANEL", inspiration: "Chanel", family: "CITRICOS, AROMATICO, ALDEHIDICO", notes: ["NARANJA", "NOTAS MARINAS", "ALDEHIDICO"], intensity: 4, duration: "10h", gender: "Man", category: "Daily", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219343/CC012_odzsut.png" },
  { code: "CC026", name: "BAD BOY CH", inspiration: "Carolina Herrera", family: "ORIENTAL ESPECIADA", notes: ["PIMIENTA BLANCA", "BERGAMOTA", "CEDRO"], intensity: 4, duration: "10h", gender: "Man", category: "Night", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219336/CC026_fag0se.png" },
  { code: "CC251", name: "MYSLF Eau de Parfum", inspiration: "YSL", family: "CITRICOS, MARINO, AROMATICO", notes: ["BERGAMOTA", "FLOR DEL NARANJO"], intensity: 4, duration: "10h", gender: "Man", category: "Daily", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219365/CC251_a0oolf.png" },
  { code: "CC122", name: "Ultra Male Jean Paul Gaultier", inspiration: "JPG", family: "AVAINILLADO, DULCE, AFRUTADOS", notes: ["PERA", "VAINA DE VAINILLA", "CANELA"], intensity: 5, duration: "12h+", gender: "Man", category: "Night", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219349/CC122_ekvlhg.png" },
  { code: "CC144", name: "Le Male Elixir Jean Paul Gaultier", inspiration: "JPG", family: "Oriental Fougère", notes: ["LAVANDA", "MENTA", "VAINILLA", "BENJUÍ"], intensity: 5, duration: "12h+", gender: "Man", category: "Night", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775222749/CC144_mzc5ly.png" },
  { code: "CC128", name: "Invictus Platinum Rabanne", inspiration: "Paco Rabanne", family: "FRESCO, AMADERADO, CITRICO", notes: ["ABSENTA", "TORONJA", "MENTA", "LAVANDA", "CIPRÉS", "PACHULÍ"], intensity: 5, duration: "12h+", gender: "Man", category: "Daily", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219351/CC128_gf30fs.png" },
  { code: "CC022", name: "Bvlgari Man In Black Parfum", inspiration: "Bvlgari", family: "ORIENTAL AMADERADA", notes: ["CUERO", "RON", "MADERA DE OUD"], intensity: 4, duration: "10h", gender: "Man", category: "Night", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219332/CC022_ig8jw6.png" },
  { code: "CC059", name: "Gucci Guilty Black Pour Homme", inspiration: "Gucci", family: "AROMATICO, FLOR BLANCO, VERDE", notes: ["NOTAS VERDES", "FLOR DE AZHAAR", "LAVANDA"], intensity: 4, duration: "10h", gender: "Man", category: "Casual", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775224286/CC059_am0wct.png" },
  { code: "CC062", name: "Clinique Happy", inspiration: "Clinique", family: "CITRICOS, VERDES, AROMATICOS", notes: ["MANDARINA", "LIMON", "NOTAS MARINAS"], intensity: 3, duration: "8h", gender: "Man", category: "Daily", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219360/CC062_xj7an5.png" },
  { code: "CC101", name: "PARIS HILTON MEN", inspiration: "Paris Hilton", family: "TROPICAL, AFRUTADO, DULCE", notes: ["MANGO", "ALMIZCLE", "SALVIA"], intensity: 3, duration: "8h", gender: "Man", category: "Daily", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219346/CC101_mqvff7.png" },

  // DAMAS (DD)
  { code: "DD192", name: "LA BOMBA CAROLINA HERRERA", inspiration: "Carolina Herrera", family: "ORIENTAL FLORAL", notes: ["PITAHAYA", "PEONÍA ROJA", "FRANGIPANI", "VAINILLA", "PACHULÍ"], intensity: 4, duration: "10h", gender: "Woman", category: "Night", badge: "Bestseller", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219379/DD192_ahw119.png" },
  { code: "DD197", name: "MISS DIOR (2021)", inspiration: "Dior", family: "ORIENTAL FLORAL", notes: ["IRIS", "PEONÍA", "LIRIO DE LOS VALLES"], intensity: 4, duration: "10h", gender: "Woman", category: "Casual", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219393/DD197_ovm1gi.png" },
  { code: "DD196", name: "NINA RICCI (2006) CLÁSICO", inspiration: "Nina Ricci", family: "FLORAL FRUTAL", notes: ["LIMA", "LIMÓN VERDE", "MANZANA", "PEONÍA", "DATURA"], intensity: 3, duration: "8h", gender: "Woman", category: "Daily", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775224287/DD196_dvjzg3.png" },
  { code: "DD057", name: "SCANDAL WOMAN JEAN PAUL GAULTIER", inspiration: "JPG", family: "AMIELADO DULCE", notes: ["MIEL", "PACHULÍ", "CERA DE ABEJA", "CARAMELO"], intensity: 5, duration: "12h+", gender: "Woman", category: "Night", badge: "Bestseller", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219360/DD057_rpvaho.png" },
  { code: "DD081", name: "J' ADORE WOMAN CHRISTIAN DIOR", inspiration: "Dior", family: "FLORALES, AFRUTADOS, FLORAL BLANCO", notes: ["JAZMIN", "PERA", "LIMON"], intensity: 4, duration: "10h", gender: "Woman", category: "Casual", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219364/DD081_krki7i.png" },
  { code: "DD101", name: "MY WAY GIORGIO ARMANI", inspiration: "Giorgio Armani", family: "FLORAL BLANCO, CITRICO", notes: ["FLOR DE AZAHAR", "BERGAMOTA", "NARDO"], intensity: 4, duration: "10h", gender: "Woman", category: "Casual", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219380/DD101_v7dzxn.png" },
  { code: "DD159", name: "CLOUD BY ARIANA GRANDE", inspiration: "Ariana Grande", family: "FLORAL FRUTAL", notes: ["CREMA BATIDA", "PRALINE", "COCO"], intensity: 4, duration: "10h", gender: "Woman", category: "Casual", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219375/DD159_pcymra.png" },
  { code: "DD161", name: "GOOD GIRL BLUSH CH", inspiration: "Carolina Herrera", family: "CHIPRE FLORAL", notes: ["VAINILLA", "PEONÍA", "BERGAMOTA"], intensity: 4, duration: "10h", gender: "Woman", category: "Night", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219566/DD193_kzc359.png" },
  { code: "DD094", name: "LA VIDA ES BELLA LANCOME", inspiration: "Lancome", family: "DULCE, AVAINILLADO, AFRUTADO", notes: ["VAINILLA", "PACHULI", "GROSELLAS NEGRAS"], intensity: 4, duration: "10h", gender: "Woman", category: "Casual", badge: "Bestseller", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219368/DD094_vjzgtf.png" },
  { code: "DD199", name: "BRIGHT CRYSTAL DE VERSACE", inspiration: "Versace", family: "FLORAL FRUTAL", notes: ["YUZU", "FRUTAS ROJAS", "GRANADA", "CARAMELO"], intensity: 4, duration: "10h", gender: "Woman", category: "Casual", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219382/DD199_jqomni.png" },
  { code: "DD147", name: "DELINA EXCLUSIF", inspiration: "Parfums de Marly", family: "ORIENTAL", notes: ["LICHI", "PERA", "BERGAMOTA", "TORONJA", "PIMIENTA ROSA"], intensity: 5, duration: "12h+", gender: "Woman", category: "Night", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219373/DD147_ejt8md.png" },
  { code: "DD096", name: "LIBRE YVES SAINT LAURENT", inspiration: "YSL", family: "FLORAL BLANCO, CITRICO, LAVANDER", notes: ["LAVANDA", "MANDARINA", "VAINILLA"], intensity: 4, duration: "10h", gender: "Woman", category: "Casual", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219367/DD096_ymvwyq.png" },
  { code: "DD173", name: "WIND FLOWERS CREED", inspiration: "Creed", family: "FLORAL BLANCO, DULCE, ATALCADO", notes: ["JAZMIN", "ALMIZCLE", "FLOR DE AZAHAR", "PRALINÉ"], intensity: 4, duration: "10h", gender: "Woman", category: "Casual", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775225262/DD173_zs9txd.png" },
  { code: "DD178", name: "VALENTINO DONNA BORN IN ROMA GREEN STRAVAGANZ", inspiration: "Valentino", family: "ÁMBAR FLORAL AMADERADA", notes: ["TÉ LAPSANG SOUCHONG", "JAZMÍN", "VAINILLA"], intensity: 4, duration: "10h", gender: "Woman", category: "Casual", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219378/DD178_uozhv0.png" },
  { code: "DD193", name: "Irresistible Givenchy", inspiration: "Givenchy", family: "Floral Frutal", notes: ["PERA", "ALMIZCLE AMBRETA", "ROSA", "IRIS"], intensity: 4, duration: "10h", gender: "Woman", category: "Casual", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219566/DD193_kzc359.png" },
  { code: "DD145", name: "FAME PACO RABANNE", inspiration: "Paco Rabanne", family: "TROPICAL, AFRUTADO, AVAINILLADO", notes: ["MANGO", "JAZMIN", "VAINILLA"], intensity: 4, duration: "10h", gender: "Woman", category: "Casual", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219373/DD145_rg1ian.png" },
  { code: "DD110", name: "OLYMPEA PACO RABANNE", inspiration: "Paco Rabanne", family: "AVANILLADO, SALADO, AMADERADO", notes: ["VAINILLA", "SAL", "JAZMIN DE AGUA"], intensity: 4, duration: "10h", gender: "Woman", category: "Casual", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219384/DD110_itfju7.png" },
  { code: "DD080", name: "JPG WOMAN CLASSIQUE", inspiration: "JPG", family: "ORIENTAL FLORAL", notes: ["JENGIBRE", "FLOR DE AZAHAR", "ÁMBAR"], intensity: 4, duration: "10h", gender: "Woman", category: "Casual", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219376/DD080_uhoerr.png" },
  { code: "DD097", name: "LADY MILLON GOLD", inspiration: "Paco Rabanne", family: "FLORAL FRUTAL", notes: ["FRAMBUESA", "NEROLI", "LIMÓN DE AMALFI"], intensity: 4, duration: "10h", gender: "Woman", category: "Casual", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219368/DD097_againj.png" },
  { code: "DD202", name: "BURBERRY HER", inspiration: "Burberry", family: "FLORAL FRUTAL", notes: ["FRESA", "FRAMBUESA", "ZARZAMORA"], intensity: 4, duration: "10h", gender: "Woman", category: "Daily", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219387/DD202_cxbbme.png" },
  { code: "DD200", name: "Yum Yum Armaf", inspiration: "Armaf", family: "FLORAL FRUTAL", notes: ["BAYAS SILVESTRES", "CEREZA", "NARANJA", "BERGAMOTA", "VAINILLA"], intensity: 4, duration: "10h", gender: "Woman", category: "Casual", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219384/DD200_gzen4a.png" },
  { code: "DD015", name: "Armani Code for Women", inspiration: "Giorgio Armani", family: "FLORAL ACUÁTICA", notes: ["NARANJA AMARGA", "JENGIBRE", "JAZMIN"], intensity: 4, duration: "10h", gender: "Woman", category: "Daily", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219362/DD015_hvnhxf.png" },

  // UNISEX (UU)
  { code: "UU002", name: "SANTAL 33 LE LABO", inspiration: "Le Labo", family: "Amaderada Aromática", notes: ["SÁNDALO", "CUERO", "PAPIRO", "CEDRO", "CARDAMOMO", "VIOLETA", "IRIS", "ÁMBAR"], intensity: 4, duration: "10h", gender: "Unisex", category: "Casual", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775223256/UU002_yqrnur.png" },
  { code: "UU013", name: "LAYTON DE MARLY", inspiration: "Parfums de Marly", family: "ESPECIADO AMADERADO AVAINILLADO", notes: ["VAINILLA", "MANZANA VERDE", "CARDAMOMO"], intensity: 5, duration: "12h+", gender: "Unisex", category: "Night", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219387/UU013_ywjtrj.png" },
  { code: "UU019", name: "ERBA PURA XERJOFF", inspiration: "Xerjoff", family: "AFRUTADO CITRICO DULCE", notes: ["FRUTAS", "ALMIZCLE", "VAINILLA"], intensity: 5, duration: "12h+", gender: "Unisex", category: "Night", badge: "Bestseller", imageUrl: "https://res.cloudinary.com/drtvcb5ei/image/upload/v1775219386/UU019_kgbn89.png" },
];
