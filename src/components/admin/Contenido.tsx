import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import BloqueContadores from './BloqueContadores'
import BloquePreguntas from './BloquePreguntas'
import BloqueServicios from './BloqueServicios'
import Dialogo from './Dialogo'
import Marco, { AvisoError } from './Marco'
import { repoContenido } from '../../data/repo'
import type { Contadores, Pregunta, Servicio } from '../../types/contenido'

/**
 * «Contenido del sitio»: lo del inicio que no son autos.
 *
 * VA APARTE DE LAS UNIDADES, en su propia pestaña, porque es otro trabajo:
 * las unidades se tocan todos los días y esto una vez por mes, cuando cambia
 * un precio o aparece una pregunta nueva.
 *
 * Tres bloques con su propio guardado (ver `Bloque.tsx`). La pantalla solo
 * los carga y lleva la cuenta de cuáles tienen cambios, para avisar antes de
 * irse a las unidades o de cerrar la pestaña.
 */

type Datos = { contadores: Contadores; servicios: Servicio[]; preguntas: Pregunta[] }
type Bloque = keyof Datos

export function Contenido() {
  const navegar = useNavigate()
  const [datos, setDatos] = useState<Datos | null>(null)
  const [falla, setFalla] = useState<string | null>(null)
  const [sucios, setSucios] = useState<Record<Bloque, boolean>>({
    contadores: false,
    servicios: false,
    preguntas: false,
  })
  const [destino, setDestino] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    Promise.all([
      repoContenido.obtenerContadores(),
      repoContenido.listarServicios(),
      repoContenido.listarPreguntas(),
    ])
      .then(([contadores, servicios, preguntas]) => {
        if (vivo) setDatos({ contadores, servicios, preguntas })
      })
      .catch((e) => {
        if (vivo) setFalla(e instanceof Error ? e.message : 'No se pudo leer el contenido.')
      })
    return () => {
      vivo = false
    }
  }, [])

  // Estable: cada bloque avisa desde un efecto que depende de esta función,
  // y una nueva en cada render lo haría avisar en cada render.
  const marcar = useCallback(
    (k: Bloque, sucio: boolean) =>
      setSucios((prev) => (prev[k] === sucio ? prev : { ...prev, [k]: sucio })),
    [],
  )
  const onContadores = useCallback((s: boolean) => marcar('contadores', s), [marcar])
  const onServicios = useCallback((s: boolean) => marcar('servicios', s), [marcar])
  const onPreguntas = useCallback((s: boolean) => marcar('preguntas', s), [marcar])

  const haySucios = Object.values(sucios).some(Boolean)

  // Mismo aviso que el formulario de una unidad al cerrar o recargar.
  useEffect(() => {
    if (!haySucios) return
    const alSalir = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', alSalir)
    return () => window.removeEventListener('beforeunload', alSalir)
  }, [haySucios])

  return (
    <Marco
      indice="02"
      eyebrow="CONTENIDO"
      titulo="Contenido del sitio"
      lead="Los números, los servicios y las preguntas del inicio. Cada bloque se guarda con su propio botón."
      ancho="formulario"
      pestania="contenido"
      antesDeIr={(to) => {
        if (!haySucios) return true
        setDestino(to)
        return false
      }}
    >
      {falla && (
        <div className="mt-8">
          <AvisoError texto={falla} />
        </div>
      )}

      {!datos && !falla && <p className="font-hud mt-8 text-bone/45">CARGANDO…</p>}

      {datos && (
        <div className="mt-10 grid grid-cols-1 gap-14">
          <BloqueContadores inicial={datos.contadores} onSucio={onContadores} />
          <BloqueServicios inicial={datos.servicios} onSucio={onServicios} />
          <BloquePreguntas inicial={datos.preguntas} onSucio={onPreguntas} />
        </div>
      )}

      <Dialogo
        abierto={destino !== null}
        titulo="Tenés cambios sin guardar"
        confirmar="Salir sin guardar"
        onConfirmar={() => {
          const a = destino
          setDestino(null)
          if (a) navegar(a)
        }}
        cancelar="Seguir editando"
        onCancelar={() => setDestino(null)}
      >
        <p>
          Hay un bloque con cambios que no guardaste. Si salís ahora se pierden;
          lo que ya estaba guardado queda como estaba.
        </p>
      </Dialogo>
    </Marco>
  )
}

export default Contenido
