/**
 * La app habla SOLO con esto.
 *
 * Hoy `repo` es el mock sobre localStorage; mañana va a ser el de Supabase y
 * esta línea es lo único que cambia. Ningún componente importa `mock.ts`
 * directamente — si alguno lo hiciera, el cambio de implementación dejaría de
 * ser una línea.
 */
import { repoMock } from './mock'
import { contenidoMock } from './mock-contenido'
import type { RepoContenido, RepoVehiculos } from './tipos'

export const repo: RepoVehiculos = repoMock

/** Contadores, servicios y preguntas del inicio. Misma regla que `repo`. */
export const repoContenido: RepoContenido = contenidoMock

export { ErrorRepo } from './tipos'
export type {
  CambiosVehiculo,
  FiltrosVehiculos,
  NuevoVehiculo,
  RepoContenido,
  RepoVehiculos,
} from './tipos'
export { esDemo, PREFIJO_DEMO } from './semilla'
