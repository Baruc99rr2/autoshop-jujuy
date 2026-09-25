import { useCallback, useEffect, useRef, useState } from 'react'
import { olvidarContenido } from '../../lib/contenido'
import { scrollTo } from '../../lib/smooth'

/**
 * El estado de los bloques de «Contenido del sitio» y las ayudas de sus
 * listas. Los componentes están en `Bloque.tsx`.
 */

/** Campo con error → mensaje. La clave es el `id` del campo en el DOM. */
export type Errores = Record<string, string>

type Preparado<T> = { datos: T; errores: Errores }

/**
 * El estado de un bloque: lo guardado (`base`), lo que se está editando
 * (`b`), y el guardado.
 *
 * `preparar` limpia el borrador —recorta espacios, descarta filas vacías— y
 * dice qué falta. Si falta algo, el foco va al primer campo con error, como
 * en el formulario de una unidad.
 */
export function useBloque<B, T>({
  inicial,
  preparar,
  enviar,
  aBorrador,
  onSucio,
}: {
  inicial: B
  preparar: (b: B) => Preparado<T>
  enviar: (datos: T) => Promise<T>
  aBorrador: (datos: T) => B
  onSucio: (sucio: boolean) => void
}) {
  const [base, setBase] = useState(inicial)
  const [b, setBorrador] = useState(inicial)
  const [errores, setErrores] = useState<Errores>({})
  const [ocupado, setOcupado] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [falla, setFalla] = useState<string | null>(null)

  const sucio = JSON.stringify(b) !== JSON.stringify(base)
  useEffect(() => onSucio(sucio), [sucio, onSucio])

  const setB = (siguiente: B | ((prev: B) => B)) => {
    setBorrador(siguiente)
    setGuardado(false)
  }

  /** Al corregir un campo, su error se va. */
  const limpiarError = (id: string) =>
    setErrores((prev) => {
      if (!prev[id]) return prev
      const n = { ...prev }
      delete n[id]
      return n
    })

  const guardar = async () => {
    setFalla(null)
    const { datos, errores: errs } = preparar(b)
    setErrores(errs)
    const primero = Object.keys(errs)[0]
    if (primero) {
      const nodo = document.getElementById(primero)
      if (nodo) {
        nodo.focus({ preventScroll: true })
        scrollTo(nodo, -140)
      }
      return
    }

    setOcupado(true)
    try {
      const vuelta = aBorrador(await enviar(datos))
      setBase(vuelta)
      setBorrador(vuelta)
      setGuardado(true)
      // El inicio lee de un pedido compartido; sin esto, ir al sitio desde
      // esta misma pestaña mostraría lo de antes de guardar.
      olvidarContenido()
    } catch (err) {
      setFalla(err instanceof Error ? err.message : 'No se pudo guardar. Probá de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  return { b, setB, errores, limpiarError, sucio, ocupado, guardado, falla, guardar }
}

/** Mueve un elemento de `desde` a `hacia`. Fuera de rango, no hace nada. */
export function mover<T>(lista: T[], desde: number, hacia: number): T[] {
  if (hacia < 0 || hacia >= lista.length) return lista
  const n = [...lista]
  const [sacado] = n.splice(desde, 1)
  n.splice(hacia, 0, sacado)
  return n
}

let contador = 0
/** Id de una fila nueva. El repositorio lo conserva. */
export const idNuevo = (prefijo: string) =>
  `${prefijo}-${Date.now().toString(36)}-${contador++}`

/**
 * Enfoca el primer campo de una fila recién agregada.
 *
 * Tocar «agregar» y tener que buscar dónde quedó la fila nueva —diez
 * servicios más abajo— es el paso que se ahorra.
 */
export function useEnfocarNueva(): (id: string) => void {
  // Un ref y no un estado: lo único que hace falta es que el efecto, que
  // corre después de cada render, encuentre anotado a quién enfocar. Es el
  // mismo truco del cursor de `CampoMiles`.
  const pendiente = useRef<string | null>(null)
  useEffect(() => {
    const id = pendiente.current
    pendiente.current = null
    if (!id) return
    const nodo = document.getElementById(id)
    if (nodo) {
      nodo.focus({ preventScroll: true })
      scrollTo(nodo, -140)
    }
  })
  return useCallback((id: string) => {
    pendiente.current = id
  }, [])
}
