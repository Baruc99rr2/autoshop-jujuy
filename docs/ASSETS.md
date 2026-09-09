# Assets — el material real

Todo conseguido. Esto describe qué es cada archivo, qué hay que hacerle antes de usarlo, y las dos cosas que cambian decisiones de diseño.

---

## El logo (listo, sin cambios)

`src/assets/logo.svg`. 50 paths, 13 ids, blanco `#FEFDF8` y ámbar `#FDB916`.

---

## Video 1 — Hero

`16743471-uhd_2160_3840_30fps.mp4` · 10 s · 11 MB · **2160×3840 (vertical, 9:16)** · 30 fps

Auto oscuro bajo un farol, cielo nocturno con nubes iluminadas. Plano lento, poco pasa: exactamente lo que necesita un hero. Buena elección.

**Dos cosas a resolver:**

**1. Es vertical.** En mobile es ideal, a pantalla completa. En desktop no se puede usar a sangre: escalado a 1920 de ancho, el alto pasa a 3413 px y en un viewport de 1080 verías apenas el 32% del encuadre. Perderías el farol o perderías el auto.

La solución no es recortar, es cambiar el layout: **hero partido en desktop** — titular a la izquierda sobre negro, panel vertical biselado con el video a la derecha, a altura de viewport. En mobile vuelve a full-bleed, que es su formato natural. Un componente, dos layouts. Queda más distintivo que el video a sangre y usa el bisel que ya está en todo el sitio.

**2. No cicla.** En los últimos 3 segundos el auto acelera y sale de cuadro, así que el loop salta. Se recorta a los primeros 7 segundos. Si el corte igual se nota, hay una solución en el prompt.

```powershell
# Guardá el original con otro nombre antes de comprimir
ren public\video\hero-desktop.mp4 hero-original.mp4

# Panel de desktop — 1080x1920 sobra para un panel de ~40% del ancho
ffmpeg -i public\video\hero-original.mp4 -t 7 -vf "scale=1080:-2,fps=30" `
  -c:v libx264 -crf 28 -preset slow -an -movflags +faststart `
  public\video\hero-desktop.mp4

# Mobile — 720x1280
ffmpeg -i public\video\hero-original.mp4 -t 7 -vf "scale=720:-2,fps=30" `
  -c:v libx264 -crf 30 -preset slow -an -movflags +faststart `
  public\video\hero-mobile.mp4

# Poster — un frame de los primeros segundos
ffmpeg -i public\video\hero-original.mp4 -ss 2 -frames:v 1 -vf "scale=1080:-2" `
  -q:v 3 public\img\hero-poster.jpg
```

Objetivo: desktop < 3 MB, mobile < 1,5 MB. Verificá con `dir public\video`.
Después de comprimir, borrá `hero-original.mp4` de `public/` — si queda ahí, se sube al deploy.

---

## Video 2 — CTA

`15003049_3840_2160_60fps.mp4` · 18 s · **50 MB** · 3840×2160 · 60 fps

Valle andino con río trenzado y cumbres nevadas. Es el archivo más pesado del proyecto por lejos y hay que bajarlo mucho: se ve **solo a través de las letras del titular**, así que la resolución alta no aporta nada.

```powershell
ren public\video\cta.mp4 cta-original.mp4

ffmpeg -i public\video\cta-original.mp4 -t 12 -vf "scale=1280:-2,fps=25" `
  -c:v libx264 -crf 30 -preset slow -an -movflags +faststart `
  public\video\cta.mp4
```

De 50 MB tiene que bajar a 2-3 MB. Si queda arriba de 4, subí el `crf` a 33.
Borrá el original después.

**Un aviso, no un problema:** ese paisaje es cordillera patagónica, con nieve y vegetación. La Quebrada de Humahuaca es árida y ocre — se ve bastante distinto. A través de una máscara de texto vas a ver franjas de montaña en movimiento y va a funcionar igual, pero **el copy de esa sección no debe decir que es Jujuy**. Que hable de comprar auto, no del paisaje.

---

## Las 3 fotos de vehículos

Tres carrocerías bien distintas, que es justo lo que hacía falta:

| Archivo | Qué es | Nota |
|---|---|---|
| `car-1.jpg` | **Hyundai Tucson** gris oscuro, 3/4 delantero, atardecer | SUV. Se vende en Argentina, usado plausible. |
| `car-2.jpg` | **Suzuki Swift Sport** blanco, 3 puertas, camino rural | Hatchback deportivo. Patente checa visible. |
| `car-3.jpg` | **RAM 1500** gris, 3/4 delantero, atardecer | Pick-up grande. Se vende en Argentina. |

**Importante: hay que nombrarlos por lo que realmente son.** La tentación es escribir "Fiat Cronos" debajo de la foto de un Tucson porque el Cronos se vende más en Jujuy. No lo hagas: cualquiera del rubro lo ve al instante, y en la reunión eso quema la credibilidad de toda la demo. Un catálogo con tres unidades reales bien etiquetadas se defiende solo.

El Swift Sport es el más raro para el mercado argentino — Suzuki se retiró del país. Para un lote de usados con una unidad importada es creíble; si no te convence, es la primera que reemplazarías cuando lleguen las fotos del stock real.

La patente checa del `car-2` se ve, pero en una card de ~500 px es un detalle chico. Baja prioridad.

---

## Las 4 imágenes de segmentos

Elección muy buena: las cuatro son nocturnas o de luz baja, así que entran en la paleta del sitio sin pelearse con el negro.

| Archivo | Qué es |
|---|---|
| `segmento-1.jpg` | Mazda CX-5 de atrás, camino nevado, sol bajo entre montañas |
| `segmento-2.jpg` | Alfa Romeo 159 bajo la Vía Láctea, campo abierto |
| `segmento-3.jpg` | VW Tiguan de noche bajo lluvia, puente iluminado, azules y rojos |
| `segmento-4.jpg` | Toyota Land Cruiser en desierto con cardones, cielo estrellado, telescopio |

**Cambio de criterio para los segmentos:** tres de las cuatro son SUV, así que no se pueden llamar por carrocería — las fotos no lo sostienen. Van por **uso**, que además le habla mejor a alguien que está por comprar:

1. **Ciudad** → `segmento-3` (Tiguan, lluvia, puente)
2. **Ruta** → `segmento-1` (CX-5, camino de montaña)
3. **Aventura** → `segmento-4` (Land Cruiser, cardones)
4. **Escapada** → `segmento-2` (Alfa, cielo estrellado)

El `segmento-4` es el hallazgo del conjunto: cardones, cerros y cielo estrellado leen como la Puna jujeña sin que nadie tenga que decirlo.

---

## Optimización de imágenes

Tu build de ffmpeg tiene `libwebp`, así que no hace falta instalar nada:

```powershell
Get-ChildItem public\img\vehiculos\*.jpg, public\img\segmentos\*.jpg | ForEach-Object {
  $out = Join-Path $_.DirectoryName ($_.BaseName + ".webp")
  ffmpeg -y -i $_.FullName -vf "scale=1600:-2" -c:v libwebp -quality 82 $out
}
```

Después borrá los `.jpg` originales de `public/`. Ninguna imagen arriba de 250 KB.

---

## Estructura final

```
public/
├─ video/  hero-desktop.mp4 · hero-mobile.mp4 · cta.mp4
└─ img/    hero-poster.jpg
   ├─ vehiculos/  car-1.webp · car-2.webp · car-3.webp
   └─ segmentos/  segmento-1.webp … segmento-4.webp
```

Verificá que no quede ningún `-original.mp4` ni ningún `.jpg` suelto: todo lo que esté en `public/` se sube al deploy.
