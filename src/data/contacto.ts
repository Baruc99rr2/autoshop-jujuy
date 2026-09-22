/**
 * Datos de la concesionaria.
 *
 * El número de WhatsApp es EL REAL. El resto —dirección, teléfono fijo, mail,
 * horarios y redes— todavía es de muestra y verosímil para San Salvador de
 * Jujuy: cuando lleguen los datos reales se reemplazan acá y no hay que tocar
 * ningún componente.
 */

/**
 * Número de WhatsApp de la concesionaria, en el formato que pide wa.me:
 * internacional, sin `+`, sin espacios ni guiones.
 *
 * ES LA ÚNICA COPIA DEL NÚMERO EN TODO EL SITIO. El formulario de contacto, el
 * botón flotante, el link del footer y el de la sección de contacto salen de
 * acá: con el número escrito en cada lugar, cambiarlo significaba encontrar
 * los cinco.
 */
export const WHATSAPP_NUMERO = '5493884652485'

/** Link base a la conversación, sin mensaje. */
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMERO}`

/**
 * Link a WhatsApp con un mensaje ya escrito. El texto va SIEMPRE por
 * `encodeURIComponent`: los mensajes del formulario traen saltos de línea y
 * acentos, y sin codificar el link se corta en el primer espacio.
 */
export function whatsappCon(mensaje: string): string {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(mensaje)}`
}

export interface Contacto {
  nombre: string
  nombreLegal: string
  direccion: string
  ciudad: string
  provincia: string
  telefono: string
  /** Formato para el href tel:, sin espacios ni guiones. */
  telefonoHref: string
  /** Solo para mostrar en pantalla. El link sale de WHATSAPP_URL. */
  whatsapp: string
  email: string
  horarios: { dias: string; horas: string }[]
  /** Coordenadas de la plaza Belgrano, para el ticker del hero. */
  coordenadas: string
  desde: number
}

export const CONTACTO: Contacto = {
  nombre: 'AutoShop Jujuy',
  nombreLegal: 'Automotores AutoShop Jujuy',
  direccion: 'Av. Éxodo 1450',
  ciudad: 'San Salvador de Jujuy',
  provincia: 'Jujuy',
  telefono: '0388 423-7788',
  telefonoHref: '+543884237788',
  whatsapp: '+54 9 388 465-2485',
  email: 'ventas@autoshopjujuy.com.ar',
  horarios: [
    { dias: 'Lunes a viernes', horas: '9:00 a 13:00 · 17:00 a 20:30' },
    { dias: 'Sábados', horas: '9:30 a 13:30' },
  ],
  coordenadas: '24.1858°S 65.2995°W',
  desde: 2015,
}

export interface Red {
  label: string
  href: string
  /** Lo que se muestra al lado del nombre en la sección de contacto. */
  usuario: string
}

export const REDES: Red[] = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/autoshopjujuy',
    usuario: '@autoshopjujuy',
  },
  {
    label: 'Facebook',
    href: 'https://facebook.com/autoshopjujuy',
    usuario: '/autoshopjujuy',
  },
  {
    label: 'WhatsApp',
    href: WHATSAPP_URL,
    usuario: CONTACTO.whatsapp,
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

/**
 * Botón flotante de WhatsApp. Vivía en `data/cta.ts` junto con la sección de
 * cierre; al sacarse esa sección se mudó acá, que es donde está el número.
 * En mobile queda solo el ícono, así que el `aria` carga la identificación.
 */
export const FLOTANTE = {
  label: 'Hablar con un asesor',
  href: WHATSAPP_URL,
  aria: `Escribinos por WhatsApp al ${CONTACTO.whatsapp}`,
} as const
