import type {
  Contadores,
  DatosContacto,
  Pregunta,
  Segmento,
  Servicio,
} from '../../types/contenido'

/**
 * El contenido del inicio tal como estaba escrito en los archivos de datos
 * antes de que se editara desde el panel. Es la primera carga de cualquier
 * navegador; de ahí en adelante manda lo que guarde la dueña.
 *
 * NO LLEVA PREFIJO `demo-`: los servicios y sus precios son los reales. Las
 * cifras de los contadores y las respuestas de la FAQ son verosímiles pero
 * inventadas, y se reemplazan editándolas, no borrándolas.
 */

export const SEMILLA_CONTADORES: Contadores = {
  apertura: 2023,
  lista: [
    { id: 'entregadas', valor: 500, sufijo: '+', etiqueta: 'Unidades entregadas' },
    { id: 'marcas', valor: 12, sufijo: '', etiqueta: 'Marcas en el salón' },
    { id: 'anios', valor: 0, sufijo: '', etiqueta: 'Años en Jujuy', desdeApertura: true },
    { id: 'financiacion', valor: 100, sufijo: '%', etiqueta: 'Financiación propia' },
  ],
}

export const SEMILLA_SERVICIOS: Servicio[] = [
  {
    id: 'seguros',
    icono: 'seguro',
    titulo: 'Seguros',
    precio: null,
    detalle: 'Con débito automático',
    orden: 0,
  },
  {
    id: 'escaneo',
    icono: 'escaneo',
    titulo: 'Escaneo vehicular',
    precio: 35_000,
    detalle: '',
    orden: 1,
  },
  {
    id: 'garantia',
    icono: 'garantia',
    titulo: 'Garantía para tu vehículo',
    precio: null,
    detalle: 'Con débito automático',
    orden: 2,
  },
  {
    id: 'limpieza',
    icono: 'limpieza',
    titulo: 'Limpieza de interiores + motor',
    precio: 125_000,
    detalle: 'Reservá tu turno',
    orden: 3,
  },
  {
    id: 'filtros',
    icono: 'aceite',
    titulo: 'Service de filtros y aceite',
    precio: null,
    detalle: 'Consultá el precio según tu unidad',
    orden: 4,
  },
]

export const SEMILLA_PREGUNTAS: Pregunta[] = [
  {
    id: 'usado-parte-de-pago',
    pregunta: '¿Toman mi usado como parte de pago?',
    respuesta:
      'Sí, y es la forma en que se cierra la mayoría de las operaciones. Traés la unidad, la tasamos en el momento con la guía oficial y el estado real del auto, y ese valor se descuenta del precio. Si el usado vale más que la diferencia, la devolución se hace por transferencia el mismo día del boleto.',
    orden: 0,
  },
  {
    id: 'financiacion-sin-recibo',
    pregunta: '¿Puedo financiar sin recibo de sueldo?',
    respuesta:
      'Sí. Con financiación propia trabajamos con monotributistas, comerciantes y trabajadores independientes: alcanza con facturación de los últimos seis meses o movimientos bancarios. El anticipo mínimo en esos casos es del 40% y el plazo máximo, 36 cuotas.',
    orden: 1,
  },
  {
    id: 'transferencia-patentamiento',
    pregunta: '¿Quién se encarga de la transferencia y el patentamiento?',
    respuesta:
      'Nosotros. El trámite lo hace nuestra gestoría en el Registro Automotor de San Salvador y el costo ya está incluido en el precio publicado. Los usados se entregan con la transferencia iniciada y el 0km, patentado a tu nombre.',
    orden: 2,
  },
  {
    id: 'garantia-usados',
    pregunta: '¿Qué garantía tienen los usados?',
    respuesta:
      'Seis meses o 10.000 km, lo que ocurra primero, sobre motor, caja y diferencial. Antes de publicarla, cada unidad pasa por un chequeo de 42 puntos y por verificación policial. El informe queda a tu disposición antes de firmar.',
    orden: 3,
  },
  {
    id: 'permuta',
    pregunta: '¿Hacen permuta entre dos usados?',
    respuesta:
      'Sí, siempre que las dos unidades estén libres de deuda y de prenda. Si la diferencia queda a tu favor te la abonamos por transferencia; si queda en contra, se puede financiar hasta en 24 cuotas.',
    orden: 4,
  },
  {
    id: 'demora-0km',
    pregunta: '¿Cuánto demora la entrega de un 0km?',
    respuesta:
      'Entre 15 y 45 días según el modelo y el color. Lo que hay en stock en el salón se entrega en 72 horas una vez completada la documentación. Si el modelo viene por pedido, te damos la fecha estimada por escrito antes de tomar la seña.',
    orden: 5,
  },
]

/**
 * Los cuatro segmentos del carrusel, con las fotos que ya tenía el sitio.
 *
 * VAN POR USO, NO POR CARROCERÍA. Tres de las cuatro fotos son SUV, así que
 * una lista que dijera "SUV / Sedán / Pick-up" quedaría desmentida por las
 * imágenes en el acto. El texto dice para qué sirve ese auto EN JUJUY, con
 * algo concreto: una cuesta, un ripio, una altura.
 *
 * Las imágenes son archivos del sitio (`ruta: null`), no del bucket: el panel
 * nunca las borra, y si la dueña las reemplaza quedan ahí sin molestar.
 * Ancho y alto medidos del archivo; segmento-2 es más panorámico.
 */
export const SEMILLA_SEGMENTOS: Segmento[] = [
  {
    id: 'ciudad',
    titulo: 'Ciudad',
    texto:
      'Para moverte por el centro y estacionar en Belgrano sin pelearte con el auto. Bajo consumo y caja automática.',
    etiqueta: 'URBANO',
    imagen: { url: '/img/segmentos/segmento-3.webp', ruta: null, ancho: 1600, alto: 1066 },
    orden: 0,
  },
  {
    id: 'ruta',
    titulo: 'Ruta',
    texto:
      'Para hacer la 9 hasta Salta o bajar a Perico seguido. Motor con aire, estabilidad y baúl que aguanta el fin de semana.',
    etiqueta: 'CARRETERA',
    imagen: { url: '/img/segmentos/segmento-1.webp', ruta: null, ancho: 1600, alto: 1066 },
    orden: 1,
  },
  {
    id: 'aventura',
    titulo: 'Aventura',
    texto:
      'Para subir a la Quebrada, a Purmamarca o al Salinas Grandes por ripio. Tracción, despeje y neumáticos que banquen la altura.',
    etiqueta: '4X4',
    imagen: { url: '/img/segmentos/segmento-4.webp', ruta: null, ancho: 1600, alto: 1066 },
    orden: 2,
  },
  {
    id: 'escapada',
    titulo: 'Escapada',
    texto:
      'Para irte el finde a Termas de Reyes o a Tilcara con la familia. Consumo bajo y espacio para cuatro con equipaje.',
    etiqueta: 'FAMILIA',
    imagen: { url: '/img/segmentos/segmento-2.webp', ruta: null, ancho: 1600, alto: 954 },
    orden: 3,
  },
]

/**
 * Contacto inicial. Son REALES el WhatsApp, el teléfono y los horarios; la
 * dirección es la que pasó la dueña. El mail todavía es de muestra: se
 * corrige desde el panel.
 *
 * Las coordenadas son APROXIMADAS: OpenStreetMap tiene la Av. El Éxodo pero
 * no la altura 750, así que el punto cae sobre la avenida, en Gorriti, y no
 * en la puerta exacta. La dueña las ajusta desde el panel con Google Maps.
 */
export const SEMILLA_CONTACTO: DatosContacto = {
  telefono: '388 465-2485',
  email: 'ventas@autoshopjujuy.com.ar',
  whatsapp: '+54 9 388 465-2485',
  direccion: 'Av. Éxodo 750, San Salvador de Jujuy',
  lat: -24.19541,
  lng: -65.29769,
  horarios: [
    { dias: 'Lunes a viernes', horas: '9:30 a 13:30 · 17:15 a 21:30' },
    { dias: 'Sábados', horas: '9:30 a 13:40' },
  ],
}
