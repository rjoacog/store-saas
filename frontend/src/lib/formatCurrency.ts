const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Formatea importes en pesos argentinos (símbolo, miles, decimales).
 * Acepta strings numéricos que vengan del API (ej. "2500", "25.50").
 */
export function formatCurrency(value: string | number): string {
  const n =
    typeof value === 'string'
      ? parseFloat(value.replace(/\s/g, '').replace(',', '.'))
      : value
  if (Number.isNaN(n)) {
    return typeof value === 'string' ? value : String(value)
  }
  return arsFormatter.format(n)
}
