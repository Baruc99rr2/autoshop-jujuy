import PaginaInterna from '../components/PaginaInterna'

/**
 * Catálogo completo. Vacío a propósito: la grilla, los filtros y la paginación
 * son la parte 3. Lo que ya está es la ruta, el marco y el título, para poder
 * linkear acá desde el menú, el footer y la sección Vehículos del home.
 */
export function Catalogo() {
  return (
    <PaginaInterna
      indice="01"
      eyebrow="CATÁLOGO"
      titulo="Todas las unidades"
      lead="Acá va a estar el stock completo, con filtros por condición, precio y estado."
    />
  )
}

export default Catalogo
