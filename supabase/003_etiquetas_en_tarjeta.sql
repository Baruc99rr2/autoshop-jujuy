-- ════════════════════════════════════════════════════════════════════════
--  AUTOSHOP JUJUY — 003: etiquetas que salen también en la card
-- ════════════════════════════════════════════════════════════════════════
--
--  Va DESPUÉS de `schema.sql` y de `002_segmentos_contacto.sql`. Se pega
--  ENTERO en el SQL Editor y se corre de una vez. Es idempotente: correrlo de
--  nuevo no rompe ni duplica nada, y todo va en una transacción.
--
--  Refleja `Etiqueta.enTarjeta` de `src/types/vehiculo.ts`. El código tolera
--  que la columna todavía no exista (las cards salen sin etiquetas), así que
--  el orden entre el deploy y este archivo no importa.
--
--  El tope de dos por unidad lo pone el panel, no la base: al reordenar o
--  cambiar cuál sale, el guardado pasa un momento por estados intermedios que
--  un control acá frenaría sin motivo.
-- ════════════════════════════════════════════════════════════════════════

begin;

-- La columna y la marca inicial van JUNTAS y solo si la columna no existía:
-- así una segunda corrida no vuelve a prender lo que la dueña haya apagado.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'etiquetas'
      and column_name = 'en_tarjeta'
  ) then
    -- 1. La columna. `false` para todas las que ya existen.
    alter table public.etiquetas
      add column en_tarjeta boolean not null default false;

    -- 2. "Mínimo anticipo" sale en la card en todas las unidades que ya lo
    --    tienen. Se compara sin tildes, sin mayúsculas, sin espacios de más
    --    y sin el ":" final: entran "Mínimo anticipo:", "MINIMO ANTICIPO" y
    --    "minimo anticipo :". `translate` en vez de la extensión `unaccent`:
    --    alcanza para las vocales del español y no obliga a instalar nada.
    update public.etiquetas
    set en_tarjeta = true
    where regexp_replace(
            regexp_replace(
              translate(lower(trim(titulo)), 'áéíóúü', 'aeiouu'),
              '\s*:+\s*$', ''
            ),
            '\s+', ' ', 'g'
          ) = 'minimo anticipo';
  end if;
end
$$;

commit;

-- Que la API vea la columna nueva sin esperar (Supabase suele recargar sola
-- con cada cambio de estructura; esto no hace daño si ya lo hizo).
notify pgrst, 'reload schema';
