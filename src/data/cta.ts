import { CONTACTO } from './contacto'

/**
 * Sección de cierre, con el video corriendo dentro de las letras del titular.
 *
 * EL COPY NO NOMBRA EL PAISAJE. El clip es cordillera patagónica con nieve y
 * no la Quebrada de Humahuaca, que es árida y ocre: cualquiera de Jujuy nota
 * la diferencia en un segundo. A través de la máscara de texto se ven franjas
 * de montaña en movimiento y funciona igual, siempre que el texto hable de
 * comprar un auto y no de dónde está filmado.
 */
export interface Cta {
  /** El titular va partido a mano: cada línea es una máscara independiente. */
  titulo: string[]
  bajada: string
  primaria: { label: string; href: string }
  secundaria: { label: string; href: string }
}

export const CTA: Cta = {
  titulo: ['Probalo', 'antes de', 'decidir'],
  bajada:
    'Traés tu usado, lo tasamos mientras manejás el que te interesa. De lunes a sábado, sin turno previo.',
  primaria: { label: 'Ver vehículos', href: '#vehiculos' },
  secundaria: {
    label: 'Hablar por WhatsApp',
    href: `https://wa.me/${CONTACTO.whatsappHref}`,
  },
}

export const VIDEO_CTA = {
  src: '/video/cta.mp4',
  ancho: 1280,
  alto: 720,
} as const

/** Texto del botón flotante. En mobile queda solo el ícono. */
export const FLOTANTE = {
  label: 'Hablar con un asesor',
  href: `https://wa.me/${CONTACTO.whatsappHref}`,
  aria: `Escribinos por WhatsApp al ${CONTACTO.whatsapp}`,
} as const
