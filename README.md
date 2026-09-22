# Lusito Gym Tracker

App personal para registrar entrenamientos de gimnasio. Funciona sin internet durante
el entrenamiento y se sincroniza sola entre celular y PC. Tema oscuro, en español.

- **Celular:** registrar series durante el entrenamiento, con una mano.
- **PC:** armar rutinas y revisar el progreso.
- **Cada cuenta de Google tiene su propio espacio privado.** Solo entran los correos invitados.

## Qué hace

| Sección | Para qué sirve |
|---|---|
| **Entrenar** | Te dice qué rutina toca hoy según tu split semanal. Durante la sesión ves un ejercicio a la vez, con peso, reps y RIR de la vez pasada ya escritos: registrar una serie es un toque (y se puede deshacer). Sugiere cuándo subir de peso con doble progresión. Descanso con cuenta regresiva que dice qué sigue, vibración y sonido. Avisa récords al momento. Puedes saltarte un ejercicio o cambiarlo solo por hoy. |
| **Rutinas** | Rutinas con sus ejercicios en orden. Cada serie con su rango de reps (6-8) y RIR objetivo, descanso con ruedita de minutos y segundos. Split semanal (qué rutina va cada día). Catálogo de ejercicios: renombrar, fusionar, archivar. |
| **Progreso** | Por rutina, sesión contra sesión: qué ejercicios subieron, se quedaron igual o bajaron, con la diferencia de peso, reps y RIR serie por serie. Detalle por ejercicio con gráfica, historial y fuerza relativa. Tu cuerpo: peso, proteína de referencia y calorías de mantenimiento estimadas. |
| **Ajustes** | Tus datos (sexo, año de nacimiento, altura), paso del peso, calentamientos, sugerencias, sonido, vibración, tamaño del texto y guía rápida. Respaldo en archivo, borrado definitivo y, para el dueño, la lista de invitados. |

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
- **Al abrir, solo se baja lo que cambió** desde la última vez: cada registro lleva la hora
  en que la nube lo recibió y cada dispositivo recuerda hasta dónde ya bajó
  (`src/core/logic/deltaSync.ts`). Lo demás sale de la memoria del dispositivo, gratis.
  La primera vez en cada dispositivo, y una vez al mes por seguridad, se baja todo.
  Si algo no cuadra: Ajustes → Sincronización → *Volver a bajar todo*.
- Si el mismo registro se editó en dos lados, **gana la versión del celular**
  (regla aislada en `src/core/logic/conflict.ts`).
- Borrar desde las pantallas normales solo marca el registro como borrado, para que el
  borrado también se sincronice. El borrado definitivo vive aparte, en Ajustes: deja en la
  nube solo una marca vacía, sin datos, para que los otros dispositivos también lo quiten.

## Lista de invitados

Solo pueden entrar los correos de la lista. Cada invitado tiene su propio espacio privado.
Lo hacen valer las reglas de `firestore.rules`, no la pantalla.

**Configurarla, una sola vez** (en este orden, o el dueño se queda fuera):

1. En Firebase: **Firestore Database → Datos → Iniciar colección**. ID de la colección:
   `guests`. ID del documento: tu correo **en minúsculas**. Dos campos:
   `email` (string) con tu correo, y `admin` (boolean) en `true`.
2. En Firebase: **Firestore Database → Reglas**, pegar el contenido de `firestore.rules` y
   **Publicar**.

Después, desde la app: **Ajustes → Invitados** para invitar o quitar correos (solo lo ve el
dueño). Quien entre sin invitación ve una pantalla que le pide pedir acceso.

## Cuánta gente cabe gratis

El plan gratis de Firebase da 50,000 lecturas y 20,000 escrituras al día, y 1 GiB de espacio
en total, compartidos entre todos. Como al abrir solo se baja lo nuevo, cada persona gasta
unas decenas de lecturas al día: caben cientos. Lo primero que se llenaría es el espacio,
después de años de uso de unas decenas de personas. El proyecto está en el plan sin
tarjeta: si algún día se pasara, la sincronización se pausa hasta el día siguiente y nunca
se cobra nada.

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

Sus datos desaparecen de la nube y de todos los dispositivos. Solo se puede recuperar con un
respaldo.

## Estructura

```
src/
  app/        rutas, navegación e indicador de sincronización
  core/
    logic/    lógica pura con pruebas: récords, progreso, prellenado, respaldo, conflictos…
    sync/     espejo en memoria de Firestore y escrituras sin esperar a la nube
    ui/       botones, campos, ventanas, avisos
  features/   pantallas: auth, access (invitados), session (Entrenar), routines, progress, settings
```

## De dónde salen las pautas

Los globos "?" de la app y la guía rápida (Ajustes) explican cada pauta con su fuente
(`src/core/help.ts`):

- **Subir de peso:** ACSM 2009, subir 2 a 10% al superar las repeticiones buscadas. La app
  sugiere ~2.5% (el lado prudente), redondeado a tu paso de peso, cuando llegas al tope del
  rango en todas las series con el RIR planeado (`src/core/logic/suggest.ts`).
- **Descansos:** ACSM 2009 (2-3 min en ejercicios grandes, 1-2 min en chicos); Singer y
  cols. 2024 (más de 60-90 s ayuda un poco al músculo).
- **Proteína:** Morton y cols. 2018, 1.6 g/kg al día (hasta ~2.2 g/kg).
- **Calorías:** fórmula de Mifflin-St Jeor (1990) por un factor de actividad según tus días
  de entreno (`src/core/logic/body.ts`).

Son referencias generales, no indicaciones médicas.
