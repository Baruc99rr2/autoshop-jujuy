import Header from '../components/Header'
import Rail from '../components/Rail'
import SectionHeader from '../components/SectionHeader'

/**
 * Panel de carga. Vacío a propósito: el listado, el formulario y la carga de
 * fotos son una parte posterior.
 *
 * NO usa `PaginaInterna`. El panel lo usa la dueña, probablemente desde el
 * celular y probablemente apurada: no lleva malla, ni menú del sitio, ni
 * footer, ni el flotante de WhatsApp. Se queda con el riel y el logo, que son
 * lo que lo mantiene dentro del mismo sistema visual, y nada más.
 *
 * Se carga con `lazy()`: su código —formularios, validación, subida de
 * archivos— no tiene por qué viajar en el bundle de quien entra a ver un auto.
 */
export function Admin() {
  return (
    <>
      <Rail index="01" label="PANEL" />
      <Header />

      <main className="min-h-svh pt-32 pb-24 shell md:pt-40">
        <SectionHeader
          index="01"
          eyebrow="PANEL"
          title="Cargar y editar unidades"
          lead="Desde acá se publican los autos, se suben las fotos y se marcan como reservados o vendidos."
        />
      </main>
    </>
  )
}

export default Admin
