-- ════════════════════════════════════════════════════════════════════════
--  ESQUEMA COMPLETO DEL SITIO — para un proyecto NUEVO de Supabase
-- ════════════════════════════════════════════════════════════════════════
--
--  Consolida, en orden, los tres archivos del proyecto original:
--    1. schema.sql                   admins, unidades, fotos, video, etiquetas,
--                                    contenido del inicio, permisos, RLS, bucket
--    2. 002_segmentos_contacto.sql   datos de contacto (y segmentos: OPCIONAL,
--                                    al final de este archivo)
--    3. 003_etiquetas_en_tarjeta.sql la columna `etiquetas.en_tarjeta`
--
--  CÓMO SE USA: SQL Editor → New query → pegar TODO → Run. Si avisa que hay
--  operaciones destructivas, confirmar: son los `drop ... if exists` que hacen
--  que el archivo se pueda correr dos veces.
--
--  ES IDEMPOTENTE: correrlo de nuevo no rompe ni duplica nada, no borra datos
--  y no vuelve a cargar el contenido inicial (se carga UNA sola vez en la vida
--  del proyecto, así no reaparece algo que la dueña borró). Lo que NO hace es
--  cambiar columnas de tablas que ya existen: eso va con un `alter table`.
--
--  ANTES DE CORRER: buscar "REEMPLAZAR" y cambiar el contenido inicial
--  (año de apertura, contadores, servicios, preguntas, contacto) por los del
--  negocio, o dejarlo y editarlo después desde el panel.
--
--  Lo que NO hace este archivo: borrar archivos del bucket. Supabase no deja
--  borrarlos desde SQL; al eliminar una unidad o una foto, el repositorio
--  borra también el archivo con la API de Storage (usando `ruta`).
-- ════════════════════════════════════════════════════════════════════════

begin;

-- ── Extensiones ─────────────────────────────────────────────────────────
-- unaccent: el buscador ignora acentos ("citroen" encuentra "Citroën").
-- pg_trgm:  índice para buscar un pedazo de texto en cualquier parte.
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
-- Se busca por el id de la sesión (auth.uid()) en auth.users —no por el email
-- que viene en el token— y se exige el email CONFIRMADO: una cuenta creada con
-- el email de otra persona, sin confirmar, no pasa.
-- `security definer` porque lee auth.users y admins, que el visitante no puede
-- leer. `search_path = ''` para que nadie le cuele una tabla homónima.
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

-- La llaman las políticas (para anónimos da false) y el panel al iniciar sesión.
revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════
--  2. UNIDADES (tabla `vehiculos`)
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.vehiculos (
  id             text primary key default gen_random_uuid()::text,
  -- Parte visible de la URL de la ficha.
  slug           text not null unique
                 check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo         text not null check (length(trim(titulo)) > 0),
  descripcion    text not null default '',
  condicion      text not null check (condicion in ('0km', 'usado')),
  -- Pesos. null = "Consultar precio".
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
  -- Título + descripción en minúsculas y sin acentos. Lo llena el trigger.
  busqueda       text not null default ''
);

create index if not exists vehiculos_publicado_creado_idx
  on public.vehiculos (publicado, creado_en desc);
create index if not exists vehiculos_destacados_idx
  on public.vehiculos (creado_en desc) where publicado and destacado;
create index if not exists vehiculos_condicion_idx  on public.vehiculos (condicion);
create index if not exists vehiculos_estado_idx     on public.vehiculos (estado);
create index if not exists vehiculos_precio_idx     on public.vehiculos (precio);
create index if not exists vehiculos_actualizado_idx on public.vehiculos (actualizado_en desc);
create index if not exists vehiculos_busqueda_idx
  on public.vehiculos using gin (busqueda extensions.gin_trgm_ops);

-- Recalcula `busqueda` y, en los cambios, mueve `actualizado_en`.
-- El diccionario de unaccent va escrito entero: con `search_path = ''` no lo
-- encuentra solo.
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
  vehiculo_id text not null references public.vehiculos (id) on delete cascade,
  url         text not null,
  -- Camino en el bucket (`<vehiculo_id>/foto-xxx.webp`). null = no está en el bucket.
  ruta        text,
  -- Dimensiones REALES: van al <img> para que no haya salto de layout.
  ancho       integer not null check (ancho > 0),
  alto        integer not null check (alto > 0),
  -- 0 es la portada.
  orden       smallint not null default 0 check (orden >= 0),
  -- Para que una etiqueta solo pueda apuntar a una foto de SU unidad.
  unique (vehiculo_id, id)
);

create index if not exists fotos_vehiculo_orden_idx on public.fotos (vehiculo_id, orden);

-- Tope de 10 fotos por unidad también en la base. El `for update` hace
-- esperar a una segunda subida simultánea hasta que la primera termine de contar.
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
  -- La clave ES la unidad: no puede haber dos videos para la misma.
  vehiculo_id text primary key references public.vehiculos (id) on delete cascade,
  url         text not null,
  ruta        text,
  -- Puede ser la portada de la unidad: antes de borrar `poster_ruta` del
  -- bucket, el repositorio se fija que ninguna foto la use.
  poster_url  text not null,
  poster_ruta text,
  peso_bytes  bigint not null default 0 check (peso_bytes >= 0)
);


-- ── Etiquetas ───────────────────────────────────────────────────────────

create table if not exists public.etiquetas (
  id            text primary key default gen_random_uuid()::text,
  vehiculo_id   text not null references public.vehiculos (id) on delete cascade,
  titulo        text not null,
  texto         text not null default '',
  -- Una foto de la MISMA unidad, o null. Si se borra la foto, queda sin fondo.
  foto_fondo_id text,
  orden         smallint not null default 0 check (orden >= 0),
  -- Sale también en la card, junto al precio (máx. 2: lo controla el panel).
  en_tarjeta    boolean not null default false,
  foreign key (vehiculo_id, foto_fondo_id)
    references public.fotos (vehiculo_id, id)
    on delete set null (foto_fondo_id)
);

-- Para bases creadas con una versión anterior (ex 003): agrega la columna si falta.
alter table public.etiquetas
  add column if not exists en_tarjeta boolean not null default false;

create index if not exists etiquetas_vehiculo_orden_idx on public.etiquetas (vehiculo_id, orden);
create index if not exists etiquetas_foto_fondo_idx     on public.etiquetas (vehiculo_id, foto_fondo_id);


-- ── Tocar una foto, el video o una etiqueta "actualiza" la unidad ───────
-- El listado del panel ordena por lo último tocado.

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
--  3. CONTENIDO DEL SITIO
-- ════════════════════════════════════════════════════════════════════════

-- Ajustes generales. UNA sola fila (el `check (id)` impide una segunda).
create table if not exists public.sitio (
  id       boolean primary key default true check (id),
  -- Año de apertura: de acá sale la cifra de años, que se calcula sola.
  apertura smallint not null check (apertura between 1900 and 2100)
);

-- Las cuatro cifras de la franja. FIJAS: se editan, no se agregan ni se borran.
create table if not exists public.contadores (
  id             text primary key,
  valor          integer not null default 0 check (valor >= 0),
  sufijo         text not null default '' check (sufijo in ('', '+', '%')),
  etiqueta       text not null,
  desde_apertura boolean not null default false,
  orden          smallint not null default 0 check (orden >= 0)
);

create table if not exists public.servicios (
  id      text primary key default gen_random_uuid()::text,
  -- REEMPLAZAR la lista de íconos por la del diseño nuevo: tiene que coincidir
  -- con `ICONOS_SERVICIO` de src/types/contenido.ts. Se eligen, nunca se suben.
  icono   text not null
          check (icono in ('seguro', 'escaneo', 'garantia', 'limpieza', 'aceite', 'llave')),
  titulo  text not null,
  -- Pesos, o null cuando depende de la unidad.
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

-- Datos de contacto. UNA sola fila.
create table if not exists public.contacto (
  id        boolean primary key default true check (id),
  telefono  text not null default '',
  email     text not null default '',
  -- Como lo escribe la dueña; el link de wa.me lo arma el sitio. Obligatorio.
  whatsapp  text not null check (length(trim(whatsapp)) > 0),
  direccion text not null default '',
  -- El mapa y «Cómo llegar» usan esto, no el texto.
  lat       double precision not null check (lat between -90 and 90),
  lng       double precision not null check (lng between -180 and 180),
  -- [{ "dias": "...", "horas": "..." }]
  horarios  jsonb not null default '[]'::jsonb
            check (jsonb_typeof(horarios) = 'array')
);

create index if not exists contadores_orden_idx on public.contadores (orden);
create index if not exists servicios_orden_idx  on public.servicios  (orden);
create index if not exists preguntas_orden_idx  on public.preguntas  (orden);


-- ════════════════════════════════════════════════════════════════════════
--  4. PERMISOS DE BASE (primera capa, antes de RLS)
-- ════════════════════════════════════════════════════════════════════════
-- ⚠ Supabase le da por defecto privilegios a `anon` sobre toda tabla nueva de
-- `public`. Por eso primero se revoca TODO y después se da solo lo necesario.

revoke all on
  public.admins, public.vehiculos, public.fotos, public.videos, public.etiquetas,
  public.sitio, public.contadores, public.servicios, public.preguntas, public.contacto
from anon, authenticated;

grant select on
  public.vehiculos, public.fotos, public.videos, public.etiquetas,
  public.sitio, public.contadores, public.servicios, public.preguntas, public.contacto
to anon, authenticated;

grant insert, update, delete on
  public.vehiculos, public.fotos, public.videos, public.etiquetas,
  public.servicios, public.preguntas
to authenticated;

-- Filas fijas: solo se modifican. (Por eso el panel guarda contadores, sitio y
-- contacto con UPDATE: un upsert pide permiso de alta y falla.)
grant update on public.sitio, public.contadores, public.contacto to authenticated;

-- La tabla de admins no se toca desde la web.
grant select on public.admins to authenticated;


-- ════════════════════════════════════════════════════════════════════════
--  5. RLS — quién ve y quién escribe cada fila
-- ════════════════════════════════════════════════════════════════════════
-- Con RLS encendido, una tabla SIN política no deja pasar nada.
-- `(select public.es_admin())` entre paréntesis para que se calcule una vez
-- por pedido y no una vez por fila.

alter table public.admins     enable row level security;
alter table public.vehiculos  enable row level security;
alter table public.fotos      enable row level security;
alter table public.videos     enable row level security;
alter table public.etiquetas  enable row level security;
alter table public.sitio      enable row level security;
alter table public.contadores enable row level security;
alter table public.servicios  enable row level security;
alter table public.preguntas  enable row level security;
alter table public.contacto   enable row level security;

-- ── admins ──────────────────────────────────────────────────────────────
-- Solo un admin ve la lista. Sin políticas de escritura A PROPÓSITO: los admins
-- se agregan solo desde el SQL Editor.
drop policy if exists "admins: la ven solo los admins" on public.admins;
create policy "admins: la ven solo los admins"
  on public.admins for select to authenticated
  using ((select public.es_admin()));

-- ── vehiculos ───────────────────────────────────────────────────────────
-- Un visitante ve SOLO publicadas; un borrador pedido por id o slug devuelve vacío.
drop policy if exists "vehiculos: publicados para todos, todo para admins" on public.vehiculos;
create policy "vehiculos: publicados para todos, todo para admins"
  on public.vehiculos for select to anon, authenticated
  using (publicado or (select public.es_admin()));

drop policy if exists "vehiculos: crean solo admins" on public.vehiculos;
create policy "vehiculos: crean solo admins"
  on public.vehiculos for insert to authenticated
  with check ((select public.es_admin()));

drop policy if exists "vehiculos: modifican solo admins" on public.vehiculos;
create policy "vehiculos: modifican solo admins"
  on public.vehiculos for update to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

drop policy if exists "vehiculos: borran solo admins" on public.vehiculos;
create policy "vehiculos: borran solo admins"
  on public.vehiculos for delete to authenticated
  using ((select public.es_admin()));

-- ── fotos, videos y etiquetas ───────────────────────────────────────────
-- Se ven si la unidad está publicada. Sin esto, alguien podría pedir las fotos
-- de un borrador conociendo el id de la unidad.
drop policy if exists "fotos: solo de unidades publicadas, todo para admins" on public.fotos;
create policy "fotos: solo de unidades publicadas, todo para admins"
  on public.fotos for select to anon, authenticated
  using (
    exists (select 1 from public.vehiculos v where v.id = vehiculo_id and v.publicado)
    or (select public.es_admin())
  );

drop policy if exists "fotos: escriben solo admins" on public.fotos;
create policy "fotos: escriben solo admins"
  on public.fotos for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

drop policy if exists "videos: solo de unidades publicadas, todo para admins" on public.videos;
create policy "videos: solo de unidades publicadas, todo para admins"
  on public.videos for select to anon, authenticated
  using (
    exists (select 1 from public.vehiculos v where v.id = vehiculo_id and v.publicado)
    or (select public.es_admin())
  );

drop policy if exists "videos: escriben solo admins" on public.videos;
create policy "videos: escriben solo admins"
  on public.videos for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

drop policy if exists "etiquetas: solo de unidades publicadas, todo para admins" on public.etiquetas;
create policy "etiquetas: solo de unidades publicadas, todo para admins"
  on public.etiquetas for select to anon, authenticated
  using (
    exists (select 1 from public.vehiculos v where v.id = vehiculo_id and v.publicado)
    or (select public.es_admin())
  );

drop policy if exists "etiquetas: escriben solo admins" on public.etiquetas;
create policy "etiquetas: escriben solo admins"
  on public.etiquetas for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- ── contenido: lectura pública, escritura de admins ─────────────────────
drop policy if exists "sitio: lectura pública" on public.sitio;
create policy "sitio: lectura pública"
  on public.sitio for select to anon, authenticated using (true);

drop policy if exists "sitio: modifican solo admins" on public.sitio;
create policy "sitio: modifican solo admins"
  on public.sitio for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

drop policy if exists "contadores: lectura pública" on public.contadores;
create policy "contadores: lectura pública"
  on public.contadores for select to anon, authenticated using (true);

drop policy if exists "contadores: modifican solo admins" on public.contadores;
create policy "contadores: modifican solo admins"
  on public.contadores for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

drop policy if exists "servicios: lectura pública" on public.servicios;
create policy "servicios: lectura pública"
  on public.servicios for select to anon, authenticated using (true);

drop policy if exists "servicios: escriben solo admins" on public.servicios;
create policy "servicios: escriben solo admins"
  on public.servicios for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

drop policy if exists "preguntas: lectura pública" on public.preguntas;
create policy "preguntas: lectura pública"
  on public.preguntas for select to anon, authenticated using (true);

drop policy if exists "preguntas: escriben solo admins" on public.preguntas;
create policy "preguntas: escriben solo admins"
  on public.preguntas for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

drop policy if exists "contacto: lectura pública" on public.contacto;
create policy "contacto: lectura pública"
  on public.contacto for select to anon, authenticated using (true);

drop policy if exists "contacto: modifican solo admins" on public.contacto;
create policy "contacto: modifican solo admins"
  on public.contacto for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));


-- ════════════════════════════════════════════════════════════════════════
--  6. STORAGE — bucket `vehiculos`
-- ════════════════════════════════════════════════════════════════════════
-- Público: los archivos se sirven por su dirección sin sesión (lo necesita un
-- <img>). 25 MB por archivo (el tope del video). Tipos: fotos WebP/JPEG/PNG y
-- video MP4/WebM/MOV. SVG NO: puede llevar código, y en un bucket público eso
-- es una puerta abierta. Correrlo de nuevo pisa la configuración con esta.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehiculos', 'vehiculos', true,
  26214400,  -- 25 × 1024 × 1024
  array['image/webp', 'image/jpeg', 'image/png', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Sin política de LECTURA a propósito: en un bucket público los archivos se
-- bajan por su dirección sin pasar por acá; lo que pasaría por acá es LISTAR.
-- Sin política, un visitante no puede listar el bucket y encontrar las fotos
-- de un borrador.

drop policy if exists "vehiculos: listan solo admins" on storage.objects;
create policy "vehiculos: listan solo admins"
  on storage.objects for select to authenticated
  using (bucket_id = 'vehiculos' and (select public.es_admin()));

drop policy if exists "vehiculos: suben solo admins" on storage.objects;
create policy "vehiculos: suben solo admins"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'vehiculos' and (select public.es_admin()));

drop policy if exists "vehiculos: reemplazan solo admins" on storage.objects;
create policy "vehiculos: reemplazan solo admins"
  on storage.objects for update to authenticated
  using (bucket_id = 'vehiculos' and (select public.es_admin()))
  with check (bucket_id = 'vehiculos' and (select public.es_admin()));

drop policy if exists "vehiculos: borran solo admins" on storage.objects;
create policy "vehiculos: borran solo admins"
  on storage.objects for delete to authenticated
  using (bucket_id = 'vehiculos' and (select public.es_admin()));


-- ════════════════════════════════════════════════════════════════════════
--  7. CONTENIDO INICIAL — se carga UNA sola vez
-- ════════════════════════════════════════════════════════════════════════
-- Cada bloque se carga solo si su tabla está vacía. REEMPLAZAR los valores,
-- o dejarlos y editarlos desde el panel (Contenido del sitio).

do $$
begin
  if not exists (select 1 from public.sitio) then
    insert into public.sitio (apertura) values (2020);  -- REEMPLAZAR: año de apertura

    insert into public.contadores (id, valor, sufijo, etiqueta, desde_apertura, orden) values
      ('clientes', 500, '+', 'Clientes atendidos', false, 0),  -- REEMPLAZAR
      ('marcas',    10, '',  'Marcas',             false, 1),  -- REEMPLAZAR
      ('anios',      0, '',  'Años en la ciudad',  true,  2),  -- se calcula sola
      ('dato',     100, '%', 'Dato propio',        false, 3)   -- REEMPLAZAR
    on conflict (id) do nothing;

    insert into public.servicios (id, icono, titulo, precio, detalle, orden) values
      ('servicio-1', 'llave',    'Servicio de ejemplo', null, 'Consultá el precio', 0),  -- REEMPLAZAR
      ('servicio-2', 'garantia', 'Otro servicio',       null, 'Reservá tu turno',   1)   -- REEMPLAZAR
    on conflict (id) do nothing;

    insert into public.preguntas (id, pregunta, respuesta, orden) values
      ('pregunta-1', '¿Pregunta frecuente de ejemplo?', 'Respuesta concreta, en dos o tres frases.', 0),  -- REEMPLAZAR
      ('pregunta-2', '¿Otra pregunta frecuente?',       'Otra respuesta concreta.',                   1)   -- REEMPLAZAR
    on conflict (id) do nothing;
  end if;

  if not exists (select 1 from public.contacto) then
    insert into public.contacto (telefono, email, whatsapp, direccion, lat, lng, horarios) values (
      '011 0000-0000',                    -- REEMPLAZAR
      'ventas@ejemplo.com',               -- REEMPLAZAR
      '+54 9 11 0000-0000',               -- REEMPLAZAR: de acá salen TODOS los botones de WhatsApp
      'Calle 123, Ciudad',                -- REEMPLAZAR
      -34.603722, -58.381592,             -- REEMPLAZAR: coordenadas exactas del local (Google Maps → clic derecho)
      '[
        {"dias": "Lunes a viernes", "horas": "9:00 a 13:00 · 17:00 a 20:00"},
        {"dias": "Sábados",         "horas": "9:00 a 13:00"}
      ]'::jsonb                           -- REEMPLAZAR
    );
  end if;
end;
$$;

commit;

-- Que la API vea las columnas nuevas sin esperar.
notify pgrst, 'reload schema';


-- ════════════════════════════════════════════════════════════════════════
--  8. AGREGAR UN ADMIN (después de crear el usuario en Authentication → Users)
-- ════════════════════════════════════════════════════════════════════════
-- Sacarle los dos guiones, poner el email EN MINÚSCULAS, seleccionar SOLO esa
-- línea y ejecutarla. Para otra persona, repetir con su email.

-- insert into public.admins (email) values ('tu-email@ejemplo.com') on conflict (email) do nothing;

-- Para sacarle el acceso a alguien:
-- delete from public.admins where email = 'email-a-sacar@ejemplo.com';


-- ════════════════════════════════════════════════════════════════════════
--  BLOQUE OPCIONAL — SEGMENTOS
-- ════════════════════════════════════════════════════════════════════════
-- Solo si el sitio nuevo usa el carrusel de segmentos (categorías por uso,
-- con foto). En el original se sacó del sitio y del panel. Si no se usa,
-- NO correr este bloque (o borrarlo antes de pegar el archivo).
-- Fotos en el MISMO bucket, carpeta `segmentos/`; las políticas de storage de
-- arriba ya lo cubren. El tope de 6 lo pone el panel: la lista se guarda con
-- upsert + borrado de lo que no vino, y en el medio puede haber más filas.

begin;

create table if not exists public.segmentos (
  id          text primary key default gen_random_uuid()::text,
  titulo      text not null check (length(trim(titulo)) > 0),
  texto       text not null default '',
  etiqueta    text not null default '',
  -- Pública del bucket, o `/img/...` para fotos que son archivos del sitio.
  imagen_url  text not null,
  -- Camino en el bucket. null = archivo del sitio: el repositorio no lo borra nunca.
  imagen_ruta text,
  ancho       integer not null check (ancho > 0),
  alto        integer not null check (alto > 0),
  orden       smallint not null default 0 check (orden >= 0)
);

create index if not exists segmentos_orden_idx on public.segmentos (orden);

revoke all on public.segmentos from anon, authenticated;
grant select on public.segmentos to anon, authenticated;
grant insert, update, delete on public.segmentos to authenticated;

alter table public.segmentos enable row level security;

drop policy if exists "segmentos: lectura pública" on public.segmentos;
create policy "segmentos: lectura pública"
  on public.segmentos for select to anon, authenticated using (true);

drop policy if exists "segmentos: escriben solo admins" on public.segmentos;
create policy "segmentos: escriben solo admins"
  on public.segmentos for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

commit;
