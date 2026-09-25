/**
 * La app habla SOLO con esto.
 *
 * `repo` y `repoContenido` son Supabase o el mock del navegador según
 * `data/modo.ts`, y ningún componente se entera de cuál le tocó. Ningún
 * componente importa `mock.ts` ni `supabase.ts` directamente — si alguno lo
 * hiciera, cambiar de implementación dejaría de ser una línea.
 */
import { USA_SUPABASE } from '../modo'
import { repoMock } from './mock'
import { contenidoMock } from './mock-contenido'
import { repoSupabase } from './supabase'
import { contenidoSupabase } from './supabase-contenido'
import type { RepoContenido, RepoVehiculos } from './tipos'

export const repo: RepoVehiculos = USA_SUPABASE ? repoSupabase : repoMock

/** Contadores, segmentos, servicios, preguntas y contacto. Misma regla que `repo`. */
export const repoContenido: RepoContenido = USA_SUPABASE ? contenidoSupabase : contenidoMock

export { ErrorRepo } from './tipos'
export type {
  CambiosVehiculo,
  FiltrosVehiculos,
  NuevoVehiculo,
  RepoContenido,
  RepoVehiculos,
} from './tipos'
export { esDemo, PREFIJO_DEMO } from './semilla'
export { SEMILLA_CONTACTO, SEMILLA_SEGMENTOS } from './semilla-contenido'
