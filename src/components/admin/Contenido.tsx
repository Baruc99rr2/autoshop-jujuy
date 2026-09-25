import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import ErrorCarga from '../ErrorCarga'
import BloqueContacto from './BloqueContacto'
import BloqueContadores from './BloqueContadores'
import BloquePreguntas from './BloquePreguntas'
import BloqueSegmentos from './BloqueSegmentos'
import BloqueServicios from './BloqueServicios'
import Dialogo from './Dialogo'
import Marco from './Marco'
import { repoContenido } from '../../data/repo'
import type {
  Contadores,
  DatosContacto,
  Pregunta,
  Segmento,
  Servicio,
} from '../../types/contenido'

/**
 * «Contenido del sitio»: lo que no son autos. Los bloques van en el orden en
 * que aparecen en el inicio, y el contacto al final.
 *
 * VA APARTE DE LAS UNIDADES, en su propia pestaña, porque es otro trabajo:
 * las unidades se tocan todos los días y esto una vez por mes, cuando cambia
 * un precio o aparece una pregunta nueva.
 *
 * Cinco bloques con su propio guardado (ver `Bloque.tsx`). La pantalla solo
 * los carga y lleva la cuenta de cuáles tienen cambios, para avisar antes de
 * irse a las unidades o de cerrar la pestaña.
 */

type Datos = {
  contadores: Contadores
  segmentos: Segmento[]
  servicios: Servicio[]
  preguntas: Pregunta[]
  contacto: DatosContacto
}
type Bloque = keyof Datos

export function Contenido() {
  const navegar = useNavigate()
  const [datos, setDatos] = useState<Datos | null>(null)
  const [falla, setFalla] = useState<string | null>(null)
  const [sucios, setSucios] = useState<Record<Bloque, boolean>>({
    contadores: false,
    segmentos: false,
    servicios: false,
    preguntas: false,
    contacto: false,
  })
  const [destino, setDestino] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vivo = true
    Promise.all([
      repoContenido.obtenerContadores(),
      repoContenido.listarSegmentos(),
      repoContenido.listarServicios(),
      repoContenido.listarPreguntas(),
      repoContenido.obtenerContacto(),
    ])
      .then(([contadores, segmentos, servicios, preguntas, contacto]) => {
        if (vivo) setDatos({ contadores, segmentos, servicios, preguntas, contacto })
      })
      .catch((e) => {
        if (vivo) setFalla(e instanceof Error ? e.message : 'No se pudo leer el contenido.')
      })
    return () => {
      vivo = false
    }
  }, [intento])

  // Estable: cada bloque avisa desde un efecto que depende de esta función,
  // y una nueva en cada render lo haría avisar en cada render.
  const marcar = useCallback(
    (k: Bloque, sucio: boolean) =>
      setSucios((prev) => (prev[k] === sucio ? prev : { ...prev, [k]: sucio })),
    [],
  )
  const onContadores = useCallback((s: boolean) => marcar('contadores', s), [marcar])
  const onSegmentos = useCallback((s: boolean) => marcar('segmentos', s), [marcar])
  const onServicios = useCallback((s: boolean) => marcar('servicios', s), [marcar])
  const onPreguntas = useCallback((s: boolean) => marcar('preguntas', s), [marcar])
  const onContacto = useCallback((s: boolean) => marcar('contacto', s), [marcar])

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
      lead="Los números, los segmentos, los servicios, las preguntas y los datos de contacto. Cada bloque se guarda con su propio botón."
      ancho="formulario"
      pestania="contenido"
      antesDeIr={(to) => {
        if (!haySucios) return true
        setDestino(to)
        return false
      }}
    >
      {falla && (
        <ErrorCarga
          className="mt-8"
          titulo="No pude traer el contenido del sitio"
          texto={falla}
          onReintentar={() => {
            setFalla(null)
            setIntento((n) => n + 1)
          }}
        />
      )}

      {!datos && !falla && <ContenidoEsqueleto />}

      {datos && (
        <div className="mt-10 grid grid-cols-1 gap-14">
          <BloqueContadores inicial={datos.contadores} onSucio={onContadores} />
          <BloqueSegmentos inicial={datos.segmentos} onSucio={onSegmentos} />
          <BloqueServicios inicial={datos.servicios} onSucio={onServicios} />
          <BloquePreguntas inicial={datos.preguntas} onSucio={onPreguntas} />
          <BloqueContacto inicial={datos.contacto} onSucio={onContacto} />
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

/** Los bloques, vacíos, mientras llega el contenido. */
function ContenidoEsqueleto() {
  return (
    <div className="mt-10 grid animate-pulse grid-cols-1 gap-14" aria-hidden="true">
      {[4, 2, 3, 3, 4].map((filas, i) => (
        <div key={i} className="border-t border-graphite pt-8">
          <div className="h-4 w-40 bg-graphite/60" />
          <div className="mt-3 h-3 w-3/4 bg-graphite/30" />
          <div className="mt-6 grid grid-cols-1 gap-3">
            {Array.from({ length: filas }, (_, k) => (
              <div key={k} className="h-20 bg-graphite/35" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default Contenido
