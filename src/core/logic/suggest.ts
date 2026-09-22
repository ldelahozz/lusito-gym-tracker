/**
 * Sugerencia de peso para hoy, con doble progresion: mismo peso hasta llegar
 * al tope del rango en todas las series, y entonces se sube.
 *
 * Reglas (ver el globo de ayuda "suggestion" en src/core/help.ts):
 *  - Si la vez pasada llegaste al tope del rango en TODAS las series de
 *    trabajo, con el RIR planeado o mas facil, toca subir. Se sube ~2.5% del
 *    peso mas alto (la guia del ACSM 2009 dice 2 a 10%; aqui se usa el lado
 *    prudente porque la app no sabe si es un ejercicio de musculo grande o
 *    chico), redondeado a tu paso de peso y nunca menos de un paso. Al subir,
 *    las repeticiones vuelven al minimo del rango.
 *  - Si llegaste al tope pero mas cerca del fallo de lo planeado: mismo peso.
 *  - Si quedaste abajo del minimo en alguna serie: mismo peso.
 *  - Si estas dentro del rango: mismo peso, buscando una repeticion mas.
 *
 * Nunca decide por ti: la pantalla la muestra y tu eliges si la aplicas.
 */

/** Aumento prudente: el extremo bajo del 2 a 10% que recomienda el ACSM. */
export const INCREASE_RATE = 0.025

export type SuggestTarget = { repsMin: number; repsMax: number; rir: number }
export type SuggestSet = { setIndex: number; weightKg: number; reps: number; rir: number }

export type Suggestion =
  | {
      kind: 'increase'
      /** Cuanto subir, en kg. */
      increment: number
      /** Peso y reps propuestos para cada serie de trabajo, en orden. */
      sets: Array<{ weightKg: number; reps: number; rir: number }>
    }
  | { kind: 'more-reps' }
  | { kind: 'too-hard'; rir: number; target: number }
  | { kind: 'below-range'; repsMin: number }

/** Redondea al paso de peso mas cercano. */
function toStep(value: number, step: number): number {
  return Math.round(Math.round(value / step) * step * 100) / 100
}

export function incrementFor(topWeight: number, step: number): number {
  if (step <= 0) return 0
  return Math.max(step, toStep(topWeight * INCREASE_RATE, step))
}

export function suggestProgression(params: {
  /** Series de trabajo de la vez pasada con este ejercicio. */
  previous: readonly SuggestSet[]
  /** Meta de cada serie de trabajo segun la rutina. */
  targets: readonly SuggestTarget[]
  weightStep: number
}): Suggestion | null {
  const { weightStep } = params
  const previous = [...params.previous].sort((a, b) => a.setIndex - b.setIndex)
  const targets = params.targets
  if (previous.length === 0 || targets.length === 0) return null

  const topWeight = Math.max(...previous.map((set) => set.weightKg))
  // Con peso corporal (0 kg) no hay peso que sugerir.
  if (topWeight <= 0) return null

  const targetOf = (index: number) => targets[Math.min(index, targets.length - 1)]
  const checks = previous.map((set, index) => ({ set, target: targetOf(index) }))

  const below = checks.find(({ set, target }) => set.reps < target.repsMin)
  if (below) return { kind: 'below-range', repsMin: below.target.repsMin }

  const allAtTop = checks.every(({ set, target }) => set.reps >= target.repsMax)
  // Para subir hay que haber hecho todas las series planeadas.
  if (allAtTop && previous.length >= targets.length) {
    const hard = checks.find(({ set, target }) => set.rir < target.rir)
    if (hard) return { kind: 'too-hard', rir: hard.set.rir, target: hard.target.rir }

    const increment = incrementFor(topWeight, weightStep)
    return {
      kind: 'increase',
      increment,
      sets: targets.map((target, index) => {
        const base = previous[Math.min(index, previous.length - 1)].weightKg
        return { weightKg: toStep(base + increment, weightStep), reps: target.repsMin, rir: target.rir }
      }),
    }
  }

  return { kind: 'more-reps' }
}
