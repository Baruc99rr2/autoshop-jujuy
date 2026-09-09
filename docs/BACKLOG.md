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