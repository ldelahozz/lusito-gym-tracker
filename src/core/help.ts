/**
 * Textos de ayuda de los globos "?". Cortos, en palabras simples, y cuando
 * hablan de una pauta dicen de donde sale.
 */

export type HelpTopic = {
  title: string
  body: string[]
  /** De donde sale la pauta, si aplica. */
  source?: string
}

export const HELP = {
  rir: {
    title: 'RIR: repeticiones en reserva',
    body: [
      'Cuántas repeticiones más podías hacer con buena técnica cuando paraste. RIR 0: no salía ni una más. RIR 2: te quedaban dos.',
      'En las series de trabajo se suele entrenar entre 0 y 3 de RIR: cerca del fallo, pero sin llegar siempre. Al principio cuesta calcularlo; con la práctica se afina.',
    ],
    source: 'Zourdos y cols., 2016 (escala de RIR)',
  },
  repRange: {
    title: 'Rango de repeticiones',
    body: [
      'Con un rango como 6-8, mantienes el mismo peso y vas sumando repeticiones sesión tras sesión.',
      'Cuando llegas al tope del rango en todas las series con el RIR que planeaste, subes el peso y vuelves a empezar desde abajo del rango. A esto se le llama doble progresión.',
    ],
  },
  rest: {
    title: 'Descanso entre series',
    body: [
      'En ejercicios grandes y pesados (sentadilla, press, remo, peso muerto) se recomiendan 2 a 3 minutos. En ejercicios chicos o de aislamiento, 1 a 2 minutos.',
      'Para ganar músculo, descansar más de 60 a 90 segundos da un poco más de resultado que descansar menos. Más de eso ya no cambia mucho.',
    ],
    source: 'ACSM, 2009; Singer y cols., 2024',
  },
  warmup: {
    title: 'Series de calentamiento',
    body: [
      'Series ligeras antes de las de trabajo, para preparar el cuerpo y practicar el movimiento. Normalmente se va subiendo el peso poco a poco.',
      'No cuentan para tus récords ni para tu progreso.',
    ],
  },
  suggestion: {
    title: 'Cómo se calcula la sugerencia',
    body: [
      'Si la vez pasada llegaste al tope del rango en todas las series, con el RIR planeado o más fácil, toca subir. Se suma alrededor de un 2.5% (el aumento más chico que recomiendan las guías), redondeado a tu paso de peso.',
      'Si no llegaste al tope, o llegaste pero más cerca del fallo de lo planeado, conviene repetir el peso y buscar una repetición más. Si dos veces seguidas no llegas al mínimo del rango, considera bajar un poco.',
      'Es una guía: si ese día te sientes distinto, manda cómo te sientes.',
    ],
    source: 'ACSM, 2009: subir 2 a 10% al superar las repeticiones buscadas',
  },
  e1rm: {
    title: '1RM estimado',
    body: [
      'El peso máximo que podrías levantar una sola vez, calculado a partir de una serie. Sirve para comparar series con distinto peso y repeticiones.',
      'Se usa la fórmula de Epley: peso × (1 + repeticiones ÷ 30), contando también las repeticiones que te quedaban en reserva.',
    ],
  },
  records: {
    title: 'Récords',
    body: [
      'Peso máximo: nunca habías levantado tanto en ese ejercicio. Más repeticiones: hiciste más repeticiones que nunca con ese peso o uno mayor. Mejor 1RM estimado: tu serie más fuerte, calculada.',
      'La primera vez que haces un ejercicio no cuenta como récord, ni tampoco empatar tu marca. Los calentamientos no cuentan.',
    ],
  },
  trend: {
    title: 'Subió, igual o bajó',
    body: [
      'Compara cada ejercicio con la vez anterior. Cuenta como subir si levantaste más peso en tu serie más pesada, o el mismo peso con más repeticiones en total.',
      'El RIR se muestra, pero no decide: sirve para ver si te costó más o menos.',
    ],
  },
  volume: {
    title: 'Volumen',
    body: ['Peso × repeticiones de todas tus series de trabajo, sumado. Da una idea del trabajo total de la sesión.'],
  },
  skip: {
    title: 'Saltar ejercicio',
    body: [
      'Márcalo si hoy no lo vas a hacer, por tiempo o porque la máquina está ocupada. La próxima vez te recuerda que te lo saltaste, y en Progreso queda anotado.',
      'Si prefieres hacer otro en su lugar, usa "Cambiar" junto al nombre del ejercicio.',
    ],
  },
  relativeStrength: {
    title: 'Fuerza relativa',
    body: [
      'Tu mejor 1RM estimado dividido entre tu peso corporal. Por ejemplo, 1.5× quiere decir que podrías levantar una vez una vez y media tu peso.',
      'Sirve para ver tu progreso aunque tu peso cambie.',
    ],
  },
  protein: {
    title: 'Proteína al día',
    body: [
      'Para ganar músculo con entrenamiento de fuerza, sumar proteína ayuda hasta alrededor de 1.6 g por kilo de peso corporal al día; más de eso ya casi no suma. El rango razonable llega hasta unos 2.2 g por kilo.',
      'Es una referencia general, no una indicación médica.',
    ],
    source: 'Morton y cols., 2018 (British Journal of Sports Medicine)',
  },
  calories: {
    title: 'Calorías de mantenimiento',
    body: [
      'Estimación de lo que gastas al día para mantener tu peso. Primero se calcula tu gasto en reposo con la fórmula de Mifflin-St Jeor (peso, altura, edad y sexo) y luego se multiplica por tu nivel de actividad.',
      'Esa fórmula acierta dentro de un ±10% en la mayoría de las personas. Tómalo como punto de partida y ajústalo según cómo cambie tu peso.',
    ],
    source: 'Mifflin y cols., 1990; Frankenfield y cols., 2005',
  },
} satisfies Record<string, HelpTopic>

export type HelpKey = keyof typeof HELP
