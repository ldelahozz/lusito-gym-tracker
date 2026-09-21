import { CircleAlert } from 'lucide-react'
import { AppMark } from '@/app/AppMark'
import { Card } from '@/core/ui/Card'
import { missingFirebaseKeys } from '@/core/firebase'

/**
 * Se muestra solo si faltan las claves de Firebase.
 * Evita una pantalla en blanco y dice exactamente que falta.
 */
export function SetupNeededScreen() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12 gap-6">
      <AppMark size={56} />
      <Card className="w-full max-w-md p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-accent">
          <CircleAlert size={20} />
          <h1 className="text-lg font-semibold text-text">Falta conectar Firebase</h1>
        </div>
        <p className="text-sm text-muted leading-relaxed">
          La app está lista, pero todavía no tiene las claves del proyecto de Firebase (el servicio de
          Google que guarda tus datos y maneja el acceso con tu cuenta).
        </p>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Datos que faltan</p>
          <ul className="flex flex-col gap-1">
            {missingFirebaseKeys.map((key) => (
              <li key={key} className="text-sm font-mono text-text bg-elevated rounded-[10px] px-3 py-2">
                {key}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-muted leading-relaxed">
          Copia el archivo <span className="text-text">.env.example</span> como{' '}
          <span className="text-text">.env.local</span>, pega ahí los valores de tu proyecto y vuelve a
          iniciar la app.
        </p>
      </Card>
    </div>
  )
}
