/** Media query única para todo el sitio: una sola fuente de verdad. */
const QUERY = '(prefers-reduced-motion: reduce)'

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(QUERY).matches
}

/** Se suscribe a los cambios en vivo (el usuario puede togglearlo sin recargar). */
export function onReducedMotionChange(
  fn: (reduced: boolean) => void,
): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia(QUERY)
  const handler = (e: MediaQueryListEvent) => fn(e.matches)
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}
