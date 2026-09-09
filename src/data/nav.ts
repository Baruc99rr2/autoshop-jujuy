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
}

export const SECCIONES: Seccion[] = [
  { indice: '01', id: 'hero', eyebrow: 'INICIO', titulo: 'Tu próximo auto, en Jujuy' },
  { indice: '02', id: 'contadores', eyebrow: 'NÚMEROS', titulo: 'Nueve años entregando autos' },
  { indice: '03', id: 'segmentos', eyebrow: 'SEGMENTOS', titulo: 'Qué estás buscando' },
  { indice: '04', id: 'vehiculos', eyebrow: 'VEHÍCULOS', titulo: 'Unidades disponibles hoy' },
  { indice: '05', id: 'plan', eyebrow: 'FIAT PLAN', titulo: 'Entrá con cuota fija' },
  { indice: '06', id: 'cotizador', eyebrow: 'COTIZADOR', titulo: 'Cotizá tu usado' },
  { indice: '07', id: 'marcas', eyebrow: 'MARCAS', titulo: 'Trabajamos con' },
  { indice: '08', id: 'preguntas', eyebrow: 'PREGUNTAS', titulo: 'Lo que todos preguntan' },
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
