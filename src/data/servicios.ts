import type { NombreIcono } from '../components/Icono'

/**
 * Los servicios de la concesionaria.
 *
 * A DIFERENCIA DEL RESTO DE LOS DATOS DE MUESTRA, ESTOS SON REALES: los cinco
 * son los que la concesionaria presta hoy, con los precios que cobra. No
 * llevan prefijo `demo-` ni se borran con la semilla del catálogo, porque no
 * salen del panel: viven acá y se editan acá.
 *
 * Falta un sexto, que se agrega cuando lo confirmen. La grilla está armada en
 * tres columnas justamente por eso: con seis quedan dos filas llenas, y con
 * los cinco de hoy queda un solo hueco al final de la segunda, que es como
 * cae cualquier cantidad impar.
 */
export interface Servicio {
  id: string
  icono: NombreIcono
  /** Título corto, arriba del tile. Dos o tres palabras. */
  titulo: string
  /**
   * Pesos argentinos, o `null` cuando el precio depende de la unidad.
   *
   * Va como NÚMERO y no como texto ya formateado: lo escribe `formatearPrecio`
   * con el mismo `Intl.NumberFormat('es-AR')` que el catálogo y la ficha, así
   * que un precio del salón y un precio de un auto se escriben igual. Si
   * estuviera escrito a mano, el día que cambie el formato cambiaría en un
   * lado y no en el otro.
   */
  precio: number | null
  /**
   * La línea de abajo, SIN el precio: el tile las compone.
   *
   * Es la condición o el próximo paso, no una descripción: "con débito
   * automático" dice cómo se paga y "reservá tu turno" dice qué hacer ahora.
   * Un párrafo explicando qué es un escaneo vehicular no le sirve a nadie que
   * ya está buscando uno.
   */
  detalle: string
}

export const SERVICIOS: Servicio[] = [
  {
    id: 'seguros',
    icono: 'seguro',
    titulo: 'Seguros',
    precio: null,
    detalle: 'Con débito automático',
  },
  {
    id: 'escaneo',
    icono: 'escaneo',
    titulo: 'Escaneo vehicular',
    precio: 35_000,
    detalle: '',
  },
  {
    id: 'garantia',
    icono: 'garantia',
    titulo: 'Garantía para tu vehículo',
    precio: null,
    detalle: 'Con débito automático',
  },
  {
    id: 'limpieza',
    icono: 'limpieza',
    titulo: 'Limpieza de interiores + motor',
    precio: 125_000,
    detalle: 'Reservá tu turno',
  },
  {
    id: 'filtros',
    icono: 'aceite',
    titulo: 'Service de filtros y aceite',
    precio: null,
    detalle: 'Consultá el precio según tu unidad',
  },
]
