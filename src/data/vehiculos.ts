import { cuotaMensual } from './financiacion'

/**
 * Las tres unidades del catálogo.
 *
 * **Cada una está nombrada por lo que REALMENTE es.** Las fotos son de autos
 * identificables —un Hyundai Tucson, un Suzuki Swift Sport y una RAM 1500— y
 * etiquetar el Tucson como un Fiat Cronos porque el Cronos se vende más en
 * Jujuy lo detecta cualquiera del rubro en el acto. Un catálogo de tres
 * unidades bien etiquetadas se defiende solo; uno con la marca cambiada quema
 * la credibilidad de toda la demo.
 *
 * Lo inventado es todo lo demás: año, kilómetros, versión, precio y estado.
 *
 * Cuando lleguen las 47 unidades reales, esto es lo único que se reemplaza.
 */

export type EstadoUnidad = 'disponible' | 'reservado' | 'vendido'
export type Condicion = '0km' | 'usado'

export interface Vehiculo {
  /**
   * Identificador estable para la URL de la ficha. Todavía no se navega a
   * ningún lado —el catálogo es una sola página— pero está desde ahora porque
   * cambiar el esquema de URLs después de que Google indexó las fichas cuesta
   * redirecciones. Ver `docs/BACKLOG.md`.
   */
  slug: string
  marca: string
  modelo: string
  version: string
  condicion: Condicion
  anio: number
  /** Kilómetros. En un 0km es 0 y la card muestra "0 km". */
  km: number
  motor: string
  /**
   * Abreviada a propósito. La fila HUD son cuatro columnas dentro de una card
   * de ~530 px: "Automática 6" entra en 130 px solo truncándose a
   * "AUTOMATIC…", que se lee como un error de layout. Una ficha técnica se
   * abrevia; un dato cortado con puntos suspensivos, no.
   */
  caja: string
  /** Pesos argentinos. */
  precio: number
  estado: EstadoUnidad
  imagen: string
  alt: string
  ancho: number
  alto: number
  /**
   * Recorte de detalle para el hover, elegido A MANO mirando cada foto.
   * `zoom` es el factor de escala y `origen` el punto de `transform-origin`
   * al que se acerca. No hay archivos nuevos: es la misma imagen ampliada.
   *
   * Elegir esto al azar deja el recorte en un pedazo de cielo o de asfalto,
   * así que cada uno está anotado con qué se ve.
   */
  detalle: { zoom: number; origen: string; que: string }
}

export const VEHICULOS: Vehiculo[] = [
  {
    slug: 'hyundai-tucson-2021-2-0-gl',
    marca: 'Hyundai',
    modelo: 'Tucson',
    version: '2.0 GL 6AT',
    condicion: 'usado',
    anio: 2021,
    km: 48_500,
    motor: '2.0 nafta',
    caja: 'Aut. 6',
    precio: 38_900_000,
    estado: 'disponible',
    imagen: '/img/vehiculos/car-1.webp',
    alt: 'Hyundai Tucson gris oscuro, vista tres cuartos delantera, al atardecer',
    ancho: 1600,
    alto: 1066,
    // La parrilla en panal con la óptica al lado: es la zona con más dibujo de
    // la foto. Hacia arriba está el cielo lavanda liso y hacia la derecha el
    // galpón de madera, así que el recorte no puede correrse mucho.
    detalle: { zoom: 2.3, origen: '68% 62%', que: 'parrilla y óptica delantera' },
  },
  {
    slug: 'suzuki-swift-sport-2019',
    marca: 'Suzuki',
    modelo: 'Swift Sport',
    version: '1.4 Boosterjet',
    condicion: 'usado',
    anio: 2019,
    km: 62_300,
    motor: '1.4 turbo',
    caja: 'Man. 6',
    precio: 26_500_000,
    estado: 'reservado',
    imagen: '/img/vehiculos/car-2.webp',
    alt: 'Suzuki Swift Sport blanco de tres puertas sobre un camino rural entre pastizales',
    ancho: 1600,
    alto: 1000,
    // La llanta delantera con el pastizal delante. NO se puede recortar sobre
    // el frente: la patente checa original queda justo ahí y ampliada se lee
    // perfecto, que en una foto de catálogo argentino canta enseguida.
    //
    // El primer intento (zoom 2.4, origen 58% 74%) hizo exactamente eso: la
    // captura salió con "9C4 8951" legible en el centro. El origen NO es el
    // punto que se ve en el centro del recorte. Con `transform: scale(s)`, el
    // contenido que queda centrado está en `o + (0.5 - o) / s`, y encima la
    // imagen entra con `object-cover`, que ya recortó un 8,5% de cada lado.
    // Estos valores salen de despejar esa cuenta para la llanta, no de tantear.
    detalle: { zoom: 2.6, origen: '78% 80%', que: 'llanta delantera y pastizal' },
  },
  {
    slug: 'ram-1500-laramie-2024',
    marca: 'RAM',
    modelo: '1500',
    version: 'Laramie 4x4',
    condicion: '0km',
    anio: 2025,
    km: 0,
    motor: '5.7 V8',
    caja: 'Aut. 8',
    precio: 96_400_000,
    estado: 'disponible',
    imagen: '/img/vehiculos/car-3.webp',
    alt: 'RAM 1500 gris, vista tres cuartos delantera, con el mar y un cielo naranja de fondo',
    ancho: 1600,
    alto: 1026,
    // La parrilla con las letras RAM y los dos faros LED encendidos. Es el
    // mejor de los tres recortes: la única de las tres fotos con un elemento
    // gráfico fuerte que sigue leyéndose ampliado.
    detalle: { zoom: 2.2, origen: '70% 56%', que: 'parrilla RAM y faros encendidos' },
  },
]

/**
 * Anticipo y plazo con los que se calcula el "Cuota desde" de cada card.
 *
 * En Argentina la cuota es el dato que la gente mira antes que el precio, así
 * que tiene que estar en la card. Sale de la MISMA fórmula que el simulador de
 * la sección 05: si el catálogo tuviera su propia cuenta, alcanzaría con que
 * alguien cambie la TNA en un solo lado para que el sitio se contradiga a sí
 * mismo en dos secciones distintas.
 */
export const CUOTA_DESDE = { anticipo: 0.5, plazos: 60 }

export function cuotaDesde(precio: number): number {
  return cuotaMensual(precio * (1 - CUOTA_DESDE.anticipo), CUOTA_DESDE.plazos)
}

/** Total de unidades del stock real, para la línea de abajo del riel. */
export const STOCK_TOTAL = 47

export interface FiltroCatalogo {
  id: 'todos' | Condicion
  label: string
}

export const FILTROS: FiltroCatalogo[] = [
  { id: 'todos', label: 'Todos' },
  { id: '0km', label: '0km' },
  { id: 'usado', label: 'Usados' },
]

export const ESTADO_LABEL: Record<EstadoUnidad, string> = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  vendido: 'Vendido',
}

const pesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export const formatearPrecio = (n: number) => pesos.format(n)
export const formatearKm = (n: number) =>
  new Intl.NumberFormat('es-AR').format(n)
