/**
 * La app habla SOLO con esto.
 *
 * `repo` y `repoContenido` son Supabase o el mock del navegador según
 * `data/modo.ts`, y ningún componente se entera de cuál le tocó. Ningún
 * componente importa `mock.ts` ni `supabase.ts` directamente — si alguno lo
 * hiciera, cambiar de implementación dejaría de ser una línea.
 */
import { conSubida } from '../../lib/subidas'
import { USA_SUPABASE } from '../modo'
import { repoMock } from './mock'
import { contenidoMock } from './mock-contenido'
import { repoSupabase } from './supabase'
import { contenidoSupabase } from './supabase-contenido'
import type { RepoContenido, RepoVehiculos } from './tipos'

const vehiculos: RepoVehiculos = USA_SUPABASE ? repoSupabase : repoMock
const contenido: RepoContenido = USA_SUPABASE ? contenidoSupabase : contenidoMock

/*
 * Los métodos que SUBEN ARCHIVOS van envueltos en `conSubida`: mientras dura
 * una subida, el cierre por inactividad del panel no corre (ver
 * `lib/subidas.ts`). Se envuelve acá y no en cada componente para que una
 * subida nueva no pueda olvidarse de avisar.
 */
export const repo: RepoVehiculos = {
  ...vehiculos,
  subirFoto: (...a) => conSubida(vehiculos.subirFoto(...a)),
  subirVideo: (...a) => conSubida(vehiculos.subirVideo(...a)),
}

/** Contadores, segmentos, servicios, preguntas y contacto. Misma regla que `repo`. */
export const repoContenido: RepoContenido = {
  ...contenido,
  // Guardar segmentos sube las fotos nuevas en el mismo pedido.
  guardarSegmentos: (...a) => conSubida(contenido.guardarSegmentos(...a)),
}

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
