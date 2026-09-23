# Supabase y Vercel: lo que hay que hacer a mano

Se hace una sola vez. Los nombres de los menús son los del panel de Supabase a
2026; si alguno cambió de lugar, el buscador de arriba del panel lo encuentra
por nombre.

Hasta que esté hecha la parte 8C (el código que habla con Supabase), el sitio
sigue usando los datos del navegador. Hacer estos pasos antes no rompe nada.

## A. Crear el proyecto

1. Entrá a <https://supabase.com> → **Start your project** y creá la cuenta
   (lo más cómodo es **Continue with GitHub**, con la misma cuenta del repo).
2. Si te pide crear una organización, poné cualquier nombre (por ejemplo
   `SkyTech`) y elegí el plan **Free**.
3. **New project**:
   - **Name:** `autoshopjujuy`
   - **Database Password:** tocá **Generate a password** y guardala en tu
     gestor de contraseñas. El sitio no la usa, pero sin ella no se recupera
     el acceso directo a la base.
   - **Region:** **South America (São Paulo)**, la más cercana a Jujuy.
   - **Create new project** y esperá uno o dos minutos a que termine.

## B. Crear las tablas

4. En el menú de la izquierda: **SQL Editor** → **New query**.
5. Abrí `supabase/schema.sql` del repo, copiá TODO el contenido y pegalo.
6. **Run** (o Ctrl + Enter). Si avisa que la consulta tiene operaciones
   destructivas, confirmá: son los `drop policy if exists` que hacen que el
   archivo se pueda correr dos veces. Tiene que decir
   **Success. No rows returned**.
7. Comprobá en **Table Editor** que aparecen `admins`, `contadores`,
   `etiquetas`, `fotos`, `preguntas`, `servicios`, `sitio`, `vehiculos` y
   `videos`, y en **Storage** el bucket `vehiculos` marcado como **Public**.

## C. Cerrar el registro y crear tu usuario

8. **Authentication** → **Sign In / Providers**:
   - Dejá **Email** habilitado.
   - Apagá **Allow new users to sign up** y guardá. Así nadie se puede crear
     una cuenta sola; las cuentas las creás vos.
9. **Authentication** → **Users** → **Add user** → **Create new user**:
   - Tu email y una contraseña.
   - Marcá **Auto Confirm User**. Sin eso la cuenta queda sin confirmar y la
     base no la reconoce como admin.
   - **Create user**.
10. Habilitá ese email como admin: **SQL Editor** → **New query**, pegá esta
    línea con tu email **en minúsculas** y **Run**:

    ```sql
    insert into public.admins (email) values ('tu-email@ejemplo.com') on conflict (email) do nothing;
    ```

    Es la misma que está comentada al final de `schema.sql`.
11. Para la dueña (u otra persona), repetí los pasos 9 y 10 con su email.
    Tener usuario sin estar en `admins` no le da permiso de nada.

## D. Dirección del sitio

12. **Authentication** → **URL Configuration** → **Site URL**: poné la
    dirección de producción del sitio (la de Vercel o el dominio propio, con
    `https://`). La usa Supabase en los mails de recuperar contraseña.

## E. Las dos claves que necesita el sitio

13. **Project Settings** (engranaje, abajo a la izquierda):
    - En **Data API** copiá la **Project URL** (`https://xxxx.supabase.co`).
    - En **API Keys** copiá la **Publishable key** (empieza con
      `sb_publishable_`). Si tu panel solo muestra claves viejas, usá la
      **anon public** de la pestaña **Legacy API Keys**: sirve igual.

    **Nunca** copies la **Secret key** ni la **service_role**: saltean todas
    las reglas de la base y en el sitio quedarían a la vista de cualquiera.
    La publishable sí es pública a propósito; lo que protege los datos son
    las reglas de `schema.sql`.

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | la Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | la Publishable key (o la anon public) |

## F. En tu compu

14. En la raíz del repo (al lado de `package.json`) creá un archivo
    `.env.local` con:

    ```
    VITE_SUPABASE_URL=https://xxxx.supabase.co
    VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxx
    ```

    Git lo ignora (`*.local` en `.gitignore`), así que no se sube. Si
    `npm run dev` estaba corriendo, cortalo y volvé a arrancarlo: Vite lee
    estas variables solo al arrancar.

## G. En Vercel

15. <https://vercel.com> → el proyecto del sitio → **Settings** →
    **Environment Variables**.
16. Agregá las dos variables de la tabla, con el mismo nombre y valor. En
    **Environments** dejá marcados **Production**, **Preview** y
    **Development**. **Save**.
17. Las variables entran recién en el próximo build: **Deployments** → el de
    más arriba → **⋯** → **Redeploy**. (O esperá al próximo push, que las
    toma solo.)

## Bueno saber

- El plan Free pausa el proyecto después de 7 días sin actividad. Con el
  sitio ya conectado, las visitas lo mantienen despierto; si se pausa, se
  reactiva desde el panel con **Restore project**.
- Correr `schema.sql` otra vez no borra datos ni vuelve a cargar el
  contenido inicial. Tampoco cambia columnas de tablas que ya existen: si un
  día el esquema cambia, eso va con un `alter table` aparte.
