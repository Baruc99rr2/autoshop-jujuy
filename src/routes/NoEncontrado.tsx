import PaginaInterna from '../components/PaginaInterna'

/**
 * 404 propio.
 *
 * Existe porque `vercel.json` reescribe TODAS las URLs a `/index.html`: sin
 * esta ruta comodín, un link viejo o mal tipeado devolvería un 200 con la
 * pantalla en blanco, que es peor que un 404.
 */
export function NoEncontrado() {
  return (
    <PaginaInterna
      indice="00"
      eyebrow="NO ENCONTRADO"
      titulo="Esta página no existe"
      lead="Puede que la unidad ya se haya vendido y la ficha se haya dado de baja. Mirá el catálogo o escribinos por WhatsApp."
    />
  )
}

export default NoEncontrado
