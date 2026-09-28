import { plano } from '../lib/texto'

/**
 * Las marcas se listan por nombre, en tipografía. **No se usan logos**:
 * recrearlos en SVG da resultados imprecisos y es un problema de marca
 * registrada, y una grilla de logos ajenos rompería el lenguaje del sitio.
 *
 * LA SECCIÓN MUESTRA SOLO LAS MARCAS QUE HAY EN EL CATÁLOGO. La marca no es un
 * campo del vehículo: se deduce del título ("Toyota Hilux SRX" → Toyota). Este
 * diccionario son las marcas que se venden en Argentina; en tiempo de
 * ejecución `marcasEnTitulos` se queda con las que aparecen en los títulos de
 * las unidades publicadas. Una marca nueva que no esté acá no aparece hasta
 * que se agregue a la lista.
 *
 * No tiene nada que ver con el contador "marcas" de la franja amarilla: ese
 * número lo edita la dueña en el panel.
 */
export interface Marca {
  /** Clave estable para el estado de "encendida". */
  id: string
  /** Nombre tal como se muestra. La utilidad `font-hero` lo pasa a mayúsculas. */
  nombre: string
  /**
   * Cómo puede aparecer en un título, ya sin tildes ni mayúsculas y con los
   * guiones pasados a espacios. La primera es el nombre mismo.
   */
  alias: string[]
}

const m = (nombre: string, ...otros: string[]): Marca => {
  const base = normalizar(nombre)
  return { id: base.replace(/ /g, '-'), nombre, alias: [base, ...otros] }
}

/** Sin tildes, en minúsculas, y todo lo que no es letra o número a un espacio. */
function normalizar(texto: string): string {
  return plano(texto).replace(/[^a-z0-9]+/g, ' ').trim()
}

/** El orden de esta lista es el orden en que se muestran. */
export const DICCIONARIO_MARCAS: Marca[] = [
  m('Toyota'),
  m('Volkswagen', 'vw'),
  m('Fiat'),
  m('Chevrolet'),
  m('Ford'),
  m('Renault'),
  m('Peugeot'),
  m('Citroën'),
  m('Nissan'),
  m('Jeep'),
  m('RAM'),
  m('Honda'),
  m('Hyundai'),
  m('Kia'),
  m('Mercedes-Benz', 'mercedes', 'mb'),
  m('BMW'),
  m('Audi'),
  m('Suzuki'),
  m('Mitsubishi'),
  m('Chery'),
  m('Dodge'),
  m('Chrysler'),
  m('Subaru'),
  m('Mazda'),
  m('Volvo'),
  m('Land Rover'),
  m('Jaguar'),
  m('Porsche'),
  m('Mini'),
  m('Alfa Romeo'),
  m('DS', 'ds automobiles'),
  m('Lexus'),
  m('Isuzu'),
  m('Iveco'),
  m('JAC'),
  m('BAIC'),
  m('Haval'),
  m('Great Wall', 'gwm'),
  m('BYD'),
  m('Geely'),
  m('DFSK'),
  m('Lifan'),
  m('SsangYong', 'ssang yong', 'kgm'),
  m('Smart'),
]

/**
 * Las marcas del diccionario que aparecen en al menos uno de los títulos.
 *
 * Se compara por PALABRA ENTERA, con espacios alrededor: así "ram" encuentra
 * "RAM 1500" pero no "Ramírez", y "mini" no se prende con "Minibus". Las de
 * dos palabras ("Land Rover", "Mercedes-Benz") entran igual porque el título
 * se normaliza del mismo modo: el guion pasa a espacio de los dos lados.
 */
export function marcasEnTitulos(titulos: readonly string[]): Marca[] {
  const textos = titulos.map((t) => ` ${normalizar(t)} `)
  return DICCIONARIO_MARCAS.filter((marca) =>
    marca.alias.some((a) => textos.some((t) => t.includes(` ${a} `))),
  )
}
