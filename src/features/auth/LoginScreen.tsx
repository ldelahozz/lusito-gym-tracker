import { LogIn, ShieldCheck } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { Spinner } from '@/core/ui/Spinner'
import { useAuth } from './auth-context'
import { AppMark } from '@/app/AppMark'

export function LoginScreen() {
  const { signIn, signingIn, error } = useAuth()

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12 gap-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <AppMark size={64} />
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-shine">Lusito Gym Tracker</h1>
          <p className="text-sm text-muted mt-1">Tus entrenamientos, con o sin internet.</p>
        </div>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <Button variant="primary" size="lg" block onClick={() => void signIn()} disabled={signingIn}>
          {signingIn ? <Spinner className="size-5 border-canvas/40 border-t-canvas" /> : <LogIn size={20} />}
          {signingIn ? 'Entrando...' : 'Entrar con Google'}
        </Button>

        {error && (
          <p className="text-sm text-muted surface-well rounded-control px-4 py-3 leading-relaxed">
            {error}
          </p>
        )}
      </div>

      <p className="flex items-start gap-2 text-xs text-muted max-w-xs text-center leading-relaxed">
        <ShieldCheck size={16} className="shrink-0 mt-px" />
        <span>
          Cada cuenta tiene su propio espacio privado. Solo entras una vez en cada dispositivo.
        </span>
      </p>
    </div>
  )
}
