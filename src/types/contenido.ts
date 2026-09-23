/**
 * El contenido fijo del inicio que la dueña edita desde el panel: las cuatro
 * cifras de la franja ámbar, los servicios y las preguntas frecuentes.
 *
 * Antes vivía en archivos de datos y cada cambio era llamar al programador.
 * Los precios de los servicios se desactualizan en semanas, así que eso no
 * podía seguir así.
 */

// ── Contadores ────────────────────────────────────────────────────────────

/**
 * El sufijo que entra al final con un corte seco. Tres opciones cerradas y no
 * texto libre: la franja se dibuja en 2×2 a 390 px y un sufijo de cuatro
 * letras desarma la cifra.
 */
export type SufijoContador = '' | '+' | '%'

export const SUFIJOS: readonly { id: SufijoContador; label: string }[] = [
  { id: '', label: 'Ninguno' },
  { id: '+', label: '+' },
  { id: '%', label: '%' },
]

export interface Contador {
  /** Clave estable. La animación se ancla acá, no al índice. */
  id: string
  /** Valor final. El conteo arranca siempre en 0. Ignorado si `desdeApertura`. */
  valor: number
  sufijo: SufijoContador
  /** Texto debajo de la cifra. Corto: dos o tres palabras. */
  etiqueta: string
  /**
   * La cifra de los años en Jujuy NO se escribe: se calcula desde el año de
   * apertura. Un número a mano en un dato que crece solo queda viejo el 1 de
   * enero, y nadie se acuerda de volver a tocarlo.
   */
  desdeApertura?: boolean
}

export interface Contadores {
  /** Año en que abrió el salón. */
  apertura: number
  /** Siempre cuatro: la franja está dibujada para cuatro celdas. */
  lista: Contador[]
}

/** La cifra que se muestra, calculada si hace falta. */
export function valorContador(c: Contador, apertura: number): number {
  if (!c.desdeApertura) return c.valor
  return Math.max(0, new Date().getFullYear() - apertura)
}

// ── Servicios ─────────────────────────────────────────────────────────────

/**
 * Los dibujos que puede llevar un servicio.
 *
 * SE ELIGEN, NO SE SUBEN. Los seis están dibujados en `Icono.tsx` con la
 * misma grilla y el mismo trazo; un ícono subido suelto —otro grosor, otra
 * caja, a color— rompería la fila de tiles en el acto.
 */
export const ICONOS_SERVICIO = [
  { id: 'seguro', label: 'Paraguas' },
  { id: 'escaneo', label: 'Escáner' },
  { id: 'garantia', label: 'Escudo' },
  { id: 'limpieza', label: 'Pulverizador' },
  { id: 'aceite', label: 'Aceitera' },
  { id: 'llave', label: 'Llave' },
] as const

export type IconoServicio = (typeof ICONOS_SERVICIO)[number]['id']

export interface Servicio {
  id: string
  icono: IconoServicio
  /** Título corto, arriba del tile. */
  titulo: string
  /**
   * Pesos argentinos, o `null` cuando el precio depende de la unidad.
   *
   * Va como NÚMERO y no como texto: lo escribe `formatearPrecio`, el mismo
   * que el catálogo, así que un precio del salón y uno de un auto se
   * escriben igual.
   */
  precio: number | null
  /** La condición o el próximo paso, SIN el precio: el tile los compone. */
  detalle: string
  orden: number
}

// ── Preguntas ─────────────────────────────────────────────────────────────

export interface Pregunta {
  id: string
  pregunta: string
  respuesta: string
  orden: number
}
