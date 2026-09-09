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
   * Fondo de la sección. El riel es un overlay fijo sobre toda la página, así
   * que sobre las secciones claras (FAQ y menú) tiene que invertir sus colores
   * o desaparece contra el fondo bone.
   */
  tono?: 'claro'
}

export const SECCIONES: Seccion[] = [
  { indice: '01', id: 'hero', eyebrow: 'INICIO', titulo: 'Tu próximo auto, en Jujuy' },
  { indice: '02', id: 'contadores', eyebrow: 'NÚMEROS', titulo: 'Nueve años entregando autos' },
  { indice: '03', id: 'segmentos', eyebrow: 'SEGMENTOS', titulo: 'Qué estás buscando' },
  { indice: '04', id: 'vehiculos', eyebrow: 'VEHÍCULOS', titulo: 'Unidades disponibles hoy' },
  { indice: '05', id: 'plan', eyebrow: 'FIAT PLAN', titulo: 'Entrá con cuota fija' },
  { indice: '06', id: 'cotizador', eyebrow: 'COTIZADOR', titulo: 'Cotizá tu usado' },
  { indice: '07', id: 'marcas', eyebrow: 'MARCAS', titulo: 'Trabajamos con' },
  {
    indice: '08',
    id: 'preguntas',
    eyebrow: 'PREGUNTAS',
    titulo: 'Lo que todos preguntan',
    tono: 'claro',
  },
  { indice: '09', id: 'cta', eyebrow: 'TEST DRIVE', titulo: 'Vení a probarlo' },
  { indice: '10', id: 'contacto', eyebrow: 'CONTACTO', titulo: 'Escribinos' },
]

/** Ítems del menú desplegado (fase 3). */
export interface ItemMenu {
  label: string
  href: string
}

export const MENU: ItemMenu[] = [
  { label: 'Vehículos', href: '#vehiculos' },
  { label: 'Usados', href: '#vehiculos' },
  { label: 'Fiat Plan', href: '#plan' },
  { label: 'Cotizar usado', href: '#cotizador' },
  { label: 'Test drive', href: '#cta' },
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
      { label: 'Segmentos', href: '#segmentos' },
      { label: 'Fiat Plan', href: '#plan' },
      { label: 'Cotizar usado', href: '#cotizador' },
      { label: 'Marcas', href: '#marcas' },
      { label: 'Test drive', href: '#cta' },
    ],
  },
  {
    titulo: 'UTILIDAD',
    items: [
      { label: 'Contacto', href: '#contacto' },
      { label: 'Preguntas frecuentes', href: '#preguntas' },
      { label: 'Política de privacidad', href: '#contacto' },
      { label: 'Términos y condiciones', href: '#contacto' },
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
      { label: 'WhatsApp', href: 'https://wa.me/5493884152233', externo: true },
    ],
  },
]
