# Backlog — post demo

Fuera de alcance para la demo del lunes. Solo el home.

## Ficha de vehículo
Al tocar una unidad del catálogo se abre su página completa: galería de fotos,
ficha técnica extendida, historial (service, dueños, km certificados), simulador
de cuotas precargado con ese precio, botón de test drive y consulta directa por
WhatsApp con el modelo ya en el mensaje.

Implicancia técnica: el sitio pasa de una sola página a tener rutas. Cuando
llegue el momento hay que decidir entre agregar react-router o migrar a Next.js.
Next conviene si importa el SEO — y para una concesionaria importa, porque la
gente busca "Cronos usado Jujuy" en Google.

Por eso `src/data/vehiculos.ts` tiene que tener un campo `slug` desde ahora,
aunque todavía no se use para navegar.

## Otros pendientes
- Catálogo completo con filtros reales (marca, precio, año, km) y paginado.
- Fotos reales del stock, reemplazando las de muestra.
- Datos de contacto reales de la concesionaria.
- Panel de gestión (stock, clientes, test drives, pagos) — proyecto aparte.
## Ideas de contenido a evaluar

Tomadas de la web de una concesionaria Fiat de la competencia. Se toma la
**estructura**, no la estética: esa web es roja y blanca, con rayas diagonales y
cards genéricas. La dirección visual de este sitio no cambia por esto.

- **"Cuota desde $X" en las cards de vehículo**, además del precio. En Argentina
  es el primer dato que mira el comprador, incluso antes que el precio total.
  Ya está contemplado: el tipo `Vehiculo` de `src/data/vehiculos.ts` (fase 6)
  incluye el campo `cuotaDesde`.
- **Tres cards de planes en la sección Fiat Plan**, además del simulador, cada
  una con su "Cuota desde $X" y un botón. Pendiente hasta que haya fotos: sin
  imagen de la unidad, tres cards de plan quedan como una tabla de precios.
- **Post-venta**: grilla de accesos a Turnos de service, Repuestos originales,
  Mantenimiento programado y Accesorios. No necesita ninguna foto — solo íconos
  SVG en línea y texto. Implementada en la fase F de esta sesión.
