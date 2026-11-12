/**
 * Parser y validación de códigos de barras SMU (boleta supermercado).
 * Formato: PP(2) + POS(3) + TRANS(5) + MONTO(4-7) + LOC(2) + FECHA AMMDD(5) + HORA HHMM(4)
 */

export type SmuTicket = {
  ticketCode: string
  storeNumber: string
  posNumber: string
  transactionNumber: string
  amount: number
  localParking: string
  dateRaw: string
  timeRaw: string
  /** YYYY-MM-DD en calendario de la boleta */
  ticketDateIso: string
}

export type TicketValidationCode =
  | 'INVALID_CODE'
  | 'INVALID_DATE'
  | 'ALREADY_USED'
  | 'NO_SUPERMARKET'
  | 'SESSION_NOT_FOUND'
  | 'BELOW_MINIMUM'

const CHILE_TZ = 'America/Santiago'

export function normalizeTicketCode(raw: string): string {
  return String(raw || '').replace(/\D/g, '')
}

export function parseSmuTicket(raw: string): SmuTicket | null {
  const digits = normalizeTicketCode(raw)
  const montoLen =
    digits.length === 28 ? 7 :
    digits.length === 27 ? 6 :
    digits.length === 26 ? 5 :
    digits.length === 25 ? 4 :
    null
  if (montoLen == null) return null

  let i = 0
  const storeNumber = digits.slice(i, (i += 2))
  const posNumber = digits.slice(i, (i += 3))
  const transactionNumber = digits.slice(i, (i += 5))
  const amountRaw = digits.slice(i, (i += montoLen))
  const localParking = digits.slice(i, (i += 2))
  const dateRaw = digits.slice(i, (i += 5))
  const timeRaw = digits.slice(i, (i += 4))

  if (dateRaw.length !== 5 || timeRaw.length !== 4) return null

  const yearSuffix = Number(dateRaw.slice(0, 1))
  const month = Number(dateRaw.slice(1, 3))
  const day = Number(dateRaw.slice(3, 5))
  if (!Number.isFinite(yearSuffix) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }

  // AMMDD: A = último dígito del año 202X (alineado con parser Android)
  const year = 2020 + yearSuffix
  const ticketDateIso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  // Validar que la fecha exista (evita 31/02, etc.)
  const probe = new Date(`${ticketDateIso}T12:00:00Z`)
  if (Number.isNaN(probe.getTime())) return null
  const [py, pm, pd] = [
    probe.getUTCFullYear(),
    probe.getUTCMonth() + 1,
    probe.getUTCDate(),
  ]
  if (py !== year || pm !== month || pd !== day) return null

  const amount = Number(amountRaw.replace(/^0+/, '') || '0')
  if (!Number.isFinite(amount) || amount < 0) return null

  return {
    ticketCode: digits,
    storeNumber,
    posNumber,
    transactionNumber,
    amount,
    localParking,
    dateRaw,
    timeRaw,
    ticketDateIso,
  }
}

/** Fecha de hoy en Chile como YYYY-MM-DD */
export function todayIsoInChile(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CHILE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function isTicketDateToday(ticket: SmuTicket, now: Date = new Date()): boolean {
  return ticket.ticketDateIso === todayIsoInChile(now)
}

export function publicMessageForCode(code: TicketValidationCode): string {
  switch (code) {
    case 'INVALID_DATE':
      return 'Fecha boleta no válida'
    case 'ALREADY_USED':
      return 'Descuento ya utilizado'
    case 'INVALID_CODE':
      return 'El código no corresponde a un ticket SMU válido.'
    case 'NO_SUPERMARKET':
      return 'El local no tiene descuentos configurados para este estacionamiento.'
    case 'SESSION_NOT_FOUND':
      return 'Sesión no encontrada.'
    case 'BELOW_MINIMUM':
      return 'Monto de boleta insuficiente para descuento.'
    default:
      return 'No se pudo validar el descuento.'
  }
}
