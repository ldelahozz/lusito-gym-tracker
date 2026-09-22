/**
 * Datos del cuerpo: peso, y estimaciones practicas a partir de el.
 * Todo es referencia general, no indicacion medica (ver los globos de ayuda).
 */
import type { Sex } from '@/core/model/types'

const DAY_MS = 86_400_000

type WeightEntry = { measuredAt: number; weightKg: number; deleted?: boolean }

/** Registros de peso validos, del mas viejo al mas nuevo. */
export function weightHistory<W extends WeightEntry>(entries: readonly W[]): W[] {
  return entries
    .filter((entry) => !entry.deleted && entry.weightKg > 0)
    .sort((a, b) => a.measuredAt - b.measuredAt)
}

export function latestWeight(entries: readonly WeightEntry[]): number | null {
  const history = weightHistory(entries)
  return history.length > 0 ? history[history.length - 1].weightKg : null
}

/**
 * Cambio de peso en los ultimos dias: el ultimo registro contra el primero de
 * esa ventana. null si en esa ventana hay menos de dos registros.
 */
export function weightChange(entries: readonly WeightEntry[], days: number, now: number): number | null {
  const recent = weightHistory(entries).filter((entry) => entry.measuredAt >= now - days * DAY_MS)
  if (recent.length < 2) return null
  return Math.round((recent[recent.length - 1].weightKg - recent[0].weightKg) * 10) / 10
}

export function ageFrom(birthYear: number | null, now: number): number | null {
  if (!birthYear) return null
  const age = new Date(now).getFullYear() - birthYear
  return age >= 10 && age <= 110 ? age : null
}

/**
 * Gasto en reposo (kcal/dia) con la formula de Mifflin-St Jeor (1990):
 * 10 × peso + 6.25 × altura − 5 × edad + 5 (hombres) o − 161 (mujeres).
 */
export function restingCalories(params: { sex: Sex; weightKg: number; heightCm: number; age: number }): number {
  const { sex, weightKg, heightCm, age } = params
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161)
}

/**
 * Factor de actividad segun los dias que entrenas por semana, con los niveles
 * de uso comun: 1.2 casi nada, 1.375 de 1 a 2 dias, 1.55 de 3 a 5, 1.725 de 6 a 7.
 */
export function activityFactor(trainingDaysPerWeek: number): number {
  if (trainingDaysPerWeek >= 6) return 1.725
  if (trainingDaysPerWeek >= 3) return 1.55
  if (trainingDaysPerWeek >= 1) return 1.375
  return 1.2
}

/** Calorias de mantenimiento, redondeadas a 10. null si falta algun dato. */
export function maintenanceCalories(params: {
  sex: Sex | null
  weightKg: number | null
  heightCm: number | null
  age: number | null
  trainingDaysPerWeek: number
}): number | null {
  const { sex, weightKg, heightCm, age, trainingDaysPerWeek } = params
  if (!sex || !weightKg || !heightCm || !age) return null
  const total = restingCalories({ sex, weightKg, heightCm, age }) * activityFactor(trainingDaysPerWeek)
  return Math.round(total / 10) * 10
}

/**
 * Proteina diaria de referencia para ganar musculo: 1.6 g/kg (donde se estanca
 * el beneficio) hasta 2.2 g/kg (limite alto razonable). Morton y cols., 2018.
 */
export function proteinRange(weightKg: number): { min: number; max: number } {
  const round5 = (value: number) => Math.round(value / 5) * 5
  return { min: round5(weightKg * 1.6), max: round5(weightKg * 2.2) }
}

/** Mejor 1RM estimado ÷ peso corporal, con dos decimales. */
export function relativeStrength(bestE1rm: number, bodyWeightKg: number | null): number | null {
  if (!bodyWeightKg || bodyWeightKg <= 0 || bestE1rm <= 0) return null
  return Math.round((bestE1rm / bodyWeightKg) * 100) / 100
}

/**
 * Dias de entreno por semana: los del split semanal; si no hay split, el
 * promedio de las ultimas cuatro semanas.
 */
export function trainingDaysPerWeek(params: {
  plannedDays: number
  sessionStarts: readonly number[]
  now: number
}): number {
  if (params.plannedDays > 0) return params.plannedDays
  const since = params.now - 28 * DAY_MS
  const days = new Set(
    params.sessionStarts.filter((start) => start >= since).map((start) => new Date(start).toDateString()),
  )
  return Math.round(days.size / 4)
}
