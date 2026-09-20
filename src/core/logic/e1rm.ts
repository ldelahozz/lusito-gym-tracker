/**
 * 1RM estimado: el peso que, segun la serie que acabas de hacer, podrias
 * levantar una sola vez.
 *
 * Formula: peso x (1 + (reps + RIR) / 30). Las repeticiones que te quedaron
 * en reserva cuentan como si las hubieras hecho, porque hablan de tu fuerza
 * igual que las que si hiciste.
 */

/** Redondeo a dos decimales, para que comparar dos marcas nunca dependa de un resto invisible. */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function estimateOneRepMax(weightKg: number, reps: number, rir = 0): number {
  if (weightKg <= 0 || reps <= 0) return 0
  const effectiveReps = reps + Math.max(0, rir)
  return round2(weightKg * (1 + effectiveReps / 30))
}
