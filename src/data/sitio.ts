/**
 * La dirección OFICIAL del sitio, sin barra final.
 *
 * Se usa solo donde hace falta un dominio fijo: el canonical y el `og:url`,
 * que les dicen a los buscadores cuál es LA dirección aunque el sitio se abra
 * desde una vista previa de Vercel o con `www`. Todo lo demás —el link de
 * cada ficha en el mensaje de WhatsApp, por ejemplo— se arma con
 * `window.location.origin`, que es la dirección en la que la persona está.
 *
 * Tiene su gemela en `index.html` (canonical, Open Graph) y en
 * `public/robots.txt` y `public/sitemap.xml`: esos archivos se sirven sin
 * pasar por el JS, así que la dirección va escrita. Si el dominio cambia,
 * se cambia en los cuatro lugares.
 */
export const SITIO_URL = 'https://autoshopjujuy.com'
