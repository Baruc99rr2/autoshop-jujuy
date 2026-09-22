import type { Vehiculo } from '../../types/vehiculo'

/**
 * Datos de prueba.
 *
 * **Todos los ids arrancan con `demo-`.** Es la marca que los hace fáciles de
 * encontrar y de borrar el día que la dueña cargue el stock real: `esDemo()`
 * los reconoce y el panel va a poder ofrecer "borrar los de muestra" sin que
 * nadie tenga que acordarse de cuáles eran.
 *
 * Las fotos son de autos identificables —un Hyundai Tucson, un Suzuki Swift
 * Sport y una RAM 1500— y por eso las unidades se llaman por lo que
 * REALMENTE son. Etiquetar el Tucson como otra cosa lo detecta cualquiera del
 * rubro en el acto. Lo inventado es el resto: año, kilómetros, precio y
 * estado.
 *
 * Las tres últimas REUSAN una foto de otra unidad, a propósito: sirve para ver
 * cómo se comporta una grilla con portadas repetidas y con unidades sin foto
 * propia, que es exactamente lo que va a pasar mientras se carga el stock.
 *
 * La cantidad de fotos y de etiquetas está REPARTIDA para cubrir los tres
 * tamaños con los que hay que mirar la ficha —uno, media docena y el máximo—
 * sin tener que cargar nada a mano: el Tucson va al tope (DIEZ fotos, video y
 * DOCE etiquetas, que es el caso sin tope), el Amarok queda en el medio (SEIS
 * y SEIS), la RAM en tres fotos con una etiqueta, y la Swift en el mínimo (una
 * foto, ninguna etiqueta), que es el caso donde la galería tiene que quedarse
 * sin controles y la sección de etiquetas tiene que no existir.
 *
 * La muestra incluye a propósito los tres casos que suelen romper una vista:
 * un BORRADOR (`publicado: false`), uno VENDIDO y uno SIN PRECIO (`null`).
 */

const CAR_1 = { url: '/img/vehiculos/car-1.webp', ancho: 1600, alto: 1066 }
const CAR_2 = { url: '/img/vehiculos/car-2.webp', ancho: 1600, alto: 1000 }
const CAR_3 = { url: '/img/vehiculos/car-3.webp', ancho: 1600, alto: 1026 }

/** Prefijo de los ids de muestra. */
export const PREFIJO_DEMO = 'demo-'

export function esDemo(id: string): boolean {
  return id.startsWith(PREFIJO_DEMO)
}

export const SEMILLA: Vehiculo[] = [
  {
    id: 'demo-tucson',
    slug: 'hyundai-tucson-2021-2-0-gl',
    titulo: 'Hyundai Tucson 2.0 GL 6AT',
    descripcion:
      'Único dueño, service oficial al día y cubiertas nuevas. Siempre en garaje. Se acepta usado como parte de pago.',
    condicion: 'usado',
    precio: 38_900_000,
    anio: 2021,
    km: 48_500,
    estado: 'disponible',
    publicado: true,
    destacado: true,
    // LA UNIDAD COMPLETA de la muestra: DIEZ fotos (el tope), video y DOCE
    // etiquetas. Es con la que se prueba la galería de verdad —el
    // deslizamiento con el dedo, el indicador "3 / 10", la tira de miniaturas
    // y el visor a pantalla completa— y también la grilla de etiquetas cuando
    // la dueña carga más de las que entran en dos filas.
    //
    // Hay TRES archivos de imagen en total, así que las diez fotos los repiten.
    // No es un descuido: lo que se prueba es el comportamiento de la galería
    // con diez fotos, no que sean diez tomas distintas. Las unidades reales van
    // a tener sus propias fotos cargadas desde el panel.
    fotos: [
      { id: 'demo-tucson-f1', ...CAR_1, orden: 0 },
      { id: 'demo-tucson-f2', ...CAR_2, orden: 1 },
      { id: 'demo-tucson-f3', ...CAR_3, orden: 2 },
      { id: 'demo-tucson-f4', ...CAR_1, orden: 3 },
      { id: 'demo-tucson-f5', ...CAR_2, orden: 4 },
      { id: 'demo-tucson-f6', ...CAR_3, orden: 5 },
      { id: 'demo-tucson-f7', ...CAR_1, orden: 6 },
      { id: 'demo-tucson-f8', ...CAR_2, orden: 7 },
      { id: 'demo-tucson-f9', ...CAR_3, orden: 8 },
      { id: 'demo-tucson-f10', ...CAR_1, orden: 9 },
    ],
    // VIDEO DE MUESTRA: es el clip del hero reusado, no una filmación de este
    // auto. Está solo para que el bloque de video de la ficha —póster, botón
    // de play y `preload="none"`— se pueda ver funcionando antes de que la
    // dueña suba uno. Se borra con el resto de los datos `demo-`.
    video: {
      url: '/video/hero-desktop.mp4',
      posterUrl: '/img/vehiculos/car-1.webp',
      pesoBytes: 1_424_784,
    },
    // DOCE ETIQUETAS, con y sin foto de fondo: la grilla de la ficha tiene que
    // verse bien en las dos —foto bajo un velo oscuro y fondo asphalt liso— y
    // con una cantidad que llena seis filas en mobile y cuatro en desktop.
    // Doce no es un tope: las etiquetas no lo tienen. Es la cantidad con la
    // que se mira que la grilla siga siendo legible si la dueña se entusiasma.
    etiquetas: [
      {
        id: 'demo-tucson-e1',
        titulo: 'Service al día',
        texto: 'Con historial completo en concesionario oficial y libreta sellada.',
        fotoFondoId: 'demo-tucson-f1',
        orden: 0,
      },
      {
        id: 'demo-tucson-e2',
        titulo: 'Un solo dueño',
        texto: 'Comprada 0km en Jujuy y usada siempre en ciudad.',
        fotoFondoId: 'demo-tucson-f2',
        orden: 1,
      },
      {
        id: 'demo-tucson-e3',
        titulo: 'Cubiertas nuevas',
        texto: 'Las cuatro cambiadas en julio, con la factura del gomería.',
        fotoFondoId: 'demo-tucson-f3',
        orden: 2,
      },
      {
        id: 'demo-tucson-e4',
        titulo: 'Siempre en garaje',
        texto: 'Nunca durmió en la calle. La pintura está sana y sin retoques.',
        fotoFondoId: 'demo-tucson-f4',
        orden: 3,
      },
      {
        id: 'demo-tucson-e5',
        titulo: 'Tomamos tu usado',
        texto: 'Lo tasamos en el salón y va como parte de pago.',
        fotoFondoId: null,
        orden: 4,
      },
      {
        id: 'demo-tucson-e6',
        titulo: 'Baúl amplio',
        texto: 'Entra el changuito y las valijas de un viaje largo sin pelear.',
        fotoFondoId: 'demo-tucson-f5',
        orden: 5,
      },
      {
        id: 'demo-tucson-e7',
        titulo: 'Caja automática',
        texto: 'Seis marchas, probada en la cuesta de Volcán sin un tirón.',
        fotoFondoId: 'demo-tucson-f6',
        orden: 6,
      },
      {
        id: 'demo-tucson-e8',
        titulo: 'Tapizados sanos',
        texto: 'Sin roturas ni quemaduras. Nunca se fumó adentro.',
        fotoFondoId: null,
        orden: 7,
      },
      {
        id: 'demo-tucson-e9',
        titulo: 'Patente al día',
        texto: 'Sin deuda ni infracciones. La transferencia sale en el acto.',
        fotoFondoId: 'demo-tucson-f8',
        orden: 8,
      },
      {
        id: 'demo-tucson-e10',
        titulo: 'Aire funcionando',
        texto: 'Cargado en septiembre. Enfría desde la primera cuadra.',
        fotoFondoId: null,
        orden: 9,
      },
      {
        id: 'demo-tucson-e11',
        titulo: 'Rueda de auxilio',
        texto: 'Sin usar, con crique y llave de rueda completos.',
        fotoFondoId: 'demo-tucson-f10',
        orden: 10,
      },
      {
        id: 'demo-tucson-e12',
        titulo: 'Lo probás cuando quieras',
        texto: 'Vení al salón y manejalo. Te acompañamos y no hay apuro.',
        fotoFondoId: null,
        orden: 11,
      },
    ],
    creadoEn: '2026-08-04T13:00:00.000Z',
    actualizadoEn: '2026-09-01T13:00:00.000Z',
  },
  {
    id: 'demo-swift',
    slug: 'suzuki-swift-sport-2019',
    titulo: 'Suzuki Swift Sport 1.4 Boosterjet',
    descripcion:
      'Tres puertas, caja manual de seis. Reservado con seña hasta fin de mes: si se cae la operación volvemos a publicarlo.',
    condicion: 'usado',
    precio: 26_500_000,
    anio: 2019,
    km: 62_300,
    estado: 'reservado',
    publicado: true,
    destacado: true,
    // UNA SOLA FOTO Y NINGUNA ETIQUETA, a propósito: es el extremo pobre de la
    // muestra y el que más se rompe. La galería tiene que quedarse sin
    // controles ni indicador, y la sección de etiquetas tiene que desaparecer
    // entera en vez de dejar un titular sobre el vacío.
    fotos: [{ id: 'demo-swift-f1', ...CAR_2, orden: 0 }],
    video: null,
    etiquetas: [],
    creadoEn: '2026-08-11T13:00:00.000Z',
    actualizadoEn: '2026-09-05T13:00:00.000Z',
  },
  {
    id: 'demo-ram',
    slug: 'ram-1500-laramie-2025',
    titulo: 'RAM 1500 Laramie 4x4',
    descripcion:
      'Cero kilómetro, entrega inmediata. Motor 5.7 V8 y caja automática de ocho marchas. Patentamiento a cargo nuestro.',
    condicion: '0km',
    precio: 96_400_000,
    anio: 2025,
    km: 0,
    estado: 'disponible',
    publicado: true,
    destacado: true,
    // TRES FOTOS: el caso intermedio. Sirve para ver el barrido a la segunda
    // foto al lado de una card que tiene una sola (la Swift), y en la ficha,
    // una tira de miniaturas corta.
    fotos: [
      { id: 'demo-ram-f1', ...CAR_3, orden: 0 },
      { id: 'demo-ram-f2', ...CAR_1, orden: 1 },
      { id: 'demo-ram-f3', ...CAR_2, orden: 2 },
    ],
    video: null,
    etiquetas: [
      {
        id: 'demo-ram-e1',
        titulo: 'Entrega inmediata',
        texto: 'Está en el salón. Se entrega patentada en diez días hábiles.',
        fotoFondoId: 'demo-ram-f1',
        orden: 0,
      },
    ],
    creadoEn: '2026-08-20T13:00:00.000Z',
    actualizadoEn: '2026-09-12T13:00:00.000Z',
  },

  // ── Las que reusan foto ───────────────────────────────────────────────
  {
    id: 'demo-amarok',
    slug: 'volkswagen-amarok-comfortline-4x4',
    titulo: 'Volkswagen Amarok Comfortline 4x4',
    descripcion:
      'Pick-up de trabajo, con cobertor de caja y barras. El precio depende de la forma de pago: escribinos y lo cerramos.',
    condicion: 'usado',
    // SIN PRECIO: la card y la ficha tienen que decir "Consultar precio".
    precio: null,
    anio: 2020,
    km: 89_000,
    estado: 'disponible',
    publicado: true,
    destacado: false,
    // SEIS FOTOS Y SEIS ETIQUETAS: el caso de media docena. Llena exactamente
    // dos filas de la grilla de etiquetas en desktop y tres en mobile, y deja
    // la tira de miniaturas de la galería llena pero sin desbordar.
    fotos: [
      { id: 'demo-amarok-f1', ...CAR_3, orden: 0 },
      { id: 'demo-amarok-f2', ...CAR_1, orden: 1 },
      { id: 'demo-amarok-f3', ...CAR_2, orden: 2 },
      { id: 'demo-amarok-f4', ...CAR_3, orden: 3 },
      { id: 'demo-amarok-f5', ...CAR_1, orden: 4 },
      { id: 'demo-amarok-f6', ...CAR_2, orden: 5 },
    ],
    video: null,
    etiquetas: [
      {
        id: 'demo-amarok-e1',
        titulo: 'Cobertor de caja',
        texto: 'Rígido y con llave. La caja quedó sin marcas de carga.',
        fotoFondoId: 'demo-amarok-f1',
        orden: 0,
      },
      {
        id: 'demo-amarok-e2',
        titulo: 'Barras de techo',
        texto: 'Originales, para bajar con la moto o con los bidones.',
        fotoFondoId: 'demo-amarok-f2',
        orden: 1,
      },
      {
        id: 'demo-amarok-e3',
        titulo: '4x4 con reductora',
        texto: 'Usada en ripio, nunca en barro pesado ni con acoplado.',
        fotoFondoId: 'demo-amarok-f3',
        orden: 2,
      },
      {
        id: 'demo-amarok-e4',
        titulo: 'Cubiertas al 70%',
        texto: 'Las cuatro iguales, con dibujo parejo en los dos ejes.',
        fotoFondoId: null,
        orden: 3,
      },
      {
        id: 'demo-amarok-e5',
        titulo: 'Service de 90 mil',
        texto: 'Hecho a los 89.000 km, con filtros y correa cambiados.',
        fotoFondoId: 'demo-amarok-f5',
        orden: 4,
      },
      {
        id: 'demo-amarok-e6',
        titulo: 'El precio lo charlamos',
        texto: 'Cambia según la forma de pago. Escribinos y lo cerramos.',
        fotoFondoId: null,
        orden: 5,
      },
    ],
    creadoEn: '2026-08-26T13:00:00.000Z',
    actualizadoEn: '2026-09-08T13:00:00.000Z',
  },
  {
    id: 'demo-corolla',
    slug: 'toyota-corolla-xei-cvt-2018',
    titulo: 'Toyota Corolla XEI CVT',
    descripcion:
      'Vendido en septiembre. Queda publicado un tiempo más para que se vea el movimiento del salón.',
    condicion: 'usado',
    precio: 24_000_000,
    anio: 2018,
    km: 104_200,
    // VENDIDO: chip en --color-flag.
    estado: 'vendido',
    publicado: true,
    destacado: false,
    fotos: [{ id: 'demo-corolla-f1', ...CAR_1, orden: 0 }],
    video: null,
    etiquetas: [],
    creadoEn: '2026-07-15T13:00:00.000Z',
    actualizadoEn: '2026-09-15T13:00:00.000Z',
  },
  {
    id: 'demo-tracker',
    slug: 'chevrolet-tracker-premier-2025',
    titulo: 'Chevrolet Tracker Premier',
    descripcion:
      'Borrador: faltan las fotos propias y confirmar el precio de lista con la fábrica.',
    condicion: '0km',
    precio: 41_500_000,
    anio: 2025,
    km: 0,
    estado: 'disponible',
    // BORRADOR: existe en el panel y NO sale en el sitio.
    publicado: false,
    destacado: false,
    fotos: [{ id: 'demo-tracker-f1', ...CAR_2, orden: 0 }],
    video: null,
    etiquetas: [],
    creadoEn: '2026-09-18T13:00:00.000Z',
    actualizadoEn: '2026-09-18T13:00:00.000Z',
  },
]
