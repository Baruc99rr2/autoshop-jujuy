import LogoMark from '../assets/logo.svg?react'

type LogoProps = {
  className?: string
  /** id del <svg>, para que Flip pueda targetear al del header. */
  id?: string
  /** El logo del intro es decorativo: el del header lleva el nombre accesible. */
  decorative?: boolean
}

/**
 * El logo se importa como componente (no como <img>) porque la intro necesita
 * targetear #lg-word y los 7 cuadros de #lg-flag desde GSAP.
 *
 * Los colores del SVG salen de --logo-white / --logo-yellow, así que se puede
 * recolorear entero desde CSS sin tocar los paths.
 */
export function Logo({ className = '', id, decorative = false }: LogoProps) {
  return (
    <LogoMark
      id={id}
      className={className}
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : 'Automotores AutoShop Jujuy'}
    />
  )
}

export default Logo
