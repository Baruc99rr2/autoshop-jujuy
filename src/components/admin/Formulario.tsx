import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import Bevel from '../Bevel'
import ErrorCarga from '../ErrorCarga'
import { AreaTexto, Campo, CampoMiles, Interruptor, Opciones } from './Campos'
import Dialogo from './Dialogo'
import Etiquetas from './Etiquetas'
import Fotos from './Fotos'
import Marco, { AvisoError, Volver } from './Marco'
import VideoUnidad from './VideoUnidad'
import { repo } from '../../data/repo'
import { leerMiles, separarMiles, soloDigitos } from '../../lib/formato'
import { SLUG_VALIDO, slugificar } from '../../lib/texto'
import { scrollTo } from '../../lib/smooth'
import type {
  Condicion,
  EstadoVehiculo,
  Etiqueta,
  Foto,
  Vehiculo,
  Video,
} from '../../types/vehiculo'

/**
 * Cargar y editar una unidad. ES EL MISMO COMPONENTE para las dos cosas.
 *
 * Separarlos parece más prolijo y no lo es: el 90% —los campos, la
 * validación, el aviso de cambios sin guardar, el slug que sigue al título—
 * es idéntico, y lo único que cambia de verdad es qué se llama al guardar y
 * si hay algo para borrar. Con dos componentes, cada regla nueva habría que
 * escribirla dos veces y se desincronizarían al tercer cambio.
 *
 * TODOS LOS CAMPOS GUARDAN TEXTO, incluso el precio, el año y los kilómetros.
 * Mientras se escribe hay estados que no son ningún número —vacío, a medias—
 * y representarlos con `number` obliga a inventar un 0, que después se guarda
 * como precio de verdad.
 *
 * LOS MEDIOS VAN POR DOS CAMINOS DISTINTOS Y NO ES UNA INCONSISTENCIA. Las
 * fotos y el video son ARCHIVOS: se guardan apenas se eligen, contra una
 * unidad que ya existe, porque un archivo que ya viajó y se pierde al cerrar
 * la pestaña es media carga tirada. Las etiquetas son TEXTO: viven en el
 * borrador y se guardan con el botón de abajo, como el título o el precio, así
 * que arrepentirse es salir sin guardar. Por eso los tres bloques aparecen
 * recién cuando la unidad existe: sin id no hay contra qué subir un archivo.
 */

// ── Forma del borrador ────────────────────────────────────────────────────

type CampoId = 'titulo' | 'slug' | 'precio' | 'anio' | 'km' | 'descripcion'

type Errores = Partial<Record<CampoId, string>>

type Borrador = {
  titulo: string
  descripcion: string
  condicion: Condicion
  /** Con los puntos puestos: "12.500.000". Vacío es "Consultar precio". */
  precio: string
  anio: string
  km: string
  estado: EstadoVehiculo
  publicado: boolean
  destacado: boolean
  slug: string
  etiquetas: Etiqueta[]
}

const VACIO: Borrador = {
  titulo: '',
  descripcion: '',
  condicion: 'usado',
  precio: '',
  anio: '',
  km: '',
  estado: 'disponible',
  // Nace como borrador: se publica cuando tiene fotos y precio, no antes.
  publicado: false,
  destacado: false,
  slug: '',
  etiquetas: [],
}

function desdeVehiculo(v: Vehiculo): Borrador {
  return {
    titulo: v.titulo,
    descripcion: v.descripcion,
    condicion: v.condicion,
    precio: v.precio === null ? '' : separarMiles(String(v.precio)),
    anio: v.anio === null ? '' : String(v.anio),
    km: v.km === null ? '' : separarMiles(String(v.km)),
    estado: v.estado,
    publicado: v.publicado,
    destacado: v.destacado,
    slug: v.slug,
    // Ordenadas acá y no al dibujar: la lista del panel ES el orden, así que
    // subir una y guardar tiene que mandar lo que se ve, no lo que vino.
    etiquetas: [...v.etiquetas].sort((a, b) => a.orden - b.orden),
  }
}

const CONDICIONES = [
  { id: '0km' as const, label: '0 km' },
  { id: 'usado' as const, label: 'Usado' },
]

const ESTADOS = [
  { id: 'disponible' as const, label: 'Disponible' },
  { id: 'reservado' as const, label: 'Reservada' },
  { id: 'vendido' as const, label: 'Vendida' },
]

// ── Validación ────────────────────────────────────────────────────────────

/** El orden en que se recorren los campos para ir al primero con problema. */
const ORDEN: CampoId[] = ['titulo', 'slug', 'precio', 'anio', 'km', 'descripcion']

const ANIO_MIN = 1950
/** Un modelo del año que viene ya se vende en el salón, así que entra. */
const ANIO_MAX = new Date().getFullYear() + 1

/** Más de esto en el odómetro es un dedo de más, no un auto. */
const KM_MAX = 1_500_000

/**
 * Los mensajes dicen QUÉ PASÓ y CÓMO SE ARREGLA, en ese orden, y nunca
 * "campo inválido": quien está del otro lado no escribió el formulario y no
 * tiene por qué adivinar qué esperaba.
 */
function validar(b: Borrador): Errores {
  const e: Errores = {}

  if (b.titulo.trim().length < 3) {
    e.titulo =
      'Falta el título: es el nombre con el que se va a ver la unidad. Ej: «Toyota Hilux SRX 4x4».'
  }

  const slug = b.slug.trim()
  if (!slug) {
    e.slug =
      'La dirección no puede quedar vacía. Escribila o tocá «Armarla del título».'
  } else if (!SLUG_VALIDO.test(slug)) {
    e.slug =
      'La dirección solo lleva minúsculas, números y guiones, sin espacios ni acentos. Ej: «toyota-hilux-srx-2021».'
  }

  const precio = leerMiles(b.precio)
  if (precio !== null && precio < 1000) {
    e.precio =
      'Ese precio parece incompleto. Si todavía no lo definiste, dejalo vacío: en el sitio va a decir «Consultar precio».'
  }

  const anio = leerMiles(b.anio)
  if (b.anio !== '' && (anio === null || anio < ANIO_MIN || anio > ANIO_MAX)) {
    e.anio = `El año tiene que estar entre ${ANIO_MIN} y ${ANIO_MAX}. Escribilo con cuatro cifras.`
  }

  if (b.condicion === 'usado') {
    const km = leerMiles(b.km)
    if (km !== null && km > KM_MAX) {
      e.km = 'Esos kilómetros son más de los que anda un auto en toda su vida. Revisá el número.'
    }
  }

  return e
}

// ── Componente ────────────────────────────────────────────────────────────

type FormularioProps = {
  /** Sin id es una unidad nueva. */
  id?: string
}

export function Formulario({ id }: FormularioProps) {
  const uid = useId()
  const navegar = useNavigate()

  /** Lo guardado: contra esto se compara para saber si hay cambios sueltos. */
  const [base, setBase] = useState<Borrador>(VACIO)
  const [b, setB] = useState<Borrador>(VACIO)
  /** La unidad tal como está en el repositorio. `null` mientras carga o si es nueva. */
  const [guardada, setGuardada] = useState<Vehiculo | null>(null)

  const [errores, setErrores] = useState<Errores>({})
  const [falla, setFalla] = useState<string | null>(null)
  const [cargando, setCargando] = useState(Boolean(id))
  /** Abrir la unidad falló por la red, que no es lo mismo que "no existe". */
  const [fallaCarga, setFallaCarga] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [dialogo, setDialogo] = useState<null | 'salir' | 'borrar'>(null)

  /**
   * Mientras la dirección no se toque a mano, sigue al título: cargar un auto
   * no debería obligar a pensar en URLs. En cuanto se edita deja de seguirlo,
   * porque si no cada corrección del título pisaría lo escrito.
   */
  const [slugTocado, setSlugTocado] = useState(Boolean(id))

  const campos = useRef<Partial<Record<CampoId, HTMLElement | null>>>({})

  // ── Cargar lo que se va a editar ────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    let vivo = true
    ;(async () => {
      setFallaCarga(null)
      setCargando(true)
      try {
        const v = await repo.obtenerPorId(id)
        if (!vivo) return
        if (!v) {
          setFalla('Esa unidad ya no existe. Puede que la hayas borrado desde otra pestaña.')
        } else {
          const d = desdeVehiculo(v)
          setBase(d)
          setB(d)
          setGuardada(v)
        }
      } catch (err) {
        if (vivo) setFallaCarga(err instanceof Error ? err.message : 'No se pudo abrir la unidad.')
      } finally {
        if (vivo) setCargando(false)
      }
    })()
    return () => {
      vivo = false
    }
  }, [id, intento])

  const set = useCallback(<K extends keyof Borrador>(k: K, v: Borrador[K]) => {
    setB((prev) => ({ ...prev, [k]: v }))
    setAviso(null)
  }, [])

  /** Al corregir un campo, su error se va: dejarlo es decirle mal a la cara. */
  const limpiarError = useCallback((k: CampoId) => {
    setErrores((prev) => {
      if (!prev[k]) return prev
      const n = { ...prev }
      delete n[k]
      return n
    })
  }, [])

  // ── Fotos y video ───────────────────────────────────────────────────────
  // Se guardan solos, así que lo que hay que mantener al día acá es
  // `guardada`: de ahí salen el contador del diálogo de borrar, el aviso de
  // "publicada sin fotos" y las miniaturas que eligen las etiquetas.

  const ponerFotos = useCallback((fotos: Foto[]) => {
    setGuardada((v) => (v ? { ...v, fotos } : v))
  }, [])

  const ponerVideo = useCallback((video: Video | null) => {
    setGuardada((v) => (v ? { ...v, video } : v))
  }, [])

  /**
   * Una foto borrada deja sin fondo a las etiquetas que la usaban.
   *
   * El repositorio ya lo hizo del lado guardado; esto es lo mismo del lado del
   * borrador. Se toca `base` ADEMÁS de `b` a propósito: el cambio ya está
   * guardado, así que contarlo como "cambios sin guardar" sería mentir y
   * dejaría el aviso encendido sin que haya nada para guardar.
   */
  const olvidarFoto = useCallback((fotoId: string) => {
    const limpiar = (lista: Etiqueta[]) =>
      lista.map((e) => (e.fotoFondoId === fotoId ? { ...e, fotoFondoId: null } : e))
    setB((prev) => ({ ...prev, etiquetas: limpiar(prev.etiquetas) }))
    setBase((prev) => ({ ...prev, etiquetas: limpiar(prev.etiquetas) }))
  }, [])

  const escribirTitulo = (v: string) => {
    set('titulo', v)
    limpiarError('titulo')
    if (!slugTocado) {
      set('slug', slugificar(v))
      limpiarError('slug')
    }
  }

  // ── Cambios sin guardar ─────────────────────────────────────────────────

  const sucio = JSON.stringify(b) !== JSON.stringify(base)

  /**
   * El aviso al cerrar la pestaña o recargar.
   *
   * Cubre el caso que más duele —media carga perdida por un toque en la barra
   * de direcciones— y NO cubre el botón atrás del navegador: `useBlocker` de
   * react-router solo existe en un data router, y este sitio usa
   * `BrowserRouter`. La salida de adentro del panel (el "volver al listado" y
   * el "cancelar") sí pasa por el diálogo de acá abajo, que es por donde se
   * sale el 99% de las veces.
   */
  useEffect(() => {
    if (!sucio) return
    const alSalir = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', alSalir)
    return () => window.removeEventListener('beforeunload', alSalir)
  }, [sucio])

  const salir = () => {
    if (sucio) setDialogo('salir')
    else navegar('/admin')
  }

  // ── Guardar ─────────────────────────────────────────────────────────────

  const enfocar = (k: CampoId) => {
    const nodo = campos.current[k]
    if (!nodo) return
    nodo.focus({ preventScroll: true })
    scrollTo(nodo, -140)
  }

  const guardar = async () => {
    setFalla(null)
    setAviso(null)

    const errs = validar(b)

    // La unicidad se pregunta al repositorio y no se deduce del listado: entre
    // que se abrió el formulario y que se aprieta guardar pudo entrar otra
    // unidad, y el repositorio es el único que sabe la verdad.
    const slug = b.slug.trim()
    if (!errs.slug && slug) {
      try {
        const otra = await repo.obtenerPorSlug(slug)
        if (otra && otra.id !== id) {
          errs.slug = `Esa dirección ya la usa «${otra.titulo}». Agregale el año o la versión para diferenciarlas.`
        }
      } catch {
        /* si el repositorio falla, falla el guardado de abajo y se dice ahí */
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrores(errs)
      const primero = ORDEN.find((k) => errs[k])
      if (primero) enfocar(primero)
      return
    }

    setErrores({})
    setOcupado(true)
    try {
      const datos = {
        titulo: b.titulo.trim(),
        descripcion: b.descripcion.trim(),
        condicion: b.condicion,
        precio: leerMiles(b.precio),
        anio: leerMiles(b.anio),
        // Un 0km tiene 0 km, no "no sé": el campo está oculto justamente
        // porque la respuesta ya la da la condición.
        km: b.condicion === '0km' ? 0 : leerMiles(b.km),
        estado: b.estado,
        publicado: b.publicado,
        destacado: b.destacado,
        slug,
        // Se renumera al guardar: el orden de la lista manda sobre el campo,
        // que después es por el que ordena la ficha.
        etiquetas: b.etiquetas.map((e, i) => ({
          ...e,
          titulo: e.titulo.trim(),
          texto: e.texto.trim(),
          orden: i,
        })),
      }

      if (id) {
        const v = await repo.actualizar(id, datos)
        // Se relee DE LO QUE DEVOLVIÓ el repositorio y no de lo que se mandó:
        // si el slug se tuvo que desempatar, el formulario tiene que mostrar
        // el que quedó guardado y no el que se pidió.
        const d = desdeVehiculo(v)
        setBase(d)
        setB(d)
        setGuardada(v)
        setAviso('Listo, se guardaron los cambios.')
      } else {
        const v = await repo.crear(datos)
        // Se pasa a la dirección de edición: de acá en adelante hay algo que
        // editar y algo que borrar. `replace` para que el atrás del navegador
        // no vuelva al formulario vacío.
        navegar(`/admin/editar/${v.id}`, { replace: true })
      }
    } catch (err) {
      setFalla(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar. Probá de nuevo en un momento.',
      )
    } finally {
      setOcupado(false)
    }
  }

  const borrar = async () => {
    if (!id) return
    setOcupado(true)
    try {
      await repo.eliminar(id)
      navegar('/admin', { replace: true })
    } catch (err) {
      setDialogo(null)
      setFalla(err instanceof Error ? err.message : 'No se pudo borrar la unidad.')
    } finally {
      setOcupado(false)
    }
  }

  // ── Pantalla ────────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <Marco
        indice="01"
        eyebrow="PANEL"
        titulo="Abriendo la unidad…"
        ancho="formulario"
        arriba={<Volver onVolver={() => navegar('/admin')} />}
      >
        <FormularioEsqueleto />
      </Marco>
    )
  }

  if (fallaCarga) {
    return (
      <Marco
        indice="01"
        eyebrow="PANEL"
        titulo="Editar unidad"
        ancho="formulario"
        arriba={<Volver onVolver={() => navegar('/admin')} />}
      >
        <ErrorCarga
          className="mt-8"
          titulo="No pude abrir esta unidad"
          texto={fallaCarga}
          onReintentar={() => setIntento((n) => n + 1)}
        />
      </Marco>
    )
  }

  if (id && !guardada) {
    return (
      <Marco
        indice="01"
        eyebrow="PANEL"
        titulo="No encontré esa unidad"
        ancho="formulario"
        arriba={<Volver onVolver={() => navegar('/admin')} />}
      >
        <div className="mt-8">
          <AvisoError texto={falla ?? 'Esa unidad ya no está en el catálogo.'} />
        </div>
      </Marco>
    )
  }

  const esUsado = b.condicion === 'usado'

  return (
    <Marco
      indice="01"
      eyebrow="PANEL"
      titulo={id ? 'Editar unidad' : 'Nueva unidad'}
      lead={
        id
          ? 'Los cambios se ven en el sitio apenas guardás.'
          : 'Con el título alcanza para empezar. Podés dejarla en borrador y publicarla cuando tengas las fotos.'
      }
      ancho="formulario"
      arriba={<Volver onVolver={salir} />}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          guardar()
        }}
        noValidate
        className="mt-10"
      >
        <Campo
          id={`${uid}-titulo`}
          ref={(n) => {
            campos.current.titulo = n
          }}
          label="TÍTULO"
          valor={b.titulo}
          onCambio={escribirTitulo}
          error={errores.titulo}
          ayuda="Marca, modelo y versión, como lo diría un cliente."
          placeholder="Toyota Hilux SRX 4x4"
          maxLength={90}
        />

        <Campo
          id={`${uid}-slug`}
          ref={(n) => {
            campos.current.slug = n
          }}
          label="DIRECCIÓN EN EL SITIO"
          valor={b.slug}
          onCambio={(v) => {
            setSlugTocado(true)
            set('slug', v)
            limpiarError('slug')
          }}
          error={errores.slug}
          prefijo="/vehiculo/"
          monoespaciado
          ayuda={
            <>
              Se arma sola del título. Cambiala solo si hace falta: si ya
              mandaste el link por WhatsApp, cambiarla rompe el que mandaste.
              {/* En su propio renglón y con 44 px de alto: metido al final
                  de la frase era un blanco de una línea de texto, que con el
                  pulgar se falla. */}
              {slugTocado && (
                <button
                  type="button"
                  onClick={() => {
                    setSlugTocado(false)
                    set('slug', slugificar(b.titulo))
                    limpiarError('slug')
                  }}
                  className="flex min-h-[2.75rem] items-center pr-3 text-amber underline-offset-4 hover:underline focus-visible:underline"
                >
                  Armarla del título
                </button>
              )}
            </>
          }
          className="mt-8"
        />

        <Opciones
          label="CONDICIÓN"
          valor={b.condicion}
          opciones={CONDICIONES}
          onCambio={(v) => set('condicion', v)}
          ayuda={
            esUsado
              ? 'Los kilómetros se cargan abajo.'
              : 'Una unidad 0 km se publica con 0 km; el campo de kilómetros no hace falta.'
          }
          className="mt-8"
        />

        <CampoMiles
          id={`${uid}-precio`}
          ref={(n) => {
            campos.current.precio = n
          }}
          label="PRECIO"
          valor={b.precio}
          onCambio={(v) => {
            set('precio', v)
            limpiarError('precio')
          }}
          error={errores.precio}
          prefijo="$"
          placeholder="Consultar precio"
          ayuda={
            b.precio
              ? 'En pesos. Se muestra con los puntos, tal como lo ves acá.'
              : 'Vacío: en el sitio va a decir «Consultar precio».'
          }
          className="mt-8"
        />

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <Campo
            id={`${uid}-anio`}
            ref={(n) => {
              campos.current.anio = n
            }}
            label="AÑO"
            valor={b.anio}
            onCambio={(v) => {
              set('anio', soloDigitos(v).slice(0, 4))
              limpiarError('anio')
            }}
            error={errores.anio}
            inputMode="numeric"
            maxLength={4}
            monoespaciado
            placeholder="2021"
            ayuda="Cuatro cifras. Se puede dejar vacío."
          />

          {/* El campo se ESCONDE con 0 km y no se borra: si la condición se
              cambió por error, volver atrás devuelve lo que ya estaba escrito
              en vez de obligar a tipearlo de nuevo. Lo que se guarda en un
              0 km es 0, mire lo que mire este campo. */}
          {esUsado && (
            <CampoMiles
              id={`${uid}-km`}
              ref={(n) => {
                campos.current.km = n
              }}
              label="KILÓMETROS"
              valor={b.km}
              onCambio={(v) => {
                set('km', v)
                limpiarError('km')
              }}
              error={errores.km}
              sufijo="KM"
              placeholder="45.000"
              ayuda="Vacío: en la ficha va a aparecer un guión."
            />
          )}
        </div>

        <AreaTexto
          id={`${uid}-descripcion`}
          ref={(n) => {
            campos.current.descripcion = n
          }}
          label="DESCRIPCIÓN"
          valor={b.descripcion}
          onCambio={(v) => set('descripcion', v)}
          error={errores.descripcion}
          placeholder="Único dueño, service oficial al día, cubiertas nuevas…"
          ayuda="Dos o tres frases. El detalle fino se cierra por WhatsApp."
          className="mt-8"
        />

        {/* ── Fotos, video y etiquetas ──────────────────────────────────
            Solo con la unidad creada: una foto se sube CONTRA un id, y las
            etiquetas eligen su fondo entre fotos que todavía no existen. */}
        {id && guardada ? (
          <div className="mt-10 grid grid-cols-1 gap-10">
            <Fotos
              vehiculoId={guardada.id}
              fotos={guardada.fotos}
              onFotos={ponerFotos}
              onFotoBorrada={olvidarFoto}
            />

            <VideoUnidad
              vehiculoId={guardada.id}
              video={guardada.video}
              onVideo={ponerVideo}
              hayFotos={guardada.fotos.length > 0}
            />

            <Etiquetas
              etiquetas={b.etiquetas}
              fotos={guardada.fotos}
              onCambio={(etiquetas) => set('etiquetas', etiquetas)}
            />
          </div>
        ) : (
          <section className="mt-10 border-t border-graphite pt-8">
            <h2 className="font-hud text-bone/55">FOTOS, VIDEO Y ETIQUETAS</h2>
            <p className="font-hud mt-2 flex gap-2 text-bone/40 normal-case">
              <span aria-hidden="true" className="text-amber">
                              </span>
              <span>
                Se cargan acá mismo apenas crees la unidad. Tocá «Crear unidad»
                abajo y la pantalla sigue abierta, con los tres bloques puestos.
              </span>
            </p>
          </section>
        )}

        <Opciones
          label="ESTADO"
          className="mt-10"
          valor={b.estado}
          opciones={ESTADOS}
          onCambio={(v) => set('estado', v)}
          ayuda="Reservada y vendida salen con el cartel rojo; la vendida se va al final del catálogo."
        />

        <div className="mt-8 grid gap-4">
          <Interruptor
            id={`${uid}-publicado`}
            label={b.publicado ? 'Publicada' : 'Borrador'}
            ayuda={
              b.publicado
                ? 'Se ve en el catálogo del sitio.'
                : 'Solo se ve acá, en el panel. No sale en el sitio.'
            }
            valor={b.publicado}
            onCambio={(v) => set('publicado', v)}
          />

          <Interruptor
            id={`${uid}-destacado`}
            label="Destacada en la portada"
            ayuda="Aparece en la sección de vehículos del inicio. Tiene que estar publicada."
            valor={b.destacado}
            onCambio={(v) => set('destacado', v)}
          />
        </div>

        {/* Un aviso, no un error: publicar sin fotos es una decisión válida
            —la unidad existe y el precio también— pero conviene saber cómo se
            va a ver antes de mandar el link. */}
        {b.publicado && guardada && guardada.fotos.length === 0 && (
          <p className="font-hud mt-6 flex gap-2 text-bone/45 normal-case">
            <span aria-hidden="true" className="text-amber">
              \
            </span>
            <span>
              Esta unidad todavía no tiene fotos: en el catálogo va a salir con
              el cartel «Sin fotos todavía». Cargalas más arriba, en FOTOS.
            </span>
          </p>
        )}

        {falla && (
          <div className="mt-8">
            <AvisoError texto={falla} />
          </div>
        )}

        {/* ── Barra de guardar ──────────────────────────────────────────
            Pegada abajo: el formulario mide dos pantallas y media en un
            celular, y un botón de guardar al final obliga a scrollear a
            ciegas cada vez que se corrige algo de arriba. */}
        <div className="sticky bottom-0 z-10 mt-10 border-t border-graphite bg-void/95 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <Bevel
              as="button"
              type="submit"
              variant="solid"
              bevel={12}
              disabled={ocupado}
              className={`font-hud flex min-h-[3.25rem] flex-1 items-center justify-center gap-3 px-6 ${
                ocupado ? 'opacity-60' : ''
              }`}
            >
              <span>{ocupado ? 'GUARDANDO…' : id ? 'GUARDAR CAMBIOS' : 'CREAR UNIDAD'}</span>
              <span aria-hidden="true">\</span>
            </Bevel>

            <p
              className="font-hud hidden shrink-0 text-bone/40 sm:block"
              aria-live="polite"
            >
              {sucio ? 'CAMBIOS SIN GUARDAR' : aviso ? 'GUARDADO' : ''}
            </p>
          </div>

          {/* En mobile el estado va abajo del botón: al lado no entra sin
              dejar el botón de guardar en la mitad del ancho. */}
          <p className="font-hud mt-3 text-bone/40 sm:hidden" aria-live="polite">
            {sucio ? 'CAMBIOS SIN GUARDAR' : aviso ? 'GUARDADO' : ''}
          </p>
        </div>
      </form>

      {/* ── Lo que se hace con una unidad que ya existe ──────────────── */}
      {id && guardada && (
        <div className="mt-12 border-t border-graphite pt-8">
          <p className="font-hud text-bone/45">ESTA UNIDAD</p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            {base.publicado ? (
              <Bevel
                as="a"
                href={`/vehiculo/${base.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                bevel={12}
                borderClassName="bg-graphite"
                outerClassName="transition-colors duration-200 hover:bg-amber"
                className="font-hud flex min-h-[3rem] items-center justify-center gap-3 px-5 text-bone"
              >
                <span>VER EN LA WEB</span>
                <span aria-hidden="true">\</span>
              </Bevel>
            ) : (
              <p className="font-hud text-bone/40 normal-case">
                Mientras esté en borrador no se puede abrir la ficha pública:
                publicala para verla en el sitio.
              </p>
            )}

            <button
              type="button"
              onClick={() => setDialogo('borrar')}
              className="font-hud min-h-[3rem] px-2 text-left text-flag underline-offset-4 transition-opacity duration-200 hover:underline focus-visible:underline sm:ml-auto sm:text-right"
            >
              ELIMINAR ESTA UNIDAD
            </button>
          </div>
        </div>
      )}

      {/* ── Diálogos ────────────────────────────────────────────────── */}
      <Dialogo
        abierto={dialogo === 'salir'}
        titulo="Tenés cambios sin guardar"
        confirmar="Salir sin guardar"
        onConfirmar={() => {
          setDialogo(null)
          navegar('/admin')
        }}
        cancelar="Seguir editando"
        onCancelar={() => setDialogo(null)}
      >
        <p>
          Si salís ahora se pierde lo que escribiste desde la última vez que
          guardaste. No se borra nada de lo que ya estaba guardado.
        </p>
      </Dialogo>

      <Dialogo
        abierto={dialogo === 'borrar'}
        titulo={`Vas a borrar «${guardada?.titulo ?? ''}»`}
        confirmar="Borrar la unidad"
        onConfirmar={borrar}
        cancelar="No, dejarla"
        onCancelar={() => setDialogo(null)}
        tono="peligro"
        ocupado={ocupado}
      >
        <p>Se borra la ficha entera y con ella, de una vez:</p>
        <ul className="font-hud grid gap-1.5 text-bone/60 normal-case">
          <li>
            <span aria-hidden="true" className="mr-2 text-flag">
              \
            </span>
            {guardada?.fotos.length ?? 0}{' '}
            {(guardada?.fotos.length ?? 0) === 1 ? 'foto' : 'fotos'}
            {guardada?.video ? ' y el video' : ''}
          </li>
          <li>
            <span aria-hidden="true" className="mr-2 text-flag">
              \
            </span>
            {guardada?.etiquetas.length ?? 0}{' '}
            {(guardada?.etiquetas.length ?? 0) === 1 ? 'etiqueta' : 'etiquetas'} de
            la ficha
          </li>
          <li>
            <span aria-hidden="true" className="mr-2 text-flag">
              \
            </span>
            <span className="num">/vehiculo/{guardada?.slug}</span>, que deja de
            funcionar
          </li>
        </ul>
        <p>
          Cualquier link de esta unidad que hayas mandado por WhatsApp va a
          llevar a una página de error. Si la vendiste y querés conservarla,
          marcala como «Vendida» en vez de borrarla.
        </p>
      </Dialogo>
    </Marco>
  )
}

/**
 * La forma del formulario mientras llega la unidad: los primeros campos, con
 * su alto real. Un título solo en una pantalla negra se lee como colgado.
 */
function FormularioEsqueleto() {
  return (
    <div className="mt-10 grid animate-pulse grid-cols-1 gap-8" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i}>
          <div className="h-3.5 w-24 bg-graphite/60" />
          <div className="mt-3 h-[3.25rem] bg-graphite/40" />
          <div className="mt-2.5 h-3 w-2/3 bg-graphite/25" />
        </div>
      ))}
      <div className="h-40 bg-graphite/25" />
    </div>
  )
}

export default Formulario
