# Lusito Gym Tracker

App personal para registrar entrenamientos de gimnasio. Funciona sin internet durante
el entrenamiento y se sincroniza sola entre celular y PC. Tema oscuro, en español.

- **Celular:** registrar series durante el entrenamiento, con una mano.
- **PC:** armar rutinas y revisar el progreso.
- **Cada cuenta de Google tiene su propio espacio privado.**

## Qué hace

| Sección | Para qué sirve |
|---|---|
| **Entrenar** | Te dice qué rutina toca hoy según tu split semanal. Durante la sesión ves un ejercicio a la vez, con peso, reps y RIR de la vez pasada ya escritos: registrar una serie es un toque. Descanso con cuenta regresiva, vibración y sonido. Avisa récords al momento. Puedes saltarte un ejercicio y la próxima vez te lo recuerda. |
| **Rutinas** | Rutinas con sus ejercicios en orden. Cada serie con su rango de reps (6-8) y RIR objetivo, descanso con ruedita de minutos y segundos. Split semanal (qué rutina va cada día). Catálogo de ejercicios: renombrar, fusionar, archivar. |
| **Progreso** | Por rutina, sesión contra sesión: qué ejercicios subieron, se quedaron igual o bajaron, con la diferencia de peso, reps y RIR serie por serie. Detalle por ejercicio con gráfica e historial, incluidas las veces que te lo saltaste. |
| **Ajustes** | Paso del peso, calentamientos, sonido, vibración y avisos. Respaldo en archivo y borrado definitivo. |

## Correr en local

```bash
npm install
cp .env.example .env.local   # y pega ahí las claves de tu proyecto de Firebase
npm run dev
```

Se abre en `http://localhost:5173`. Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run dev` | Abre la app en tu PC mientras se desarrolla |
| `npm run build` | Compila la versión final |
| `npm run typecheck` | Revisa que no haya errores de tipos |
| `npm run lint` | Revisa el estilo del código |
| `npm run test` | Corre las pruebas de la lógica |
| `npm run icons` | Regenera los íconos de la app |

## Desplegar

Cada `git push` a la rama `main` publica sola la app en GitHub Pages
(ver `.github/workflows/deploy.yml`).

Requisitos, una sola vez:

1. En GitHub: **Settings → Pages → Source: GitHub Actions**.
2. En GitHub: **Settings → Secrets and variables → Actions**, crear un secreto por cada
   variable de `.env.example` (mismo nombre, mismo valor).
3. En Firebase: **Authentication → Settings → Authorized domains**, agregar
   `<tu-usuario>.github.io`.
4. En Firebase: **Firestore → Rules**, pegar el contenido de `firestore.rules`.

El repositorio no contiene claves ni datos de entrenamiento.

## Instalar en el celular

**Android (Chrome):** abre el link de la app → menú de tres puntos → *Instalar aplicación*.

**iPhone (Safari):** abre el link de la app → botón Compartir → *Agregar a inicio*.

Queda como una app normal, con su ícono y sin barra de navegador.
La vibración al terminar el descanso solo existe en Android; en iPhone quedan el sonido
y el aviso visual.

## Cómo funciona la sincronización

- Todo lo que registras se guarda **primero en el dispositivo** y se ve al instante,
  con o sin internet.
- Cuando hay señal, se sube solo a la nube (Firestore) y aparece en tus otros dispositivos.
- Si el mismo registro se editó en dos lados, **gana la versión del celular**
  (regla aislada en `src/core/logic/conflict.ts`).
- Borrar desde las pantallas normales solo marca el registro como borrado, para que el
  borrado también se sincronice. El borrado definitivo vive aparte, en Ajustes.

## Respaldar y restaurar

La nube no es un respaldo: si borras algo por error, ese borrado también se sincroniza.

- **Respaldar:** Ajustes → Exportar respaldo. En el celular abre el menú de compartir
  (guardar en Archivos, Drive, mandarlo por WhatsApp); en la PC se descarga un archivo
  `.json` con la fecha en el nombre.
- **Restaurar:** Ajustes → Importar respaldo. Revisa el archivo, muestra lo que contiene y
  pide confirmación. **Solo agrega lo que falta**: nunca borra ni cambia lo que ya tienes.
- Los videos de los ejercicios no van en el respaldo: se quedan en el celular donde los
  guardaste.

Si pasan más de 30 días sin exportar, Entrenar te lo recuerda al final de la lista.

## Borrado definitivo

En Ajustes → Borrado definitivo, con confirmación explícita:

- **Todos los entrenamientos** (hay que escribir `BORRAR`): sesiones, series, notas y
  récords. Rutinas, ejercicios y ajustes se quedan; sirve para empezar de cero después de
  hacer pruebas.
- **Rutinas o ejercicios archivados**, con todo su historial.

Desaparece de la nube y de todos los dispositivos. Solo se puede recuperar con un respaldo.

## Estructura

```
src/
  app/        rutas, navegación e indicador de sincronización
  core/
    logic/    lógica pura con pruebas: récords, progreso, prellenado, respaldo, conflictos…
    sync/     espejo en memoria de Firestore y escrituras sin esperar a la nube
    ui/       botones, campos, ventanas, avisos
  features/   pantallas: auth, session (Entrenar), routines, progress, settings
```
