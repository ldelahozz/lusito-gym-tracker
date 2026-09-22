import { describe, expect, it } from 'vitest'
import {
  activityFactor,
  ageFrom,
  latestWeight,
  maintenanceCalories,
  proteinRange,
  relativeStrength,
  restingCalories,
  trainingDaysPerWeek,
  weightChange,
} from './body'

const DAY = 86_400_000
const now = new Date(2026, 8, 22, 12).getTime()

describe('peso', () => {
  const entries = [
    { measuredAt: now - 40 * DAY, weightKg: 82 },
    { measuredAt: now - 20 * DAY, weightKg: 81 },
    { measuredAt: now - 2 * DAY, weightKg: 79.8 },
    { measuredAt: now - DAY, weightKg: 70, deleted: true },
  ]

  it('el último registro válido manda', () => {
    expect(latestWeight(entries)).toBe(79.8)
    expect(latestWeight([])).toBeNull()
  })

  it('cambio dentro de la ventana de días', () => {
    expect(weightChange(entries, 30, now)).toBe(-1.2)
    expect(weightChange(entries, 7, now)).toBeNull()
  })
})

describe('ageFrom', () => {
  it('calcula la edad por año de nacimiento', () => {
    expect(ageFrom(1998, now)).toBe(28)
  })

  it('descarta años sin sentido', () => {
    expect(ageFrom(null, now)).toBeNull()
    expect(ageFrom(2025, now)).toBeNull()
    expect(ageFrom(1800, now)).toBeNull()
  })
})

describe('calorías (Mifflin-St Jeor)', () => {
  it('reposo: 10 × peso + 6.25 × altura − 5 × edad ± constante por sexo', () => {
    expect(restingCalories({ sex: 'male', weightKg: 80, heightCm: 180, age: 30 })).toBe(1780)
    expect(restingCalories({ sex: 'female', weightKg: 60, heightCm: 165, age: 30 })).toBe(1320.25)
  })

  it('factor de actividad por días de entreno', () => {
    expect(activityFactor(0)).toBe(1.2)
    expect(activityFactor(2)).toBe(1.375)
    expect(activityFactor(4)).toBe(1.55)
    expect(activityFactor(6)).toBe(1.725)
  })

  it('mantenimiento redondeado a 10, y nada si falta un dato', () => {
    expect(maintenanceCalories({ sex: 'male', weightKg: 80, heightCm: 180, age: 30, trainingDaysPerWeek: 4 })).toBe(2760)
    expect(maintenanceCalories({ sex: null, weightKg: 80, heightCm: 180, age: 30, trainingDaysPerWeek: 4 })).toBeNull()
    expect(maintenanceCalories({ sex: 'male', weightKg: null, heightCm: 180, age: 30, trainingDaysPerWeek: 4 })).toBeNull()
  })
})

describe('proteinRange', () => {
  it('de 1.6 a 2.2 g por kilo, redondeado a 5', () => {
    expect(proteinRange(80)).toEqual({ min: 130, max: 175 })
  })
})

describe('relativeStrength', () => {
  it('mejor 1RM ÷ peso corporal', () => {
    expect(relativeStrength(120, 80)).toBe(1.5)
  })

  it('sin peso no hay dato', () => {
    expect(relativeStrength(120, null)).toBeNull()
    expect(relativeStrength(0, 80)).toBeNull()
  })
})

describe('trainingDaysPerWeek', () => {
  it('usa el split si lo hay', () => {
    expect(trainingDaysPerWeek({ plannedDays: 4, sessionStarts: [], now })).toBe(4)
  })

  it('si no, el promedio de las últimas 4 semanas, contando días', () => {
    const starts = [1, 2, 3, 8, 9, 10, 15, 16, 22, 23, 23.1].map((days) => now - days * DAY)
    expect(trainingDaysPerWeek({ plannedDays: 0, sessionStarts: starts, now })).toBe(3)
  })
})
