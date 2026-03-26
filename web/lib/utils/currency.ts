/**
 * Utilidades para formateo de moneda en pesos chilenos (CLP)
 * Formato: $1.234 (sin decimales, punto como separador de miles)
 */

/**
 * Formatea un monto en pesos chilenos sin decimales
 * Ejemplo: 1234.56 -> "$1.235"
 */
export function formatCLP(amount: number): string {
  const roundedAmount = Math.round(amount) // Redondear a entero
  return `$${roundedAmount.toLocaleString('es-CL')}`
}

/**
 * Formatea un monto en pesos chilenos sin decimales (desde string)
 */
export function formatCLPFromString(amount: string | number): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  return formatCLP(numAmount)
}
