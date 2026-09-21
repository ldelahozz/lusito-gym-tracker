import { useRef, useState } from 'react'
import { Download, FileWarning, Upload } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { Card } from '@/core/ui/Card'
import { Modal } from '@/core/ui/Modal'
import { useToast } from '@/core/ui/toast-context'
import { getDeviceKind } from '@/core/device'
import { saveTextFile } from '@/core/fileExport'
import {
  backupFileName,
  buildBackup,
  daysSince,
  parseBackup,
  planImport,
  serializeBackup,
  summarizeBackup,
  type BackupSummary,
  type ImportPlan,
  type Tables,
} from '@/core/logic/backup'
import { formatDate } from '@/core/logic/format'
import type { NewDoc } from '@/core/sync/data-context'
import type { CollectionName } from '@/core/sync/collections'
import { useData } from '@/core/sync/data-context'

type Preview = { summary: BackupSummary; plan: ImportPlan }

function lastExportText(lastExportAt: number | null, now: number): string {
  if (lastExportAt === null) return 'Todavía no has guardado ningún respaldo.'
  const days = daysSince(lastExportAt, now)
  const when = days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`
  return `Último respaldo: ${when} (${formatDate(lastExportAt)}).`
}

export function BackupCard() {
  const { state, settings, save, saveMany } = useData()
  const { showToast } = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Las tablas de datos tienen la forma que el respaldo espera: un registro por id.
  const tables = state as unknown as Tables

  const exportBackup = async () => {
    setBusy(true)
    try {
      const now = Date.now()
      const outcome = await saveTextFile({
        name: backupFileName(now),
        text: serializeBackup(buildBackup(tables, now)),
        mimeType: 'application/json',
        preferShare: getDeviceKind() === 'mobile',
      })
      if (outcome === 'cancelled') return
      save('settings', { ...settings, lastExportAt: now })
      showToast(outcome === 'shared' ? 'Respaldo listo' : 'Respaldo descargado')
    } catch {
      showToast('No se pudo crear el respaldo')
    } finally {
      setBusy(false)
    }
  }

  const readFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    try {
      const result = parseBackup(await file.text())
      if (!result.ok) {
        setError(result.error)
        return
      }
      setPreview({ summary: summarizeBackup(result.backup), plan: planImport(result.backup, tables) })
    } catch {
      setError('No se pudo leer ese archivo.')
    } finally {
      // Permite volver a elegir el mismo archivo.
      if (input.current) input.current.value = ''
    }
  }

  const confirmImport = () => {
    if (!preview) return
    const { plan } = preview
    saveMany(
      plan.writes.map(({ collection, doc }) => ({
        collection,
        doc: doc as unknown as NewDoc<CollectionName>,
      })),
    )
    setPreview(null)
    showToast(`Respaldo restaurado: ${plan.writes.length} registros`)
  }

  const nothingToDo = preview !== null && preview.plan.writes.length === 0

  return (
    <Card className="p-4 flex flex-col gap-4">
      <div>
        <p className="text-[15px] font-medium">Respaldo en archivo</p>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          Guarda en un archivo tus rutinas, ejercicios, entrenamientos, notas, récords y ajustes. Tus
          datos ya viven en la nube; esto es una copia extra que queda en tus manos.
        </p>
        <p className="text-sm mt-2">{lastExportText(settings.lastExportAt, Date.now())}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="primary" onClick={exportBackup} disabled={busy}>
          <Download size={18} />
          Exportar respaldo
        </Button>
        <Button onClick={() => input.current?.click()}>
          <Upload size={18} />
          Importar respaldo
        </Button>
      </div>

      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => void readFile(event.target.files?.[0])}
      />

      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-control surface-well">
          <FileWarning size={18} className="text-muted shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">{error}</p>
        </div>
      )}

      <p className="text-xs text-muted leading-relaxed">
        Los videos de los ejercicios no van en el respaldo: se quedan solo en el teléfono donde los
        guardaste.
      </p>

      <Modal
        open={preview !== null}
        onClose={() => setPreview(null)}
        title="Restaurar respaldo"
        description={
          preview && preview.summary.exportedAt > 0
            ? `Respaldo del ${formatDate(preview.summary.exportedAt)} de ${new Date(preview.summary.exportedAt).getFullYear()}`
            : undefined
        }
        footer={
          nothingToDo ? (
            <Button onClick={() => setPreview(null)}>Cerrar</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setPreview(null)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={confirmImport}>
                Restaurar
              </Button>
            </>
          )
        }
      >
        {preview && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ['Rutinas', preview.summary.routines],
                ['Ejercicios', preview.summary.exercises],
                ['Sesiones', preview.summary.sessions],
                ['Series', preview.summary.sets],
                ['Récords', preview.summary.records],
              ].map(([label, value]) => (
                <div key={label} className="p-2 rounded-control surface-well">
                  <p className="text-[11px] text-muted">{label}</p>
                  <p className="text-base font-semibold tabular-nums">{value}</p>
                </div>
              ))}
            </div>

            {nothingToDo ? (
              <p className="text-sm leading-relaxed">
                Ya tienes todo lo que trae este respaldo. No hay nada que restaurar.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5 text-sm">
                {preview.plan.added > 0 && (
                  <li>
                    <span className="font-semibold tabular-nums">{preview.plan.added}</span> registros
                    nuevos se agregan.
                  </li>
                )}
                {preview.plan.restored > 0 && (
                  <li>
                    <span className="font-semibold tabular-nums">{preview.plan.restored}</span> registros
                    que habías borrado vuelven.
                  </li>
                )}
                {preview.plan.kept > 0 && (
                  <li className="text-muted">
                    <span className="tabular-nums">{preview.plan.kept}</span> ya los tienes: no se tocan.
                  </li>
                )}
              </ul>
            )}

            <p className="text-xs text-muted leading-relaxed">
              Restaurar nunca borra ni cambia lo que ya tienes: solo agrega lo que falta.
            </p>
          </div>
        )}
      </Modal>
    </Card>
  )
}
