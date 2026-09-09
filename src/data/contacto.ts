/**
 * Datos de la concesionaria.
 *
 * TODO ESTO ES INVENTADO. Dirección, teléfonos, mails, horarios y redes son de
 * muestra y verosímiles para San Salvador de Jujuy, nada más. Cuando lleguen
 * los datos reales se reemplaza este archivo entero y no hay que tocar ningún
 * componente.
 */

export interface Contacto {
  nombre: string
  nombreLegal: string
  direccion: string
  ciudad: string
  provincia: string
  telefono: string
  /** Formato para el href tel:, sin espacios ni guiones. */
  telefonoHref: string
  whatsapp: string
  /** Número internacional sin signos, como lo pide wa.me. */
  whatsappHref: string
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
  whatsapp: '+54 9 388 415-2233',
  whatsappHref: '5493884152233',
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
    href: `https://wa.me/5493884152233`,
    usuario: '+54 9 388 415-2233',
  },
]

/**
 * Opciones del formulario. Viven acá y no en el componente porque son
 * contenido de negocio: cuando la concesionaria quiera agregar "Plan de ahorro
 * moto" o sacar "Fiat Plan", se toca este archivo y nada más.
 */
export interface Opcion {
  value: string
  label: string
}

export const CONSULTAS: Opcion[] = [
  { value: 'comprar-0km', label: 'Comprar 0km' },
  { value: 'comprar-usado', label: 'Comprar usado' },
  { value: 'cotizar-usado', label: 'Cotizar mi usado' },
  { value: 'fiat-plan', label: 'Fiat Plan' },
  { value: 'test-drive', label: 'Test drive' },
  { value: 'otra', label: 'Otra consulta' },
]

export const PRESUPUESTOS: Opcion[] = [
  { value: 'hasta-15', label: 'Hasta $15M' },
  { value: '15-30', label: '$15M – $30M' },
  { value: 'mas-30', label: '$30M+' },
]
