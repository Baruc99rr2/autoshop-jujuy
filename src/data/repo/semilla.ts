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
 * La cantidad de fotos y de etiquetas está REPARTIDA para poder probar la
 * ficha entera con esta muestra: el Tucson va al máximo útil (cinco fotos,
 * video y cinco etiquetas), la RAM queda en el medio (tres fotos, una
 * etiqueta) y la Swift en el mínimo (una foto, ninguna etiqueta), que es el
 * caso donde la galería tiene que quedarse sin controles y la sección de
 * etiquetas tiene que no existir.
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
    // LA UNIDAD COMPLETA de la muestra: cinco fotos, video y cinco etiquetas.
    // Es con la que se prueba la galería de verdad —el deslizamiento con el
    // dedo, el indicador "2 / 5" y la tira de miniaturas—, y también el
    // barrido a la segunda foto en hover de la card.
    //
    // Hay TRES archivos de imagen en total, así que las cinco fotos los
    // repiten. No es un descuido: lo que se prueba es el comportamiento de la
    // galería con cinco fotos, no que sean cinco tomas distintas. Las unidades
    // reales van a tener sus propias fotos cargadas desde el panel.
    fotos: [
      { id: 'demo-tucson-f1', ...CAR_1, orden: 0 },
      { id: 'demo-tucson-f2', ...CAR_2, orden: 1 },
      { id: 'demo-tucson-f3', ...CAR_3, orden: 2 },
      { id: 'demo-tucson-f4', ...CAR_1, orden: 3 },
      { id: 'demo-tucson-f5', ...CAR_2, orden: 4 },
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
    // CINCO ETIQUETAS, cuatro con foto de fondo y una sin: la grilla de la
    // ficha tiene que verse bien en las dos —foto bajo un velo oscuro y fondo
    // asphalt liso— y con un número impar, que es el que deja un hueco en la
    // última fila.
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
    fotos: [{ id: 'demo-amarok-f1', ...CAR_3, orden: 0 }],
    video: null,
    etiquetas: [],
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
