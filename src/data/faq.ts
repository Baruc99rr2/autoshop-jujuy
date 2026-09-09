/**
 * Preguntas frecuentes.
 *
 * Las respuestas son inventadas pero verosímiles: plazos, porcentajes y
 * condiciones que una concesionaria de Jujuy podría sostener. Cuando lleguen
 * las políticas reales se reemplaza el texto acá y no se toca el componente.
 */
export interface Pregunta {
  id: string
  pregunta: string
  respuesta: string
}

export const FAQ: Pregunta[] = [
  {
    id: 'usado-parte-de-pago',
    pregunta: '¿Toman mi usado como parte de pago?',
    respuesta:
      'Sí, y es la forma en que se cierra la mayoría de las operaciones. Traés la unidad, la tasamos en el momento con la guía oficial y el estado real del auto, y ese valor se descuenta del precio. Si el usado vale más que la diferencia, la devolución se hace por transferencia el mismo día del boleto.',
  },
  {
    id: 'financiacion-sin-recibo',
    pregunta: '¿Puedo financiar sin recibo de sueldo?',
    respuesta:
      'Sí. Con financiación propia trabajamos con monotributistas, comerciantes y trabajadores independientes: alcanza con facturación de los últimos seis meses o movimientos bancarios. El anticipo mínimo en esos casos es del 40% y el plazo máximo, 36 cuotas.',
  },
  {
    id: 'transferencia-patentamiento',
    pregunta: '¿Quién se encarga de la transferencia y el patentamiento?',
    respuesta:
      'Nosotros. El trámite lo hace nuestra gestoría en el Registro Automotor de San Salvador y el costo ya está incluido en el precio publicado. Los usados se entregan con la transferencia iniciada y el 0km, patentado a tu nombre.',
  },
  {
    id: 'garantia-usados',
    pregunta: '¿Qué garantía tienen los usados?',
    respuesta:
      'Seis meses o 10.000 km, lo que ocurra primero, sobre motor, caja y diferencial. Antes de publicarla, cada unidad pasa por un chequeo de 42 puntos y por verificación policial. El informe queda a tu disposición antes de firmar.',
  },
  {
    id: 'permuta',
    pregunta: '¿Hacen permuta entre dos usados?',
    respuesta:
      'Sí, siempre que las dos unidades estén libres de deuda y de prenda. Si la diferencia queda a tu favor te la abonamos por transferencia; si queda en contra, se puede financiar hasta en 24 cuotas.',
  },
  {
    id: 'demora-0km',
    pregunta: '¿Cuánto demora la entrega de un 0km?',
    respuesta:
      'Entre 15 y 45 días según el modelo y el color. Lo que hay en stock en el salón se entrega en 72 horas una vez completada la documentación. Si el modelo viene por pedido, te damos la fecha estimada por escrito antes de tomar la seña.',
  },
]
