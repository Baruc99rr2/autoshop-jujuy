/**
 * Los autos de muestra, en Supabase.
 *
 *   npm run semilla -- subir    # borra los de muestra que haya y los vuelve a cargar
 *   npm run semilla -- borrar   # borra los de muestra y nada más
 *
 * Carga las seis unidades de `src/data/repo/semilla.ts` —las mismas que usa
 * el mock—, con un borrador, una vendida y una sin precio, para tener con qué
 * mirar el sitio contra la base de verdad.
 *
 * FÁCIL DE BORRAR: todas llevan el id con el prefijo `demo-`, y `borrar` se
 * lleva exactamente esas (con sus fotos, video y etiquetas, en cascada). Lo
 * que haya cargado la dueña no se toca nunca: su id es un uuid.
 *
 * Las fotos y el video de muestra NO se suben al bucket: apuntan a archivos
 * del propio sitio (`/img/vehiculos/...`), así que no dejan nada que limpiar
 * en el almacenamiento.
 *
 * El contenido del inicio (números, servicios, preguntas) no va acá: lo carga
 * `supabase/schema.sql` la primera vez que se corre.
 *
 * Entra con la cuenta de prueba de `.env.local` (ver `entorno.mjs`).
 */
import process from 'node:process'
import { SEMILLA, PREFIJO_DEMO } from '../src/data/repo/semilla.ts'
import { clienteAdmin, leerEntorno } from './entorno.mjs'

const BUCKET = 'vehiculos'

async function borrar(sb) {
  const { data, error } = await sb
    .from('vehiculos')
    .delete()
    .like('id', `${PREFIJO_DEMO}%`)
    .select('id')
  if (error) throw new Error(`No se pudieron borrar los de muestra: ${error.message}`)

  // Por si alguna vez se le subió un archivo desde el panel a una unidad de
  // muestra: su carpeta se vacía también.
  for (const { id } of data) {
    const { data: archivos } = await sb.storage.from(BUCKET).list(id, { limit: 1000 })
    if (archivos?.length) {
      await sb.storage.from(BUCKET).remove(archivos.map((a) => `${id}/${a.name}`))
    }
  }
  return data.length
}

async function subir(sb) {
  const fila = (v) => ({
    id: v.id,
    slug: v.slug,
    titulo: v.titulo,
    descripcion: v.descripcion,
    condicion: v.condicion,
    precio: v.precio,
    anio: v.anio,
    km: v.km,
    estado: v.estado,
    publicado: v.publicado,
    destacado: v.destacado,
    creado_en: v.creadoEn,
  })

  const paso = async (tabla, filas) => {
    if (filas.length === 0) return
    const { error } = await sb.from(tabla).insert(filas)
    if (error) throw new Error(`No se pudo cargar ${tabla}: ${error.message}`)
  }

  await paso('vehiculos', SEMILLA.map(fila))
  await paso(
    'fotos',
    SEMILLA.flatMap((v) =>
      v.fotos.map((f) => ({
        id: f.id,
        vehiculo_id: v.id,
        url: f.url,
        ruta: null,
        ancho: f.ancho,
        alto: f.alto,
        orden: f.orden,
      })),
    ),
  )
  await paso(
    'videos',
    SEMILLA.filter((v) => v.video).map((v) => ({
      vehiculo_id: v.id,
      url: v.video.url,
      ruta: null,
      poster_url: v.video.posterUrl,
      poster_ruta: null,
      peso_bytes: v.video.pesoBytes,
    })),
  )
  await paso(
    'etiquetas',
    SEMILLA.flatMap((v) =>
      v.etiquetas.map((e) => ({
        id: e.id,
        vehiculo_id: v.id,
        titulo: e.titulo,
        texto: e.texto,
        foto_fondo_id: e.fotoFondoId,
        orden: e.orden,
      })),
    ),
  )
}

const orden = process.argv[2]
if (orden !== 'subir' && orden !== 'borrar') {
  console.error('Uso: npm run semilla -- subir | borrar')
  process.exit(1)
}

try {
  const sb = await clienteAdmin(leerEntorno())
  const borradas = await borrar(sb)
  if (orden === 'borrar') {
    console.log(`Listo: ${borradas} unidades de muestra borradas.`)
  } else {
    await subir(sb)
    console.log(
      `Listo: ${SEMILLA.length} unidades de muestra cargadas` +
        (borradas ? ` (antes se borraron las ${borradas} que había).` : '.'),
    )
  }
  await sb.auth.signOut()
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
