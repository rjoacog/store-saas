/** Día local YYYYMMDD para comparar calendario (zona del usuario). */
function localDayKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

/**
 * Etiqueta corta: "Hoy", "Ayer", o fecha; incluye hora.
 */
export function formatRelativeSaleDate(iso: string): string {
  let d: Date
  try {
    d = new Date(iso)
    if (Number.isNaN(d.getTime())) {
      return iso
    }
  } catch {
    return iso
  }

  const saleDay = localDayKey(d)
  const now = new Date()
  const today = localDayKey(now)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yday = localDayKey(yesterday)

  const time = d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (saleDay === today) {
    return `Hoy ${time}`
  }
  if (saleDay === yday) {
    return `Ayer ${time}`
  }

  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
