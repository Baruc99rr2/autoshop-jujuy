import type { Condicion } from '../types/vehiculo'

/**
 * Filtros por condición. Los usa la sección Vehículos del home y los va a usar
 * la página `/catalogo`: viven acá para que las dos digan lo mismo.
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
