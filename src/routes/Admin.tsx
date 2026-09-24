import { Navigate, Route, Routes, useLocation, useParams } from 'react-router'
import Contenido from '../components/admin/Contenido'
import Formulario from '../components/admin/Formulario'
import Listado from '../components/admin/Listado'
import Login from '../components/admin/Login'
import Marco from '../components/admin/Marco'
import { useSesion } from '../data/sesion'

/**
 * El panel de carga.
 *
 * TIENE SUS PROPIAS RUTAS, colgadas de `/admin/*`: `/admin` es el listado,
 * `/admin/nuevo` el formulario vacío, `/admin/editar/:id` el de una unidad y
 * `/admin/contenido` los números, servicios y preguntas del inicio.
 * Podrían ser tres estados de un mismo componente y sería peor: la dueña
 * trabaja desde el celular, donde el gesto de volver es el del sistema
 * operativo, y sin rutas de verdad ese gesto la sacaría del panel entero en
 * vez de devolverla al listado.
 *
 * Todo el panel cuelga de un `lazy()` en `App`, así que su código
 * —formularios, validación, diálogos— no viaja en el bundle de quien entra
 * desde WhatsApp a ver un auto.
 *
 * NO usa `PaginaInterna`: el marco del panel es `components/admin/Marco`, sin
 * malla, sin menú, sin footer y sin flotante. Ver ahí por qué.
 */

/**
 * La puerta.
 *
 * Sin sesión, CUALQUIER dirección del panel lleva al login, incluido un link
 * guardado directo a la edición de una unidad. `replace` para que el atrás no
 * quede rebotando entre el login y la página a la que no se podía entrar. La
 * dirección pedida viaja en el `state`, y al entrar se vuelve ahí: si la
 * sesión venció en medio de una edición, la dueña vuelve a esa unidad y no al
 * listado.
 *
 * Que la protección viva en el cliente no la hace una barrera de seguridad:
 * lo que impide leer un borrador o tocar el stock son las políticas de fila de
 * Supabase. Esto evita mostrar un panel vacío a quien no inició sesión.
 */
function Protegida({ children }: { children: React.ReactNode }) {
  const sesion = useSesion()
  const donde = useLocation()
  // Con Supabase la sesión se lee de forma asíncrona: mientras tanto, el
  // marco del panel sin nada adentro. Mandar al login en ese medio segundo
  // sería echar a alguien que sí tiene la sesión abierta.
  if (sesion === undefined) return <Abriendo />
  if (!sesion) {
    return <Navigate to="/admin/login" replace state={{ desde: donde.pathname }} />
  }
  return <>{children}</>
}

function Abriendo() {
  return (
    <Marco indice="01" eyebrow="PANEL" titulo="Abriendo el panel…">
      <p className="font-hud mt-8 animate-pulse text-bone/45" aria-live="polite">
        REVISANDO TU SESIÓN…
      </p>
    </Marco>
  )
}

/** A dónde volver después de entrar: la página pedida, si era del panel. */
function destinoTrasEntrar(state: unknown): string {
  const desde = (state as { desde?: unknown } | null)?.desde
  return typeof desde === 'string' && desde.startsWith('/admin') && desde !== '/admin/login'
    ? desde
    : '/admin'
}

/** El formulario necesita el id de la URL; el `key` lo remonta al cambiar. */
function Editar() {
  const { id } = useParams()
  return <Formulario key={id} id={id} />
}

export function Admin() {
  const sesion = useSesion()
  const donde = useLocation()

  return (
    <Routes>
      {/* Con la sesión abierta, el login no tiene nada que hacer: se cae al
          listado. Si no, entrar y quedarse mirando el formulario de ingreso
          sería la forma más rápida de creer que no funcionó. */}
      <Route
        path="login"
        element={
          sesion === undefined ? (
            <Abriendo />
          ) : sesion ? (
            <Navigate to={destinoTrasEntrar(donde.state)} replace />
          ) : (
            <Login />
          )
        }
      />

      <Route
        index
        element={
          <Protegida>
            <Listado />
          </Protegida>
        }
      />

      <Route
        path="nuevo"
        element={
          <Protegida>
            <Formulario />
          </Protegida>
        }
      />

      <Route
        path="editar/:id"
        element={
          <Protegida>
            <Editar />
          </Protegida>
        }
      />

      <Route
        path="contenido"
        element={
          <Protegida>
            <Contenido />
          </Protegida>
        }
      />

      {/* Una dirección inventada dentro del panel vuelve al listado, no al 404
          del sitio: quien está acá adentro está trabajando. */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

export default Admin
