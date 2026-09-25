import { Link } from 'react-router'
import Bevel from '../components/Bevel'
import PaginaInterna from '../components/PaginaInterna'
import { whatsappUrl } from '../data/contacto'
import { useContacto } from '../lib/contenido'

/**
 * 404 propio.
 *
 * Existe porque `vercel.json` reescribe TODAS las URLs a `/index.html`: sin
 * esta ruta comodín, un link viejo o mal tipeado devolvería un 200 con la
 * pantalla en blanco, que es peor que un 404.
 *
 * Lo usan dos casos: una dirección inventada y una ficha que no se puede
 * mostrar —slug inexistente o unidad en borrador—. Por eso el texto habla de
 * una unidad dada de baja: en este sitio esa es, de lejos, la razón más
 * probable de que alguien caiga acá, casi siempre desde un link de WhatsApp
 * reenviado semanas después.
 *
 * Y por eso lleva salida. Un 404 sin a dónde ir es una puerta cerrada: el
 * catálogo es lo que esta persona venía a ver, y WhatsApp es donde se puede
 * preguntar por la unidad que ya no está.
 */
export function NoEncontrado() {
  const { whatsapp } = useContacto()
  return (
    <PaginaInterna
      indice="00"
      eyebrow="NO ENCONTRADO"
      titulo="Esta página no existe"
      lead="Puede que la unidad ya se haya vendido y la ficha se haya dado de baja. Mirá el catálogo o escribinos por WhatsApp."
    >
      <div className="mt-10 flex flex-wrap gap-3">
        <Bevel
          as={Link}
          to="/catalogo"
          variant="solid"
          bevel={12}
          className="font-hud flex items-center gap-3 px-5 py-3.5"
        >
          <span>VER EL CATÁLOGO</span>
          <span aria-hidden="true">\</span>
        </Bevel>

        <Bevel
          as="a"
          href={whatsappUrl(whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          bevel={12}
          outerClassName="inline-block transition-colors duration-200 hover:bg-amber"
          className="font-hud px-5 py-3.5 text-bone"
        >
          PREGUNTAR POR WHATSAPP
        </Bevel>
      </div>
    </PaginaInterna>
  )
}

export default NoEncontrado
