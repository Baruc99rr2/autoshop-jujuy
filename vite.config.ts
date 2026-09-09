import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // El logo depende de sus ids (#lg-word, #lg-flag, #lg-flag-1..7) para
    // animarse, y SVGO borra los ids que considera no usados.
    //
    // vite-plugin-svgr v5 solo carga @svgr/plugin-jsx, así que SVGO no corre
    // en esta cadena y los ids ya sobreviven. `svgo: false` lo deja explícito
    // (activarlo sin instalar @svgr/plugin-svgo revienta el build), y el
    // svgoConfig queda escrito para el día que alguien lo prenda: cleanupIds y
    // prefixIds tienen que quedar apagados sí o sí.
    svgr({
      svgrOptions: {
        svgo: false,
        svgoConfig: {
          plugins: [
            {
              name: 'preset-default',
              params: { overrides: { cleanupIds: false } },
            },
          ],
        },
        titleProp: true,
      },
    }),
  ],
})
