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

// ── Segmentos ─────────────────────────────────────────────────────────────

/**
 * La foto de un segmento.
 *
 * `ruta` es el camino dentro del bucket (`segmentos/...`), o `null` cuando la
 * imagen es un archivo del sitio (`/img/segmentos/...`, las cuatro de la
 * semilla): esas no se borran nunca desde el panel.
 *
 * `ancho` y `alto` son los REALES del archivo: van al `<img>` porque la
 * sección es un pin de ScrollTrigger, y un salto de layout ahí corre el pin
 * entero.
 */
export interface ImagenSegmento {
  url: string
  ruta: string | null
  ancho: number
  alto: number
}

export interface Segmento {
  id: string
  /** Nombre corto que muestra la lista: "Ciudad", "Ruta". */
  titulo: string
  /** Una línea concreta sobre para qué sirve ese tipo de auto en Jujuy. */
  texto: string
  /** Rótulo corto a la derecha del ítem ("4X4"). Vacío = sin rótulo. */
  etiqueta: string
  imagen: ImagenSegmento
  orden: number
}

/**
 * Lo que el panel manda al guardar: una fila puede traer una foto NUEVA
 * (`archivo`, ya comprimida) en vez de la que tenía. El repositorio la sube,
 * y recién ahí la fila tiene `imagen`.
 */
export type SegmentoAGuardar = Omit<Segmento, 'imagen'> & {
  imagen: ImagenSegmento | null
  archivo?: File
}

/**
 * El carrusel apilado necesita al menos dos: con uno solo no hay nada que
 * apilar. Con uno la sección se dibuja fija (una card, sin pin), y con cero
 * no se dibuja.
 */
export const MIN_SEGMENTOS_CARRUSEL = 2

/**
 * Techo de la lista. El pin mide 0,8 pantallas por segmento: con más de seis
 * la sección se vuelve un túnel que hay que scrollear un buen rato.
 */
export const MAX_SEGMENTOS = 6

// ── Contacto ──────────────────────────────────────────────────────────────

export interface Horario {
  /** "Lunes a viernes" */
  dias: string
  /** "9:00 a 13:00 · 17:00 a 20:30" */
  horas: string
}

/**
 * Los datos de contacto que edita la dueña. Todo lo que muestra o enlaza un
 * teléfono, un mail, el WhatsApp o la dirección sale de ACÁ, vía
 * `useContacto()`: el formulario, el flotante, la ficha y el footer.
 */
export interface DatosContacto {
  /** Como se muestra: "0388 423-7788". El `tel:` se arma solo. */
  telefono: string
  email: string
  /**
   * Como se muestra: "+54 9 388 465-2485". El link de `wa.me` se arma con
   * `numeroWhatsapp()`, que lo lleva al formato internacional.
   */
  whatsapp: string
  /** "Av. Éxodo 750, San Salvador de Jujuy" */
  direccion: string
  /**
   * Coordenadas del salón, en grados decimales. El mapa de OpenStreetMap y
   * el «Cómo llegar» trabajan con esto y no con el texto de la dirección:
   * geocodificar texto necesitaría un servicio con clave.
   */
  lat: number
  lng: number
  horarios: Horario[]
}
