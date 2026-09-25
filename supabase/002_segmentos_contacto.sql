-- ════════════════════════════════════════════════════════════════════════
--  AUTOSHOP JUJUY — 002: segmentos y datos de contacto editables
-- ════════════════════════════════════════════════════════════════════════
--
--  Va DESPUÉS de `schema.sql` (usa su función `es_admin()` y su bucket).
--  Se pega ENTERO en el SQL Editor y se corre de una vez. Es idempotente:
--  correrlo de nuevo no rompe ni duplica nada, y todo va en una transacción.
--
--  Refleja `Segmento` y `DatosContacto` de `src/types/contenido.ts`.
--
--  Las fotos de los segmentos van al MISMO bucket que las de los vehículos
--  (`vehiculos`), pero en su propia carpeta: `segmentos/<id>-<uuid>.webp`.
--  Las políticas de storage de `schema.sql` ya cubren todo el bucket (leer
--  por dirección pública; subir, reemplazar y borrar solo admins), así que
--  acá no se agrega ninguna.
-- ════════════════════════════════════════════════════════════════════════

begin;


-- ════════════════════════════════════════════════════════════════════════
--  1. TABLAS
-- ════════════════════════════════════════════════════════════════════════

-- Los segmentos del carrusel del inicio ("Qué estás buscando").
--
-- Sin tope en la base A PROPÓSITO (el tope de 6 lo ponen el panel y el
-- repositorio): la lista se guarda con upsert + borrado de lo que no vino, y
-- entre esos dos pasos puede haber momentáneamente más filas que el tope. Un
-- trigger que contara las filas frenaría un cambio perfectamente válido.
create table if not exists public.segmentos (
  id          text primary key default gen_random_uuid()::text,
  titulo      text not null check (length(trim(titulo)) > 0),
  texto       text not null default '',
  -- Rótulo corto opcional ("4X4"). Vacío = sin rótulo.
  etiqueta    text not null default '',
  -- Dirección lista para el <img>: pública del bucket, o `/img/...` para las
  -- fotos de la semilla, que son archivos del sitio.
  imagen_url  text not null,
  -- Camino dentro del bucket (`segmentos/...`). null = archivo del sitio:
  -- el repositorio no lo borra nunca.
  imagen_ruta text,
  -- Dimensiones reales: van al <img> para que el pin no salte.
  ancho       integer not null check (ancho > 0),
  alto        integer not null check (alto > 0),
  orden       smallint not null default 0 check (orden >= 0)
);

create index if not exists segmentos_orden_idx on public.segmentos (orden);

-- Los datos de contacto. UNA sola fila, como `sitio` (el `check (id)`
-- impide una segunda).
create table if not exists public.contacto (
  id        boolean primary key default true check (id),
  -- Como se muestran. Vacío = no se muestra.
  telefono  text not null default '',
  email     text not null default '',
  -- Como lo escribe la dueña ("+54 9 388 465-2485"). El link de wa.me lo
  -- arma el sitio. Obligatorio: de acá salen todos los botones de WhatsApp.
  whatsapp  text not null check (length(trim(whatsapp)) > 0),
  direccion text not null default '',
  -- El mapa de OpenStreetMap y el «Cómo llegar» usan esto, no el texto.
  lat       double precision not null check (lat between -90 and 90),
  lng       double precision not null check (lng between -180 and 180),
  -- Lista de { "dias": "...", "horas": "..." }.
  horarios  jsonb not null default '[]'::jsonb
            check (jsonb_typeof(horarios) = 'array')
);


-- ════════════════════════════════════════════════════════════════════════
--  2. PERMISOS DE BASE
-- ════════════════════════════════════════════════════════════════════════
-- Misma primera capa que el resto: el visitante solo puede LEER.

revoke all on public.segmentos, public.contacto from anon, authenticated;

grant select on public.segmentos, public.contacto to anon, authenticated;

grant insert, update, delete on public.segmentos to authenticated;

-- Contacto: la fila única solo se modifica, nunca se agrega ni se borra.
grant update on public.contacto to authenticated;


-- ════════════════════════════════════════════════════════════════════════
--  3. RLS
-- ════════════════════════════════════════════════════════════════════════

alter table public.segmentos enable row level security;
alter table public.contacto  enable row level security;

-- Deja leer los segmentos a cualquiera: son parte de la portada.
drop policy if exists "segmentos: lectura pública" on public.segmentos;
create policy "segmentos: lectura pública"
  on public.segmentos for select
  to anon, authenticated
  using (true);

-- Protege los segmentos: agregar, cambiar, reordenar y borrar es solo para
-- admins.
drop policy if exists "segmentos: escriben solo admins" on public.segmentos;
create policy "segmentos: escriben solo admins"
  on public.segmentos for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- Deja leer el contacto a cualquiera: está en el footer de todas las páginas.
drop policy if exists "contacto: lectura pública" on public.contacto;
create policy "contacto: lectura pública"
  on public.contacto for select
  to anon, authenticated
  using (true);

-- Protege el número de WhatsApp y la dirección: solo un admin los cambia.
-- No hay política de alta ni de baja: la fila única no se puede borrar ni
-- duplicar. El panel guarda con UPDATE.
drop policy if exists "contacto: modifican solo admins" on public.contacto;
create policy "contacto: modifican solo admins"
  on public.contacto for update
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));


-- ════════════════════════════════════════════════════════════════════════
--  4. CONTENIDO INICIAL
-- ════════════════════════════════════════════════════════════════════════
-- Lo mismo que `SEMILLA_CONTACTO` y `SEMILLA_SEGMENTOS` de
-- `src/data/repo/semilla-contenido.ts`. Se carga UNA sola vez: la primera
-- corrida crea la fila de `contacto` y, desde ahí, volver a correr el
-- archivo no toca nada. Así no reaparece un segmento que la dueña borró.
--
-- Las coordenadas son APROXIMADAS: OpenStreetMap tiene la Av. El Éxodo pero
-- no la altura 750. Se ajustan desde el panel (Contenido del sitio →
-- Contacto) con el punto exacto de Google Maps.

do $$
begin
  if not exists (select 1 from public.contacto) then

    insert into public.contacto (telefono, email, whatsapp, direccion, lat, lng, horarios) values (
      '388 465-2485',
      'ventas@autoshopjujuy.com.ar',
      '+54 9 388 465-2485',
      'Av. Éxodo 750, San Salvador de Jujuy',
      -24.19541,
      -65.29769,
      '[
        {"dias": "Lunes a viernes", "horas": "9:30 a 13:30 · 17:15 a 21:30"},
        {"dias": "Sábados",         "horas": "9:30 a 13:40"}
      ]'::jsonb
    );

    insert into public.segmentos (id, titulo, texto, etiqueta, imagen_url, imagen_ruta, ancho, alto, orden) values
      ('ciudad', 'Ciudad',
       'Para moverte por el centro y estacionar en Belgrano sin pelearte con el auto. Bajo consumo y caja automática.',
       'URBANO', '/img/segmentos/segmento-3.webp', null, 1600, 1066, 0),
      ('ruta', 'Ruta',
       'Para hacer la 9 hasta Salta o bajar a Perico seguido. Motor con aire, estabilidad y baúl que aguanta el fin de semana.',
       'CARRETERA', '/img/segmentos/segmento-1.webp', null, 1600, 1066, 1),
      ('aventura', 'Aventura',
       'Para subir a la Quebrada, a Purmamarca o al Salinas Grandes por ripio. Tracción, despeje y neumáticos que banquen la altura.',
       '4X4', '/img/segmentos/segmento-4.webp', null, 1600, 1066, 2),
      ('escapada', 'Escapada',
       'Para irte el finde a Termas de Reyes o a Tilcara con la familia. Consumo bajo y espacio para cuatro con equipaje.',
       'FAMILIA', '/img/segmentos/segmento-2.webp', null, 1600, 954, 3)
    on conflict (id) do nothing;

  end if;
end;
$$;

commit;
