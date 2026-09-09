# Assets — la lista mínima

El logo ya está resuelto. Solo tenés que bajar **2 videos y 3 fotos**, y el resto sale de ahí.

---

## El logo (listo)

`logo.svg` → `src/assets/logo.svg`

Vectorizado desde la captura que mandaste. 50 paths, 17 KB, escala a cualquier tamaño sin perder nitidez. Fidelidad medida contra el original: error medio de 6/255, que es prácticamente todo antialiasing de borde.

Grupos con id, y los 7 cuadros de la bandera ordenados de izquierda a derecha en el DOM, así que un `stagger` de GSAP ya produce el barrido de "semáforo de largada" sin calcular nada.

Los colores muestreados: **blanco #FEFDF8**, **ámbar #FDB916**. Ese ámbar ahora es el acento único de todo el sitio.

`logo@4x.png` es el fallback rasterizado, por si lo necesitás para un favicon o para pegarlo en un mail.

> Es un trazado de una captura, no el archivo original. Alcanza de sobra para la demo. Cuando el cliente firme, pedile el vectorial.

---

## Videos (2)

**Dónde:** Pexels Videos, Mixkit o Coverr. Gratuitos, uso comercial permitido, sin atribución obligatoria. No bajes de YouTube: está prohibido por sus términos y el re-encode se ve mal.

**Video 1 — hero.** Buscá `car driving night city lights` o `headlights night road`. Un plano **lento, con poca cámara**. Un clip agitado compite con el titular y lo vuelve ilegible. Que tenga zonas oscuras donde el texto pueda respirar.

**Video 2 — CTA.** Buscá `drone road mountains` o `desert highway aerial`. Acá sí querés movimiento visible: el texto es una ventana y el video se tiene que notar moviéndose a través de él. `argentina andes road` a veces devuelve material que evoca la Quebrada.

### Optimización (importante)

Un clip de Pexels en 4K pesa 40-80 MB. Sin comprimir, el hero tarda 20 segundos en datos móviles y perdés la demo en el primer scroll.

```bash
# Hero desktop
ffmpeg -i original.mp4 -t 10 -vf "scale=1920:-2,fps=30" \
  -c:v libx264 -crf 28 -preset slow -an -movflags +faststart \
  public/video/hero-desktop.mp4

# Hero mobile
ffmpeg -i original.mp4 -t 10 -vf "scale=1280:-2,fps=30" \
  -c:v libx264 -crf 31 -preset slow -an -movflags +faststart \
  public/video/hero-mobile.mp4

# Poster
ffmpeg -i original.mp4 -ss 3 -frames:v 1 -vf "scale=1920:-2" -q:v 3 \
  public/img/hero-poster.jpg

# Lo mismo para el video 2 → public/video/cta.mp4
```

`-movflags +faststart` mueve el índice al principio para que empiece a reproducir sin descargar todo.

**Objetivo:** hero-desktop < 4 MB, hero-mobile < 2 MB. Verificá con `ls -lh public/video/`. Si te pasás, subí el `-crf` o acortá a 8 segundos.

---

## Fotos de auto (3)

Pexels o Unsplash, buscando por carrocería: `pickup truck`, `compact suv`, `hatchback car`. Que sean tres carrocerías **distintas** entre sí — así el catálogo se ve variado con poco material.

Las guardás en `public/img/vehiculos/`. Los planos detalle para el hover salen de recortes de estas mismas fotos por CSS, no necesitás archivos nuevos.

---

## Los frames gratis (el truco que te ahorra la búsqueda)

El carrusel de segmentos necesita 4 imágenes y no las vas a buscar. Salen de los videos que ya bajaste:

```bash
ffmpeg -i public/video/hero-desktop.mp4 -vf "fps=1/2,scale=1600:-2" \
  -q:v 3 public/img/segmentos/frame_%02d.jpg
```

Te va a escupir un frame cada 2 segundos. Elegís los 4 mejores, borrás el resto. Ventaja real: vienen con el mismo grado de color que el hero, así que el sitio se ve coherente en vez de collage de stock.

---

## Logos de marcas: no van

Recrearlos en SVG da resultados imprecisos y es un problema de marca registrada. La sección de marcas es tipográfica: los nombres en Archivo extendido, apagados en gris, encendiéndose en ámbar al pasar. Encaja mejor con el lenguaje del sitio que una grilla de logos ajenos, y no depende de ningún asset.

---

## Estructura final

```
public/
├─ video/  hero-desktop.mp4 · hero-mobile.mp4 · cta.mp4
└─ img/    hero-poster.jpg
   ├─ vehiculos/  (3 fotos)
   └─ segmentos/  (4 frames extraídos)

src/assets/logo.svg
```

Optimizá las imágenes al final:
```bash
for f in public/img/**/*.jpg; do cwebp -q 82 -resize 1400 0 "$f" -o "${f%.jpg}.webp"; done
```

Ninguna imagen arriba de 250 KB. Poné `width` y `height` explícitos en cada `<img>`: el layout shift rompe los cálculos de ScrollTrigger.

---

## Datos de la concesionaria

No hay ninguno y no hacen falta. Que Claude Code invente todo: dirección plausible del centro de San Salvador de Jujuy, horario comercial, teléfono con característica 0388, redes. En el footer queda la nota de "sitio de demostración" y en la reunión lo aclarás en una frase.

**No uses lorem ipsum.** En un sitio en español se lee como algo sin terminar. Copy inventado pero verosímil no cuesta nada y hace que la demo se vea entregada.
