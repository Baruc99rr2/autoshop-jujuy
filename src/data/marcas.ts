/**
 * Las marcas se listan por nombre, en tipografía. **No se usan logos**:
 * recrearlos en SVG da resultados imprecisos y es un problema de marca
 * registrada, y una grilla de logos ajenos rompería el lenguaje del sitio.
 *
 * Son ocho de las doce que dice la franja de contadores: las que más se
 * entregan. El texto de la sección lo aclara para que los dos números no se
 * contradigan.
 */
export interface Marca {
  /** Clave estable para el estado de "encendida". */
  id: string
  /** Nombre tal como se muestra. La utilidad `font-hero` lo pasa a mayúsculas. */
  nombre: string
}

export const MARCAS: Marca[] = [
  { id: 'fiat', nombre: 'Fiat' },
  { id: 'peugeot', nombre: 'Peugeot' },
  { id: 'volkswagen', nombre: 'Volkswagen' },
  { id: 'toyota', nombre: 'Toyota' },
  { id: 'chevrolet', nombre: 'Chevrolet' },
  { id: 'renault', nombre: 'Renault' },
  { id: 'ford', nombre: 'Ford' },
  { id: 'citroen', nombre: 'Citroën' },
]
