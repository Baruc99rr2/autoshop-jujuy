import type { NombreIcono } from '../components/Icono'

/**
 * Los cuatro accesos de post-venta.
 *
 * Todo inventado, pero concreto: plazos de turno, qué incluye cada service, de
 * dónde vienen los repuestos. Una grilla que dijera "Calidad garantizada" y
 * "Atención personalizada" se lee como relleno y no le sirve a nadie.
 */
export interface AccesoPostventa {
  id: string
  icono: NombreIcono
  titulo: string
  descripcion: string
}

export const POSTVENTA: AccesoPostventa[] = [
  {
    id: 'turnos',
    icono: 'calendario',
    titulo: 'Turnos de service',
    descripcion:
      'Pedís el turno y en 48 horas te confirmamos día y hora. El service de 10.000 km sale en el día.',
  },
  {
    id: 'repuestos',
    icono: 'pieza',
    titulo: 'Repuestos originales',
    descripcion:
      'Filtros, pastillas y correas de las ocho marcas en stock. Lo que no está llega de Córdoba en 72 horas.',
  },
  {
    id: 'mantenimiento',
    icono: 'service',
    titulo: 'Mantenimiento programado',
    descripcion:
      'Los cuatro primeros services del 0km en cuotas fijas, con mano de obra y repuestos incluidos.',
  },
  {
    id: 'accesorios',
    icono: 'accesorio',
    titulo: 'Accesorios',
    descripcion:
      'Barras de techo, cobertores, alarmas y llantas, con colocación en el mismo taller y garantía escrita.',
  },
]
