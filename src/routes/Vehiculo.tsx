import { useParams } from 'react-router'
import PaginaInterna from '../components/PaginaInterna'

/**
 * Ficha de una unidad. Vacía a propósito: la galería, las etiquetas, el video
 * y el botón de WhatsApp con el mensaje armado son la parte 4.
 *
 * El slug se muestra en el encabezado mientras tanto: es la forma más rápida
 * de comprobar que la ruta captura el parámetro y que el rewrite de Vercel
 * deja abrir un link directo a una ficha sin pasar por el home.
 */
export function Vehiculo() {
  const { slug = '' } = useParams()

  return (
    <PaginaInterna
      indice="01"
      eyebrow="VEHÍCULO"
      titulo="Ficha de la unidad"
      lead={
        <>
          Slug: <span className="font-hud text-amber">{slug}</span>
        </>
      }
    />
  )
}

export default Vehiculo
