import { WHATSAPP_URL } from './contacto'

/**
 * Índice de secciones del home. Es la fuente única del orden, los ids de ancla
 * y la numeración del riel: si se agrega o se reordena una sección, se toca
 * solo acá.
 */
export interface Seccion {
  /** Índice de dos dígitos que muestran el riel y el eyebrow. */
  indice: string
  /** id del <section>, usado como ancla de scroll. */
  id: string
  /** Nombre corto, en mayúsculas, para el eyebrow. */
  eyebrow: string
  /** Titular de la sección. */
  titulo: string
  /**
   * Tono dominante de la sección, para el RIEL y la MALLA. Solo lo declaran
   * las secciones que llenan el viewport: el riel va de arriba abajo, así que
   * invertirlo por una franja que ocupa el medio de la pantalla dejaría mal la
   * parte de arriba y la de abajo.
   */
  tono?: 'claro'
  /**
   * Color del fondo de la sección, para el HEADER. Es otra cosa que `tono`: el
   * header ocupa 70px arriba de todo, así que lo que importa no es qué sección
   * domina la pantalla sino cuál le pasa por debajo. La franja de contadores
   * declara `fondo` y no declara `tono` justamente por eso.
   */
  fondo?: 'claro' | 'ambar'
}

export const SECCIONES: Seccion[] = [
  { indice: '01', id: 'hero', eyebrow: 'INICIO', titulo: 'Tu próximo auto, en Jujuy' },
  {
    indice: '02',
    id: 'contadores',
    eyebrow: 'NÚMEROS',
    titulo: 'Nueve años entregando autos',
    fondo: 'ambar',
  },
  { indice: '03', id: 'segmentos', eyebrow: 'SEGMENTOS', titulo: 'Qué estás buscando' },
  { indice: '04', id: 'vehiculos', eyebrow: 'VEHÍCULOS', titulo: 'Unidades disponibles hoy' },
  { indice: '05', id: 'marcas', eyebrow: 'MARCAS', titulo: 'Trabajamos con' },
  {
    indice: '06',
    id: 'postventa',
    eyebrow: 'POST-VENTA',
    titulo: 'No termina cuando te llevás el auto',
  },
  {
    indice: '07',
    id: 'preguntas',
    eyebrow: 'PREGUNTAS',
    titulo: 'Lo que todos preguntan',
    tono: 'claro',
    fondo: 'claro',
  },
  { indice: '08', id: 'contacto', eyebrow: 'CONTACTO', titulo: 'Escribinos' },
]

/**
 * Busca una sección por id.
 *
 * Los componentes de sección leen de acá su índice y su eyebrow en vez de
 * llevarlos escritos. Al insertar "Post-venta" entre Marcas y Preguntas hubo
 * que correr cuatro números, y con los índices hardcodeados el riel decía una
 * cosa y el encabezado de la sección otra. Ahora reordenar `SECCIONES` alcanza.
 *
 * Tira si el id no existe: es un error de programación, y fallar al importar
 * el módulo lo hace evidente en el acto en vez de dibujar un encabezado vacío.
 */
export function seccion(id: string): Seccion {
  const s = SECCIONES.find((x) => x.id === id)
  if (!s) throw new Error(`Sección desconocida en nav.ts: ${id}`)
  return s
}

/**
 * Ítems del menú desplegado.
 *
 * "Catálogo" apunta por ahora a la sección Vehículos del home; cuando exista
 * la ruta `/catalogo` se cambia solo este href.
 */
export interface ItemMenu {
  label: string
  href: string
}

export const MENU: ItemMenu[] = [
  { label: 'Vehículos', href: '#vehiculos' },
  { label: 'Catálogo', href: '#vehiculos' },
  { label: 'Nosotros', href: '#contadores' },
  { label: 'Contacto', href: '#contacto' },
]

/** Columnas del footer. El orden de los ítems ES el escalonado. */
export interface ColumnaFooter {
  titulo: string
  items: { label: string; href: string; externo?: boolean }[]
}

export const FOOTER: ColumnaFooter[] = [
  {
    titulo: 'CONTENIDO',
    items: [
      { label: 'Vehículos', href: '#vehiculos' },
      { label: 'Catálogo', href: '#vehiculos' },
      { label: 'Segmentos', href: '#segmentos' },
      { label: 'Marcas', href: '#marcas' },
      { label: 'Post-venta', href: '#postventa' },
    ],
  },
  {
    titulo: 'UTILIDAD',
    items: [
      { label: 'Nosotros', href: '#contadores' },
      { label: 'Contacto', href: '#contacto' },
      { label: 'Preguntas frecuentes', href: '#preguntas' },
    ],
  },
  {
    titulo: 'REDES',
    items: [
      {
        label: 'Instagram',
        href: 'https://instagram.com/autoshopjujuy',
        externo: true,
      },
      {
        label: 'Facebook',
        href: 'https://facebook.com/autoshopjujuy',
        externo: true,
      },
      { label: 'WhatsApp', href: WHATSAPP_URL, externo: true },
    ],
  },
]
