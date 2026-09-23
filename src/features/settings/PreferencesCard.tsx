import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { Card } from '@/core/ui/Card'
import { Field } from '@/core/ui/Field'
import { NumberField } from '@/core/ui/NumberField'
import { Switch } from '@/core/ui/Switch'
import { useToast } from '@/core/ui/toast-context'
import { askNotificationPermission, notificationPermission } from '@/core/feedback'
import { supportsVibration } from '@/core/platform'
import { useData } from '@/core/sync/data-context'

export function PreferencesCard() {
  const { settings, save } = useData()
  const { showToast } = useToast()
  const [permission, setPermission] = useState(() => notificationPermission())
  const vibrationAvailable = supportsVibration()

  useEffect(() => {
    setPermission(notificationPermission())
  }, [])

  const update = (patch: Partial<typeof settings>) => {
    save('settings', { ...settings, ...patch })
  }

  const requestNotifications = async () => {
    const result = await askNotificationPermission()
    setPermission(result)
    if (result === 'granted') showToast('Avisos activados')
    else if (result === 'denied') showToast('Los avisos quedaron bloqueados en el navegador')
  }

  return (
    <Card className="p-4 flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Paso del peso" hint="Cuánto suma cada toque de + o -.">
          <NumberField
            value={settings.weightStep}
            onChange={(weightStep) => update({ weightStep })}
            min={0.5}
            max={10}
            step={0.5}
            decimals={2}
            suffix="kg"
            ariaLabel="Paso del peso"
          />
        </Field>
        <Field label="Calentamientos" hint="Series propuestas al agregar un ejercicio.">
          <NumberField
            value={settings.defaultWarmupSets}
            onChange={(defaultWarmupSets) => update({ defaultWarmupSets })}
            min={0}
            max={10}
            ariaLabel="Series de calentamiento por defecto"
          />
        </Field>
      </div>

      <div className="flex flex-col divide-y divide-line">
        <Switch
          label="Sugerir cuándo subir de peso"
          description="Según tus series de la vez pasada, tu rango de reps y tu RIR."
          checked={settings.progressionHints}
          onChange={(progressionHints) => update({ progressionHints })}
        />
        <Switch
          label="Sonido al terminar el descanso"
          checked={settings.sound}
          onChange={(sound) => update({ sound })}
        />
        <Switch
          label="Vibración"
          description={
            vibrationAvailable
              ? 'Al guardar una serie y al terminar el descanso.'
              : 'Este dispositivo no tiene vibración en el navegador (los iPhone no la permiten).'
          }
          checked={settings.vibration && vibrationAvailable}
          disabled={!vibrationAvailable}
          onChange={(vibration) => update({ vibration })}
        />
      </div>

      {permission !== 'unsupported' && (
        <div className="flex items-center gap-3 pt-1">
          {permission === 'granted' ? (
            <Bell size={18} className="text-accent shrink-0" />
          ) : (
            <BellOff size={18} className="text-muted shrink-0" />
          )}
          <p className="flex-1 text-xs text-muted leading-relaxed">
            {permission === 'granted'
              ? 'Recibirás un aviso del sistema aunque la app esté en segundo plano.'
              : 'Permite los avisos para enterarte del fin del descanso con la app cerrada.'}
          </p>
          {permission === 'default' && (
            <Button size="sm" onClick={() => void requestNotifications()}>
              Permitir
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
