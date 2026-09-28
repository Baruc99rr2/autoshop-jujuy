import type { OrdenVehiculos } from './repo/tipos'
import type { Condicion } from '../types/vehiculo'

/**
 * Filtros por condición. Los usa la sección Vehículos del home y la página
 * `/catalogo`: viven acá para que las dos digan lo mismo.
 *
 * SON FIJOS, no salen del stock: el chip «0km» está aunque hoy no haya ningún
 * 0km. Tocarlo muestra el vacío que invita a pedirlo por WhatsApp, y un chip
 * que aparece y desaparece según el stock mueve de lugar a los otros.
 */
export interface FiltroCatalogo {
  id: 'todos' | Condicion
  label: string
}

export const FILTROS: FiltroCatalogo[] = [
  { id: 'todos', label: 'Todos' },
  { id: '0km', label: '0km' },
  { id: 'usado', label: 'Usados' },
]

/**
 * El selector «Ordenar por» del catálogo. El `id` es lo que viaja en la URL
 * (`?orden=precio-asc`) y lo que se le pide al repositorio, que ordena en la
 * base. El primero es el de siempre y el que no se escribe en la URL.
 */
export const ORDENES: { id: OrdenVehiculos; label: string }[] = [
  { id: 'recientes', label: 'Más recientes' },
  { id: 'precio-asc', label: 'Precio: menor a mayor' },
  { id: 'precio-desc', label: 'Precio: mayor a menor' },
  { id: 'anio-desc', label: 'Año: más nuevo primero' },
  { id: 'anio-asc', label: 'Año: más viejo primero' },
  { id: 'km-asc', label: 'Kilometraje: menor a mayor' },
  { id: 'km-desc', label: 'Kilometraje: mayor a menor' },
]

export const ORDEN_POR_DEFECTO: OrdenVehiculos = 'recientes'
