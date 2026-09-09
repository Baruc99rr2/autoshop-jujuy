import type { CSSProperties } from 'react'
import { CONTACTO } from '../data/contacto'
import { FOOTER } from '../data/nav'
import { scrollTo } from '../lib/smooth'

/**
 * Footer escalonado.
 *
 * La firma del bloque es la sangría creciente por ítem: cada link entra un
 * poco más que el anterior, así que la columna dibuja una diagonal y rima con
 * el `\` del riel. Se mantiene en mobile — sin el escalonado, el bloque es una
 * lista de links cualquiera.
 */
export function Footer() {
  const año = new Date().getFullYear()

  return (
    <footer
      id="footer"
      className="relative overflow-hidden border-t border-graphite bg-void pt-24 pb-10 shell"
    >
      {/* El logotipo a ancho completo. `\` en ámbar como separador: es el mismo
          marcador del riel, y ata el footer al resto de la página. */}
      <h2 className="font-hero text-bone" style={{ fontSize: 'clamp(2rem, 11.4vw, 13rem)' }}>
        AutoShop
        <span className="text-amber" aria-hidden="true">
          \
        </span>
        Jujuy
      </h2>

      <p className="mt-8 max-w-[46ch] text-bone/55">
        0km y usados en {CONTACTO.ciudad}. Financiación propia, Fiat Plan y
        toma de tu usado como parte de pago.
      </p>

      <div className="mt-20 grid gap-14 md:grid-cols-3 md:gap-8">
        {FOOTER.map((col) => (
          <nav key={col.titulo} aria-label={col.titulo}>
            <h3 className="font-hud flex items-center gap-2 text-bone/40">
              <span className="text-amber" aria-hidden="true">
                \
              </span>
              {col.titulo}
            </h3>

            <ul className="mt-6 space-y-1.5">
              {col.items.map((item, i) => (
                <li
                  key={item.label}
                  className="stagger-item"
                  style={{ '--i': i } as CSSProperties}
                >
                  <a
                    className="stagger-link"
                    href={item.href}
                    target={item.externo ? '_blank' : undefined}
                    rel={item.externo ? 'noreferrer noopener' : undefined}
                    onClick={
                      item.externo
                        ? undefined
                        : (e) => {
                            e.preventDefault()
                            scrollTo(item.href)
                          }
                    }
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mt-24 flex flex-col gap-5 border-t border-graphite pt-8 md:flex-row md:items-baseline md:justify-between">
        <p className="font-hud text-bone/40">
          © {año} {CONTACTO.nombreLegal}
        </p>

        <button
          type="button"
          className="stagger-link font-hud self-start text-bone/70 md:self-auto"
          onClick={() => scrollTo(0)}
        >
          Volver arriba ↑
        </button>
      </div>

      {/* La nota va visible, no escondida en letra chica ilegible: en la
          reunión se aclara de palabra y acá queda por escrito. */}
      <p className="font-hud mt-6 max-w-[60ch] text-bone/35">
        Sitio de demostración — unidades, precios y datos de contacto son de
        muestra.
      </p>
    </footer>
  )
}

export default Footer
