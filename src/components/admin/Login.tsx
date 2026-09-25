import { useId, useRef, useState } from 'react'
import Bevel from '../Bevel'
import Header from '../Header'
import Rail from '../Rail'
import { Campo } from './Campos'
import { AvisoError } from './Marco'
import { avisoDeSalida, ErrorSesion, iniciarSesion } from '../../data/sesion'

/**
 * La puerta del panel.
 *
 * Una sola columna, centrada, sin nada más en pantalla: no hay a dónde ir
 * desde acá salvo entrar o volver al sitio por el logo.
 *
 * Si la sesión se cerró sola —venció, o se cerró desde otro lado— lo dice
 * arriba del formulario. Sin eso, la dueña aparecería acá en medio de una
 * carga sin saber qué tocó.
 */
export function Login() {
  const uid = useId()
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)
  const [aviso] = useState(avisoDeSalida)

  const refEmail = useRef<HTMLInputElement>(null)
  const refClave = useRef<HTMLInputElement>(null)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setEntrando(true)
    try {
      await iniciarSesion(email, clave)
      // No se navega a ningún lado: la ruta protegida escucha la sesión y se
      // dibuja sola en cuanto deja de ser null.
    } catch (err) {
      setError(
        err instanceof ErrorSesion
          ? err.message
          : 'No se pudo entrar. Probá de nuevo.',
      )
      // El foco va al campo del problema: en un celular, un error arriba del
      // teclado no se ve, y volver a tocar el campo es un paso más.
      if (!clave && email) refClave.current?.focus()
      else refEmail.current?.focus()
    } finally {
      setEntrando(false)
    }
  }

  return (
    <>
      <Rail index="00" label="INGRESO" />
      <Header />

      <main className="grid min-h-svh place-items-center py-24 shell">
        <div className="w-full max-w-[26rem]">
          <p className="font-hud flex items-center gap-2 text-bone/45">
            <span aria-hidden="true" className="text-amber">
              \
            </span>
            <span className="num text-amber">00</span>
            <span aria-hidden="true">—</span>
            <span>PANEL</span>
          </p>

          <h1 className="font-display-xl mt-5 text-h1-ficha text-bone">
            Entrar al panel
          </h1>
          <p className="mt-4 text-bone/65">
            Desde acá se cargan y se editan las unidades del catálogo.
          </p>

          {aviso && !error && (
            <p
              role="status"
              className="font-hud mt-8 flex gap-2 text-bone/70 normal-case"
            >
              <span aria-hidden="true" className="text-amber">
                \
              </span>
              <span>{aviso}</span>
            </p>
          )}

          <form onSubmit={enviar} noValidate className="mt-10">
            <Campo
              id={`${uid}-email`}
              ref={refEmail}
              label="EMAIL"
              type="email"
              inputMode="email"
              autoComplete="username"
              valor={email}
              onCambio={setEmail}
              placeholder="nombre@dominio.com"
            />

            <Campo
              id={`${uid}-clave`}
              ref={refClave}
              label="CONTRASEÑA"
              type="password"
              autoComplete="current-password"
              valor={clave}
              onCambio={setClave}
              className="mt-6"
            />

            {error && (
              <div className="mt-6">
                <AvisoError texto={error} />
              </div>
            )}

            <Bevel
              as="button"
              type="submit"
              variant="solid"
              bevel={14}
              disabled={entrando}
              className={`font-hud mt-8 flex min-h-[3.25rem] w-full items-center justify-center gap-3 px-6 ${
                entrando ? 'opacity-60' : ''
              }`}
            >
              <span>{entrando ? 'ENTRANDO…' : 'ENTRAR'}</span>
              <span aria-hidden="true">\</span>
            </Bevel>
          </form>
        </div>
      </main>
    </>
  )
}

export default Login
