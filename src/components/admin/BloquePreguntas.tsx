import { useId, useState } from 'react'
import { BarraGuardar, BotonAgregar, FilaLista } from './Bloque'
import { idNuevo, mover, useBloque, useEnfocarNueva } from './estado-bloque'
import type { Errores } from './estado-bloque'
import { AreaTexto, Seccion } from './Campos'
import Dialogo from './Dialogo'
import { repoContenido } from '../../data/repo'
import type { Pregunta } from '../../types/contenido'

/**
 * Las preguntas frecuentes del inicio. Mismo patrón que los servicios, con la
 * respuesta en un área de texto: son dos o tres frases, y en un campo de un
 * renglón no se ve lo que se está escribiendo.
 */

const MAX_PREGUNTA = 120
const MAX_RESPUESTA = 600

type FilaB = Omit<Pregunta, 'orden'>

const aBorrador = (lista: Pregunta[]): FilaB[] =>
  lista.map(({ orden: _orden, ...p }) => p)

const ids = (uid: string, id: string) => ({
  pregunta: `${uid}-${id}-pregunta`,
  respuesta: `${uid}-${id}-respuesta`,
})

const vacia = (p: FilaB) => !p.pregunta.trim() && !p.respuesta.trim()

function preparar(uid: string, b: FilaB[]) {
  const errores: Errores = {}
  const datos: Pregunta[] = b.filter((p) => !vacia(p)).map((p, i) => {
    const id = ids(uid, p.id)
    const pregunta = p.pregunta.trim()
    const respuesta = p.respuesta.trim()
    if (!pregunta) errores[id.pregunta] = 'Falta la pregunta.'
    if (!respuesta) errores[id.respuesta] = 'Falta la respuesta.'
    return { id: p.id, pregunta, respuesta, orden: i }
  })
  return { datos, errores }
}

export function BloquePreguntas({
  inicial,
  onSucio,
}: {
  inicial: Pregunta[]
  onSucio: (sucio: boolean) => void
}) {
  const uid = useId()
  const bloque = useBloque({
    inicial: aBorrador(inicial),
    preparar: (b: FilaB[]) => preparar(uid, b),
    enviar: (d: Pregunta[]) => repoContenido.guardarPreguntas(d),
    aBorrador,
    onSucio,
  })
  const { b: lista, setB, errores, limpiarError } = bloque
  const [aBorrar, setABorrar] = useState<FilaB | null>(null)
  const enfocar = useEnfocarNueva()

  const editar = (id: string, cambios: Partial<FilaB>) =>
    setB((prev) => prev.map((p) => (p.id === id ? { ...p, ...cambios } : p)))

  const agregar = () => {
    const id = idNuevo('faq')
    setB((prev) => [...prev, { id, pregunta: '', respuesta: '' }])
    enfocar(ids(uid, id).pregunta)
  }

  const quitar = (id: string) => {
    setB((prev) => prev.filter((p) => p.id !== id))
    setABorrar(null)
  }

  return (
    <Seccion
      titulo="PREGUNTAS FRECUENTES"
      contador={String(lista.length)}
      ayuda="La primera de la lista es la que aparece abierta. Sin preguntas, la sección no aparece en el sitio."
    >
      {lista.length > 0 && (
        <ul className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {lista.map((p, i) => {
            const id = ids(uid, p.id)
            return (
              <FilaLista
                key={p.id}
                indice={i}
                total={lista.length}
                nombre="la pregunta"
                onMover={(hacia) => setB((prev) => mover(prev, i, hacia))}
                onBorrar={() => (vacia(p) ? quitar(p.id) : setABorrar(p))}
              >
                <AreaTexto
                  id={id.pregunta}
                  label="PREGUNTA"
                  valor={p.pregunta}
                  onCambio={(v) => {
                    editar(p.id, { pregunta: v })
                    limpiarError(id.pregunta)
                  }}
                  error={errores[id.pregunta]}
                  maxLength={MAX_PREGUNTA}
                  filas={2}
                  placeholder="¿Toman mi usado como parte de pago?"
                  className="mt-3"
                />
                <AreaTexto
                  id={id.respuesta}
                  label="RESPUESTA"
                  valor={p.respuesta}
                  onCambio={(v) => {
                    editar(p.id, { respuesta: v })
                    limpiarError(id.respuesta)
                  }}
                  error={errores[id.respuesta]}
                  maxLength={MAX_RESPUESTA}
                  filas={6}
                  ayuda="Dos o tres frases. Lo demás se cierra por WhatsApp."
                  className="mt-5"
                />
              </FilaLista>
            )
          })}
        </ul>
      )}

      <BotonAgregar onClick={agregar}>AGREGAR UNA PREGUNTA</BotonAgregar>

      <BarraGuardar
        etiqueta="GUARDAR LAS PREGUNTAS"
        sucio={bloque.sucio}
        ocupado={bloque.ocupado}
        guardado={bloque.guardado}
        falla={bloque.falla}
        onGuardar={bloque.guardar}
      />

      <Dialogo
        abierto={aBorrar !== null}
        titulo={
          aBorrar?.pregunta.trim()
            ? `Vas a borrar «${aBorrar.pregunta.trim()}»`
            : 'Vas a borrar una pregunta'
        }
        confirmar="Borrar la pregunta"
        onConfirmar={() => aBorrar && quitar(aBorrar.id)}
        cancelar="No, dejarla"
        onCancelar={() => setABorrar(null)}
        tono="peligro"
      >
        <p>
          Se borra con su respuesta. Sale del sitio cuando toques «Guardar las
          preguntas»; hasta entonces, salir sin guardar la deja como estaba.
        </p>
      </Dialogo>
    </Seccion>
  )
}

export default BloquePreguntas
