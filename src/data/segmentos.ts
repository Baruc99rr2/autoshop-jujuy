/**
 * Los cuatro segmentos del carrusel apilado.
 *
 * VAN POR USO, NO POR CARROCERÍA. Tres de las cuatro fotos son SUV, así que
 * una lista que dijera "SUV / Sedán / Pick-up / Hatchback" quedaría desmentida
 * por las imágenes en el acto. Además, alguien que está por comprar un auto
 * piensa antes en para qué lo quiere que en cómo se llama la carrocería.
 *
 * El copy de cada uno dice para qué sirve ese tipo de auto EN JUJUY, con algo
 * concreto: una cuesta, un ripio, una altura. Nada de adjetivos.
 */
export interface Segmento {
  /** Nombre corto que muestra la lista. */
  nombre: string
  /** Una línea concreta. Se muestra bajo el nombre del ítem activo. */
  copy: string
  /** Etiqueta corta a la derecha del ítem, en Martian Mono. */
  etiqueta: string
  imagen: string
  /** Alt real: describe la foto, no repite el nombre del segmento. */
  alt: string
  /** Ancho y alto REALES del archivo, medidos con ffprobe. Van en el <img>
   *  porque el layout shift rompe los cálculos de ScrollTrigger, y este
   *  carrusel es una sección pinneada: un shift acá desplaza el pin entero.
   *  Ojo que no son todos iguales — segmento-2 es más panorámico. */
  ancho: number
  alto: number
}

export const SEGMENTOS: Segmento[] = [
  {
    nombre: 'Ciudad',
    copy: 'Para moverte por el centro y estacionar en Belgrano sin pelearte con el auto. Bajo consumo y caja automática.',
    etiqueta: 'URBANO',
    imagen: '/img/segmentos/segmento-3.webp',
    alt: 'SUV oscura de noche sobre asfalto mojado, con un puente iluminado de fondo',
    ancho: 1600,
    alto: 1066,
  },
  {
    nombre: 'Ruta',
    copy: 'Para hacer la 9 hasta Salta o bajar a Perico seguido. Motor con aire, estabilidad y baúl que aguanta el fin de semana.',
    etiqueta: 'CARRETERA',
    imagen: '/img/segmentos/segmento-1.webp',
    alt: 'SUV vista de atrás en un camino de montaña nevado al atardecer',
    ancho: 1600,
    alto: 1066,
  },
  {
    nombre: 'Aventura',
    copy: 'Para subir a la Quebrada, a Purmamarca o al Salinas Grandes por ripio. Tracción, despeje y neumáticos que banquen la altura.',
    etiqueta: '4X4',
    imagen: '/img/segmentos/segmento-4.webp',
    alt: 'Todoterreno de perfil en un descampado con cardones y cielo estrellado',
    ancho: 1600,
    alto: 1066,
  },
  {
    nombre: 'Escapada',
    copy: 'Para irte el finde a Termas de Reyes o a Tilcara con la familia. Consumo bajo y espacio para cuatro con equipaje.',
    etiqueta: 'FAMILIA',
    imagen: '/img/segmentos/segmento-2.webp',
    alt: 'Sedán oscuro con las luces encendidas en un campo abierto bajo la Vía Láctea',
    ancho: 1600,
    alto: 954,
  },
]
