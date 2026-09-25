/**
 * Lo fijo de la concesionaria y las cuentas que arman links de contacto.
 *
 * TELÉFONO, MAIL, WHATSAPP, DIRECCIÓN Y HORARIOS YA NO VIVEN ACÁ: los edita
 * la dueña desde el panel y se leen con `useContacto()` (`lib/contenido.ts`).
 * La primera carga sale de `SEMILLA_CONTACTO` (`repo/semilla-contenido.ts`).
 * Este archivo se queda con lo que no cambia —el nombre, la ciudad, las
 * redes— y con las funciones que convierten un dato escrito a mano en un link
 * que funcione.
 */

import type { DatosContacto } from '../types/contenido'

export interface Negocio {
  nombre: string
  nombreLegal: string
  ciudad: string
  provincia: string
  /** Coordenadas de la plaza Belgrano, para el ticker del hero. */
  coordenadas: string
  desde: number
}

export const NEGOCIO: Negocio = {
  nombre: 'AutoShop Jujuy',
  nombreLegal: 'Automotores AutoShop Jujuy',
  ciudad: 'San Salvador de Jujuy',
  provincia: 'Jujuy',
  coordenadas: '24.1858°S 65.2995°W',
  desde: 2015,
}

// ── WhatsApp ──────────────────────────────────────────────────────────────

/**
 * El número tal como lo escribió la dueña, llevado al formato que pide
 * wa.me: internacional, sin `+`, sin espacios ni guiones. `null` si no hay
 * forma de sacar un celular argentino de ahí.
 *
 * Acepta las formas en que se escribe un celular en Argentina: con o sin
 * +54, con o sin el 9, con el 0 de la característica y hasta con el 15 viejo
 * ("0388 15 465-2485"). El número guardado queda como lo escribió ella; esto
 * solo arma el link.
 */
export function numeroWhatsapp(texto: string): string | null {
  let d = texto.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('54')) d = d.slice(2)
  if (d.startsWith('9')) d = d.slice(1)
  if (d.startsWith('0')) d = d.slice(1)
  // El 15 va después de la característica (2 a 4 cifras) y sobra: con él son
  // 12 cifras en vez de 10.
  if (d.length === 12) {
    for (const largo of [2, 3, 4]) {
      if (d.slice(largo, largo + 2) === '15') {
        d = d.slice(0, largo) + d.slice(largo + 2)
        break
      }
    }
  }
  return d.length === 10 ? `549${d}` : null
}

/**
 * Link a la conversación, con un mensaje ya escrito si viene. El texto va
 * SIEMPRE por `encodeURIComponent`: los mensajes del formulario traen saltos
 * de línea y acentos, y sin codificar el link se corta en el primer espacio.
 *
 * Si el número no se puede leer, el link va a wa.me sin número: WhatsApp
 * abre y deja elegir el contacto con el mensaje escrito, que es mejor que un
 * botón muerto. El panel no deja guardar un número así.
 */
export function whatsappUrl(numero: string, mensaje?: string): string {
  const n = numeroWhatsapp(numero) ?? ''
  const base = `https://wa.me/${n}`
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base
}

// ── Teléfono y mapa ───────────────────────────────────────────────────────

/** Para el `href`: `tel:` solo con cifras y, si lo hay, el `+` del principio. */
export function telefonoHref(telefono: string): string {
  const t = telefono.trim()
  return `tel:${t.startsWith('+') ? '+' : ''}${t.replace(/\D/g, '')}`
}

/** ¿Las coordenadas son un punto del planeta? */
export function coordenadasValidas(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  )
}

/**
 * El mapa embebido de OpenStreetMap: sin clave y sin cuenta.
 *
 * El embed no busca direcciones, solo recibe un recuadro y un marcador. El
 * recuadro mide unos 1,2 × 0,9 km alrededor del salón: con eso el mapa
 * muestra calles con nombre y todavía se reconoce la zona de la ciudad.
 */
export function mapaEmbedUrl(c: Pick<DatosContacto, 'lat' | 'lng'>): string {
  const dLng = 0.006
  const dLat = 0.004
  const bbox = [c.lng - dLng, c.lat - dLat, c.lng + dLng, c.lat + dLat]
    .map((n) => n.toFixed(6))
    .join(',')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${c.lat.toFixed(6)},${c.lng.toFixed(6)}`
}

/**
 * «Cómo llegar»: Google Maps con la ruta desde donde esté la persona hasta el
 * salón. Es un link común de Google (sin clave); en el celular abre la app.
 *
 * El destino va en coordenadas y no con el texto de la dirección: es el
 * mismo punto que marca el mapa, y un texto como "Av. Éxodo 750" Google lo
 * puede interpretar en otra ciudad.
 */
export function comoLlegarUrl(c: Pick<DatosContacto, 'lat' | 'lng'>): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`
}

// ── Redes ─────────────────────────────────────────────────────────────────

export interface Red {
  label: string
  href: string
  /** Lo que se muestra al lado del nombre en la sección de contacto. */
  usuario: string
}

/** Las redes fijas. El WhatsApp se suma donde se dibuja, desde `useContacto()`. */
export const REDES: Red[] = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/autoshopjuy',
    usuario: '@autoshopjuy',
  },
  {
    label: 'Facebook',
    /* La página se llama «Autoshop Jujuy», con espacio, y eso no es una
       dirección: hasta tener el link exacto de la página, el enlace abre la
       búsqueda de Facebook con ese nombre. */
    href: 'https://www.facebook.com/search/top?q=Autoshop%20Jujuy',
    usuario: 'Autoshop Jujuy',
  },
]

/**
 * Opciones del formulario. Viven acá y no en el componente porque son
 * contenido de negocio: cuando la concesionaria quiera agregar o sacar una,
 * se toca este archivo y nada más. El label es el que viaja en el mensaje de
 * WhatsApp, así que se lee tal cual del lado de la dueña.
 */
export interface Opcion {
  value: string
  label: string
}

export const CONSULTAS: Opcion[] = [
  { value: 'comprar-0km', label: 'Comprar 0km' },
  { value: 'comprar-usado', label: 'Comprar usado' },
  { value: 'otra', label: 'Otra consulta' },
]

export const PRESUPUESTOS: Opcion[] = [
  { value: 'hasta-15', label: 'Hasta $15M' },
  { value: '15-30', label: '$15M – $30M' },
  { value: 'mas-30', label: '$30M+' },
]

/** Texto del botón flotante de WhatsApp. El link sale de `useContacto()`. */
export const FLOTANTE_LABEL = 'Hablar con un asesor'
