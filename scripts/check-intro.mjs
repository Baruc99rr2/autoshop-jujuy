/**
 * Mide la duración real de la timeline de la intro sin navegador.
 *
 * GSAP anima objetos planos igual que nodos del DOM, y la duración total no
 * depende de los targets: solo de posiciones y duraciones. Así que se puede
 * construir la misma secuencia con `{}` en lugar de elementos y leer
 * tl.duration(). El único paso que necesita DOM real es el Flip, y por eso la
 * timeline lo recibe inyectado.
 *
 * Node ≥22 stripea los tipos de TypeScript solo, así que el .ts se importa
 * directo. Corré:  node scripts/check-intro.mjs
 */
import { gsap } from 'gsap'
import {
  INTRO_CEILING,
  buildIntroTimeline,
} from '../src/components/intro-timeline.ts'

// Los objetos planos declaran las props que la timeline toca, así GSAP las
// interpola como números/strings comunes en vez de avisar que falta CSSPlugin.
const stub = () => ({
  x: 0,
  opacity: 1,
  scale: 1,
  scaleX: 1,
  transformOrigin: '50% 50%',
  clipPath: 'inset(0% 0% 0% 0%)',
  filter: 'none',
})

const tl = buildIntroTimeline(
  {
    laser: stub(),
    trail: stub(),
    word: stub(),
    flagSquares: Array.from({ length: 7 }, stub),
    line: stub(),
    breath: stub(),
    wipe: stub(),
  },
  {
    laserDistance: () => 1440,
    // En el navegador esto es un Flip.fit contra el logo real del header.
    flip: (dur) => gsap.timeline({ paused: true }).to({ v: 0 }, { v: 1, duration: dur }),
  },
)

const d = tl.duration()
console.log(`duración de la intro: ${d.toFixed(3)}s  ·  techo: ${INTRO_CEILING}s`)

if (d > INTRO_CEILING + 0.0001) {
  console.error('✗ FUERA DEL TECHO')
  process.exit(1)
}
console.log('✓ dentro del techo')
