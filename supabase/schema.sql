-- ════════════════════════════════════════════════════════════════════════
--  AUTOSHOP JUJUY — esquema de Supabase
-- ════════════════════════════════════════════════════════════════════════
--
--  Se pega ENTERO en el SQL Editor de Supabase y se corre de una vez.
--  Es idempotente: correrlo de nuevo no rompe ni duplica nada. Todo va en una
--  transacción, así que si algo falla no queda nada a medias.
--
--  Refleja los tipos de `src/types/vehiculo.ts` y `src/types/contenido.ts`.
--  Las columnas van en snake_case (`creado_en`) y el repositorio las traduce a
--  camelCase (`creadoEn`) al leer.
--
--  LOS IDS SON TEXTO, NO UUID: el panel arma algunos en el navegador
--  (`etq-nueva-...`, los de fotos y servicios nuevos) y el contenido sembrado
--  tiene ids legibles (`seguros`, `entregadas`). Si no se manda uno, la base
--  pone un uuid en formato texto.
--
--  Qué NO hace este archivo: borrar archivos del storage. Supabase no deja
--  borrarlos desde SQL; al eliminar una unidad o una foto, el repositorio
--  tiene que borrar también el archivo con la API de Storage (usando `ruta`).
-- ════════════════════════════════════════════════════════════════════════

begin;

-- ── Extensiones ─────────────────────────────────────────────────────────
-- unaccent: el buscador del catálogo ignora acentos ("citroen" encuentra
--   "Citroën"), igual que hace hoy el mock.
-- pg_trgm: índice para buscar un pedazo de texto en cualquier parte.
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm  with schema extensions;


-- ════════════════════════════════════════════════════════════════════════
--  1. ADMINS
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.admins (
  email     text primary key check (email = lower(email)),
  creado_en timestamptz not null default now()
);

comment on table public.admins is
  'Emails que pueden escribir en el sitio. Se administra SOLO desde el SQL Editor.';

-- ¿El usuario que hace el pedido es admin?
--
-- Se busca por el id de la sesión (auth.uid()) en auth.users, y no por el
-- email que viene adentro del token, y además se exige el email CONFIRMADO.
-- Así una cuenta registrada con el email de otra persona, sin haberlo
-- confirmado, no pasa.
--
-- `security definer` porque tiene que leer auth.users y public.admins, que
-- el visitante no puede leer. `search_path = ''` para que nadie pueda
-- colarle una tabla con el mismo nombre en otro esquema.
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.admins a on a.email = lower(u.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;

-- La llaman las políticas (también para visitantes anónimos, que dan false)
-- y la puede llamar el panel para saber si la cuenta está habilitada.
revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════
--  2. VEHÍCULOS
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.vehiculos (
  id             text primary key default gen_random_uuid()::text,
  -- Parte visible de la URL: /vehiculo/:slug. Misma forma que `SLUG_VALIDO`.
  slug           text not null unique
                 check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo         text not null check (length(trim(titulo)) > 0),
  descripcion    text not null default '',
  condicion      text not null check (condicion in ('0km', 'usado')),
  -- Pesos argentinos. null = "Consultar precio".
  precio         bigint check (precio >= 0),
  anio           smallint check (anio between 1900 and 2100),
  -- En un 0km es 0; null = "no lo sé todavía".
  km             integer check (km >= 0),
  estado         text not null default 'disponible'
                 check (estado in ('disponible', 'reservado', 'vendido')),
  -- false = borrador: existe en el panel y no sale en el sitio.
  publicado      boolean not null default false,
  destacado      boolean not null default false,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  -- Título + descripción en minúsculas y sin acentos. La llena el trigger de
  -- abajo; el buscador filtra con `busqueda ilike '%texto%'`.
  busqueda       text not null default ''
);

-- Índices de los filtros y órdenes del catálogo y del panel.
-- (El slug ya tiene índice por ser `unique`.)
create index if not exists vehiculos_publicado_creado_idx
  on public.vehiculos (publicado, creado_en desc);
create index if not exists vehiculos_destacados_idx
  on public.vehiculos (creado_en desc) where publicado and destacado;
create index if not exists vehiculos_condicion_idx
  on public.vehiculos (condicion);
create index if not exists vehiculos_estado_idx
  on public.vehiculos (estado);
create index if not exists vehiculos_precio_idx
  on public.vehiculos (precio);
create index if not exists vehiculos_actualizado_idx
  on public.vehiculos (actualizado_en desc);
create index if not exists vehiculos_busqueda_idx
  on public.vehiculos using gin (busqueda extensions.gin_trgm_ops);

-- Antes de cada alta o cambio: recalcula `busqueda` y, en los cambios,
-- pone `actualizado_en` en ahora (el panel ordena por eso).
-- El unaccent va con el diccionario escrito entero porque con
-- `search_path = ''` no lo encuentra solo.
create or replace function public.vehiculos_antes_de_guardar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.busqueda := lower(extensions.unaccent(
    'extensions.unaccent'::regdictionary,
    coalesce(new.titulo, '') || ' ' || coalesce(new.descripcion, '')
  ));
  if tg_op = 'UPDATE' then
    new.actualizado_en := now();
  end if;
  return new;
end;
$$;

drop trigger if exists vehiculos_antes_de_guardar on public.vehiculos;
create trigger vehiculos_antes_de_guardar
  before insert or update on public.vehiculos
  for each row execute function public.vehiculos_antes_de_guardar();


-- ── Fotos ───────────────────────────────────────────────────────────────

create table if not exists public.fotos (
  id          text primary key default gen_random_uuid()::text,
  -- Borrar la unidad borra sus fotos.
  vehiculo_id text not null references public.vehiculos (id) on delete cascade,
  -- Dirección pública del archivo, lista para el <img>.
  url         text not null,
  -- Camino dentro del bucket `vehiculos` (ej. `<vehiculo_id>/foto-abc.webp`).
  -- Lo usa el repositorio para borrar el archivo. null si no está en el bucket.
  ruta        text,
  -- Dimensiones reales: van al <img> para que no haya salto de layout.
  ancho       integer not null check (ancho > 0),
  alto        integer not null check (alto > 0),
  -- 0 es la portada.
  orden       smallint not null default 0 check (orden >= 0),
  -- Para que una etiqueta solo pueda apuntar a una foto de SU unidad.
  unique (vehiculo_id, id)
);

create index if not exists fotos_vehiculo_orden_idx
  on public.fotos (vehiculo_id, orden);

-- Tope de 10 fotos por unidad (`MAX_FOTOS`), también en la base: el panel
-- ya lo controla, esto es para que ni un error ni dos subidas a la vez lo
-- pasen. El `for update` hace esperar a la segunda subida hasta que la
-- primera termine de contar.
create or replace function public.fotos_tope()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.vehiculos where id = new.vehiculo_id for update;
  if (select count(*) from public.fotos where vehiculo_id = new.vehiculo_id) >= 10 then
    raise exception 'Son 10 fotos como máximo por unidad.';
  end if;
  return new;
end;
$$;

drop trigger if exists fotos_tope on public.fotos;
create trigger fotos_tope
  before insert on public.fotos
  for each row execute function public.fotos_tope();


-- ── Video (uno o ninguno por unidad) ────────────────────────────────────

create table if not exists public.videos (
  -- La clave ES la unidad: no puede haber dos videos para el mismo auto.
  -- Borrar la unidad borra su video.
  vehiculo_id text primary key references public.vehiculos (id) on delete cascade,
  url         text not null,
  ruta        text,
  -- Primer frame. Puede ser la portada de la unidad (es a lo que se cae el
  -- panel si no hay póster propio): antes de borrar `poster_ruta` del bucket,
  -- el repositorio tiene que fijarse que ninguna foto la use.
  poster_url  text not null,
  poster_ruta text,
  peso_bytes  bigint not null default 0 check (peso_bytes >= 0)
);


-- ── Etiquetas ───────────────────────────────────────────────────────────

create table if not exists public.etiquetas (
  id            text primary key default gen_random_uuid()::text,
  -- Borrar la unidad borra sus etiquetas.
  vehiculo_id   text not null references public.vehiculos (id) on delete cascade,
  titulo        text not null,
  texto         text not null default '',
  -- Una foto de la MISMA unidad, o null para fondo liso. Si se borra la foto,
  -- la etiqueta queda sin fondo (no se borra ni queda rota).
  foto_fondo_id text,
  orden         smallint not null default 0 check (orden >= 0),
  foreign key (vehiculo_id, foto_fondo_id)
    references public.fotos (vehiculo_id, id)
    on delete set null (foto_fondo_id)
);

create index if not exists etiquetas_vehiculo_orden_idx
  on public.etiquetas (vehiculo_id, orden);
create index if not exists etiquetas_foto_fondo_idx
  on public.etiquetas (vehiculo_id, foto_fondo_id);


-- ── Tocar una foto, el video o una etiqueta "actualiza" la unidad ───────
-- Igual que el mock: el listado del panel ordena por lo último tocado, y
-- subir una foto es tocar la unidad.
create or replace function public.tocar_vehiculo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.vehiculos
     set actualizado_en = now()
   where id = coalesce(new.vehiculo_id, old.vehiculo_id);
  return null;
end;
$$;

drop trigger if exists fotos_tocan_vehiculo on public.fotos;
create trigger fotos_tocan_vehiculo
  after insert or update or delete on public.fotos
  for each row execute function public.tocar_vehiculo();

drop trigger if exists videos_tocan_vehiculo on public.videos;
create trigger videos_tocan_vehiculo
  after insert or update or delete on public.videos
  for each row execute function public.tocar_vehiculo();

drop trigger if exists etiquetas_tocan_vehiculo on public.etiquetas;
create trigger etiquetas_tocan_vehiculo
  after insert or update or delete on public.etiquetas
  for each row execute function public.tocar_vehiculo();


-- ════════════════════════════════════════════════════════════════════════
--  3. CONTENIDO DEL INICIO
-- ════════════════════════════════════════════════════════════════════════

-- Ajustes generales. UNA sola fila (el `check (id)` impide una segunda).
create table if not exists public.sitio (
  id       boolean primary key default true check (id),
  -- Año en que abrió el salón. De acá sale la cifra "Años en Jujuy".
  apertura smallint not null check (apertura between 1900 and 2100)
);

-- Las cuatro cifras de la franja ámbar. Son FIJAS: se editan, no se agregan
-- ni se borran (ver las políticas más abajo).
create table if not exists public.contadores (
  id             text primary key,
  -- Ignorado si `desde_apertura`: esa cifra se calcula sola.
  valor          integer not null default 0 check (valor >= 0),
  sufijo         text not null default '' check (sufijo in ('', '+', '%')),
  etiqueta       text not null,
  desde_apertura boolean not null default false,
  orden          smallint not null default 0 check (orden >= 0)
);

create table if not exists public.servicios (
  id      text primary key default gen_random_uuid()::text,
  -- Se elige de `ICONOS_SERVICIO`; nunca se sube un ícono.
  icono   text not null
          check (icono in ('seguro', 'escaneo', 'garantia', 'limpieza', 'aceite', 'llave')),
  titulo  text not null,
  -- Pesos argentinos, o null cuando depende de la unidad.
  precio  bigint check (precio >= 0),
  detalle text not null default '',
  orden   smallint not null default 0 check (orden >= 0)
);

create table if not exists public.preguntas (
  id        text primary key default gen_random_uuid()::text,
  pregunta  text not null,
  respuesta text not null,
  orden     smallint not null default 0 check (orden >= 0)
);

create index if not exists contadores_orden_idx on public.contadores (orden);
create index if not exists servicios_orden_idx  on public.servicios  (orden);
create index if not exists preguntas_orden_idx  on public.preguntas  (orden);


-- ════════════════════════════════════════════════════════════════════════
--  4. PERMISOS DE BASE
-- ════════════════════════════════════════════════════════════════════════
-- Primera capa, antes de RLS: el visitante anónimo solo puede LEER; ni
-- siquiera llega a intentar escribir. Quien decide QUÉ filas ve cada uno
-- son las políticas de la sección 5.

revoke all on
  public.admins, public.vehiculos, public.fotos, public.videos, public.etiquetas,
  public.sitio, public.contadores, public.servicios, public.preguntas
from anon, authenticated;

grant select on
  public.vehiculos, public.fotos, public.videos, public.etiquetas,
  public.sitio, public.contadores, public.servicios, public.preguntas
to anon, authenticated;

grant insert, update, delete on
  public.vehiculos, public.fotos, public.videos, public.etiquetas,
  public.servicios, public.preguntas
to authenticated;

-- Ajustes y contadores: solo se modifican, nunca se agregan ni se borran.
grant update on public.sitio, public.contadores to authenticated;

-- La tabla de admins no se toca desde la web: solo se puede leer (y RLS
-- lo limita a los propios admins).
grant select on public.admins to authenticated;


-- ════════════════════════════════════════════════════════════════════════
--  5. RLS — quién ve y quién escribe cada fila
-- ════════════════════════════════════════════════════════════════════════
-- Con RLS encendido, una tabla SIN política no deja pasar nada. Cada
-- política de abajo abre una puerta concreta.
--
-- `(select public.es_admin())` va entre paréntesis con select para que la
-- base lo calcule una vez por pedido y no una vez por fila.

alter table public.admins     enable row level security;
alter table public.vehiculos  enable row level security;
alter table public.fotos      enable row level security;
alter table public.videos     enable row level security;
alter table public.etiquetas  enable row level security;
alter table public.sitio      enable row level security;
alter table public.contadores enable row level security;
alter table public.servicios  enable row level security;
alter table public.preguntas  enable row level security;


-- ── admins ──────────────────────────────────────────────────────────────

-- Protege la lista de emails habilitados: nadie de afuera puede ver quién
-- administra el sitio. Un admin sí puede verla.
-- No hay políticas de escritura A PROPÓSITO: ni siquiera un admin puede
-- sumar a otro desde la web. Se agregan solo desde el SQL Editor (ver el
-- final del archivo), que es un lugar al que solo entra el dueño del proyecto.
drop policy if exists "admins: la ven solo los admins" on public.admins;
create policy "admins: la ven solo los admins"
  on public.admins for select
  to authenticated
  using ((select public.es_admin()));


-- ── vehiculos ───────────────────────────────────────────────────────────

-- Protege los borradores. Un visitante ve SOLO las unidades publicadas: una
-- consulta por id o por slug de un borrador devuelve vacío, igual que si no
-- existiera. Los admins ven todo (así el panel lista y previsualiza borradores).
drop policy if exists "vehiculos: publicados para todos, todo para admins" on public.vehiculos;
create policy "vehiculos: publicados para todos, todo para admins"
  on public.vehiculos for select
  to anon, authenticated
  using (publicado or (select public.es_admin()));

-- Protege el catálogo de altas falsas: solo un admin crea unidades.
drop policy if exists "vehiculos: crean solo admins" on public.vehiculos;
create policy "vehiculos: crean solo admins"
  on public.vehiculos for insert
  to authenticated
  with check ((select public.es_admin()));

-- Protege precios, textos y el estado de publicación: solo un admin los
-- cambia. `using` elige qué filas puede tocar y `with check` controla cómo
-- quedan después del cambio.
drop policy if exists "vehiculos: modifican solo admins" on public.vehiculos;
create policy "vehiculos: modifican solo admins"
  on public.vehiculos for update
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- Protege el catálogo de bajas: solo un admin borra una unidad (y con ella,
-- en cascada, sus fotos, su video y sus etiquetas).
drop policy if exists "vehiculos: borran solo admins" on public.vehiculos;
create policy "vehiculos: borran solo admins"
  on public.vehiculos for delete
  to authenticated
  using ((select public.es_admin()));


-- ── fotos, videos y etiquetas ───────────────────────────────────────────
-- Las tres siguen la misma regla: se ven si la unidad a la que pertenecen
-- está publicada. Sin esto, alguien podría pedir directamente las fotos o
-- etiquetas de un borrador conociendo el id de la unidad, aunque la unidad
-- en sí esté oculta.

-- Protege las fotos de los borradores.
drop policy if exists "fotos: solo de unidades publicadas, todo para admins" on public.fotos;
create policy "fotos: solo de unidades publicadas, todo para admins"
  on public.fotos for select
  to anon, authenticated
  using (
    exists (select 1 from public.vehiculos v where v.id = vehiculo_id and v.publicado)
    or (select public.es_admin())
  );

-- Protege las fotos de cambios ajenos: subir, reordenar y borrar es solo
-- para admins.
drop policy if exists "fotos: escriben solo admins" on public.fotos;
create policy "fotos: escriben solo admins"
  on public.fotos for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- Protege el video de los borradores.
drop policy if exists "videos: solo de unidades publicadas, todo para admins" on public.videos;
create policy "videos: solo de unidades publicadas, todo para admins"
  on public.videos for select
  to anon, authenticated
  using (
    exists (select 1 from public.vehiculos v where v.id = vehiculo_id and v.publicado)
    or (select public.es_admin())
  );

-- Protege el video de cambios ajenos: subir, reemplazar y borrar es solo
-- para admins.
drop policy if exists "videos: escriben solo admins" on public.videos;
create policy "videos: escriben solo admins"
  on public.videos for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- Protege las etiquetas de los borradores.
drop policy if exists "etiquetas: solo de unidades publicadas, todo para admins" on public.etiquetas;
create policy "etiquetas: solo de unidades publicadas, todo para admins"
  on public.etiquetas for select
  to anon, authenticated
  using (
    exists (select 1 from public.vehiculos v where v.id = vehiculo_id and v.publicado)
    or (select public.es_admin())
  );

-- Protege las etiquetas de cambios ajenos: solo un admin las escribe.
drop policy if exists "etiquetas: escriben solo admins" on public.etiquetas;
create policy "etiquetas: escriben solo admins"
  on public.etiquetas for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));


-- ── contenido del inicio ────────────────────────────────────────────────
-- Todo es público para leer: es lo que se muestra en la portada.

-- Deja leer el año de apertura a cualquiera.
drop policy if exists "sitio: lectura pública" on public.sitio;
create policy "sitio: lectura pública"
  on public.sitio for select
  to anon, authenticated
  using (true);

-- Protege el año de apertura: solo un admin lo cambia. No hay política de
-- alta ni de baja: la fila única no se puede borrar ni duplicar.
drop policy if exists "sitio: modifican solo admins" on public.sitio;
create policy "sitio: modifican solo admins"
  on public.sitio for update
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- Deja leer las cifras de la franja a cualquiera.
drop policy if exists "contadores: lectura pública" on public.contadores;
create policy "contadores: lectura pública"
  on public.contadores for select
  to anon, authenticated
  using (true);

-- Protege las cifras: solo un admin las cambia. Tampoco hay alta ni baja,
-- así que siempre son exactamente cuatro.
-- OJO al programar el guardado: tiene que ser UPDATE fila por fila. Un
-- upsert falla, porque upsert pide permiso de alta y acá no lo hay.
drop policy if exists "contadores: modifican solo admins" on public.contadores;
create policy "contadores: modifican solo admins"
  on public.contadores for update
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- Deja leer los servicios a cualquiera.
drop policy if exists "servicios: lectura pública" on public.servicios;
create policy "servicios: lectura pública"
  on public.servicios for select
  to anon, authenticated
  using (true);

-- Protege los servicios y sus precios: agregar, cambiar, reordenar y borrar
-- es solo para admins.
drop policy if exists "servicios: escriben solo admins" on public.servicios;
create policy "servicios: escriben solo admins"
  on public.servicios for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- Deja leer las preguntas frecuentes a cualquiera.
drop policy if exists "preguntas: lectura pública" on public.preguntas;
create policy "preguntas: lectura pública"
  on public.preguntas for select
  to anon, authenticated
  using (true);

-- Protege las preguntas y respuestas: agregar, cambiar, reordenar y borrar
-- es solo para admins.
drop policy if exists "preguntas: escriben solo admins" on public.preguntas;
create policy "preguntas: escriben solo admins"
  on public.preguntas for all
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));


-- ════════════════════════════════════════════════════════════════════════
--  6. STORAGE — bucket `vehiculos`
-- ════════════════════════════════════════════════════════════════════════
-- Público: cada archivo se sirve por su dirección pública sin pedir sesión,
-- que es lo que necesita un <img> del catálogo.
-- 25 MB por archivo (el tope del video en el panel, `MAX_VIDEO_BYTES`).
-- Tipos: las fotos que arma el panel (WebP, o JPEG si el navegador no sabe
-- hacer WebP), PNG por las dudas, y los tres formatos de video del panel.
-- SVG NO: un SVG puede llevar código adentro, y en un bucket público eso es
-- una puerta abierta.
-- Si se corre de nuevo, pisa la configuración con la de acá.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehiculos',
  'vehiculos',
  true,
  26214400,  -- 25 × 1024 × 1024
  array[
    'image/webp', 'image/jpeg', 'image/png',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Sobre la LECTURA: no hay política de lectura pública a propósito. En un
-- bucket público los archivos se descargan por su dirección sin pasar por
-- estas políticas; lo que sí pasaría por acá es LISTAR el bucket. Sin
-- política, un visitante no puede listar y ver las fotos de los borradores:
-- solo llega a un archivo si ya tiene su dirección, y las direcciones de un
-- borrador solo están en tablas que no puede leer.

-- Protege el listado del bucket: solo un admin puede ver qué archivos hay.
-- (Hace falta también para que el panel pueda reemplazar un archivo.)
drop policy if exists "vehiculos: listan solo admins" on storage.objects;
create policy "vehiculos: listan solo admins"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'vehiculos' and (select public.es_admin()));

-- Protege el bucket de subidas ajenas: solo un admin sube fotos y videos.
drop policy if exists "vehiculos: suben solo admins" on storage.objects;
create policy "vehiculos: suben solo admins"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'vehiculos' and (select public.es_admin()));

-- Protege los archivos ya subidos: solo un admin los reemplaza.
drop policy if exists "vehiculos: reemplazan solo admins" on storage.objects;
create policy "vehiculos: reemplazan solo admins"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'vehiculos' and (select public.es_admin()))
  with check (bucket_id = 'vehiculos' and (select public.es_admin()));

-- Protege los archivos de borrados ajenos: solo un admin los borra.
drop policy if exists "vehiculos: borran solo admins" on storage.objects;
create policy "vehiculos: borran solo admins"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'vehiculos' and (select public.es_admin()));


-- ════════════════════════════════════════════════════════════════════════
--  7. CONTENIDO INICIAL
-- ════════════════════════════════════════════════════════════════════════
-- Lo mismo que hoy muestra el sitio (`src/data/repo/semilla-contenido.ts`).
-- Se carga UNA sola vez en la vida del proyecto: la primera corrida crea la
-- fila de `sitio` y, desde ahí, volver a correr el archivo no toca nada.
-- Así no reaparece un servicio o una pregunta que la dueña borró.
-- Los servicios son reales; las cifras de los contadores y las respuestas de
-- la FAQ son verosímiles pero inventadas: se corrigen editándolas en el panel.

do $$
begin
  if not exists (select 1 from public.sitio) then

    insert into public.sitio (apertura) values (2023);

    insert into public.contadores (id, valor, sufijo, etiqueta, desde_apertura, orden) values
      ('entregadas',   500, '+', 'Unidades entregadas', false, 0),
      ('marcas',        12, '',  'Marcas en el salón',  false, 1),
      ('anios',          0, '',  'Años en Jujuy',       true,  2),
      ('financiacion', 100, '%', 'Financiación propia', false, 3)
    on conflict (id) do nothing;

    insert into public.servicios (id, icono, titulo, precio, detalle, orden) values
      ('seguros',  'seguro',   'Seguros',                        null,   'Con débito automático',              0),
      ('escaneo',  'escaneo',  'Escaneo vehicular',              35000,  '',                                   1),
      ('garantia', 'garantia', 'Garantía para tu vehículo',      null,   'Con débito automático',              2),
      ('limpieza', 'limpieza', 'Limpieza de interiores + motor', 125000, 'Reservá tu turno',                   3),
      ('filtros',  'aceite',   'Service de filtros y aceite',    null,   'Consultá el precio según tu unidad', 4)
    on conflict (id) do nothing;

    insert into public.preguntas (id, pregunta, respuesta, orden) values
      ('usado-parte-de-pago',
       '¿Toman mi usado como parte de pago?',
       'Sí, y es la forma en que se cierra la mayoría de las operaciones. Traés la unidad, la tasamos en el momento con la guía oficial y el estado real del auto, y ese valor se descuenta del precio. Si el usado vale más que la diferencia, la devolución se hace por transferencia el mismo día del boleto.',
       0),
      ('financiacion-sin-recibo',
       '¿Puedo financiar sin recibo de sueldo?',
       'Sí. Con financiación propia trabajamos con monotributistas, comerciantes y trabajadores independientes: alcanza con facturación de los últimos seis meses o movimientos bancarios. El anticipo mínimo en esos casos es del 40% y el plazo máximo, 36 cuotas.',
       1),
      ('transferencia-patentamiento',
       '¿Quién se encarga de la transferencia y el patentamiento?',
       'Nosotros. El trámite lo hace nuestra gestoría en el Registro Automotor de San Salvador y el costo ya está incluido en el precio publicado. Los usados se entregan con la transferencia iniciada y el 0km, patentado a tu nombre.',
       2),
      ('garantia-usados',
       '¿Qué garantía tienen los usados?',
       'Seis meses o 10.000 km, lo que ocurra primero, sobre motor, caja y diferencial. Antes de publicarla, cada unidad pasa por un chequeo de 42 puntos y por verificación policial. El informe queda a tu disposición antes de firmar.',
       3),
      ('permuta',
       '¿Hacen permuta entre dos usados?',
       'Sí, siempre que las dos unidades estén libres de deuda y de prenda. Si la diferencia queda a tu favor te la abonamos por transferencia; si queda en contra, se puede financiar hasta en 24 cuotas.',
       4),
      ('demora-0km',
       '¿Cuánto demora la entrega de un 0km?',
       'Entre 15 y 45 días según el modelo y el color. Lo que hay en stock en el salón se entrega en 72 horas una vez completada la documentación. Si el modelo viene por pedido, te damos la fecha estimada por escrito antes de tomar la seña.',
       5)
    on conflict (id) do nothing;

  end if;
end;
$$;

commit;


-- ════════════════════════════════════════════════════════════════════════
--  8. AGREGAR UN ADMIN
-- ════════════════════════════════════════════════════════════════════════
-- Antes: crear el usuario en Authentication → Users (ver PASOS.md).
-- Después: sacarle los dos guiones del principio a la línea de abajo, poner
-- el email EN MINÚSCULAS, seleccionar SOLO esa línea y ejecutarla.
-- Para sumar a otra persona (por ejemplo, la dueña), repetir con su email.

-- insert into public.admins (email) values ('tu-email@ejemplo.com') on conflict (email) do nothing;

-- Para sacarle el acceso a alguien:
-- delete from public.admins where email = 'email-a-sacar@ejemplo.com';
