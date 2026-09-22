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
    fotos: [{ id: 'demo-tucson-f1', ...CAR_1, orden: 0 }],
    video: null,
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
        fotoFondoId: null,
        orden: 1,
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
    fotos: [{ id: 'demo-ram-f1', ...CAR_3, orden: 0 }],
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
