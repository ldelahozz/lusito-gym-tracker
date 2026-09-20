# Lusito Gym Tracker

App personal para registrar entrenamientos de gimnasio. Funciona sin internet durante
el entrenamiento y sincroniza sola entre celular y PC. Tema oscuro, en español.

- **Celular:** registrar series durante el entrenamiento, con una mano.
- **PC:** armar rutinas y revisar el progreso.
- **Cada cuenta de Google tiene su propio espacio privado.**

## Correr en local

```bash
npm install
cp .env.example .env.local   # y pega ahi las claves de tu proyecto de Firebase
npm run dev
```

Se abre en `http://localhost:5173`. Otros comandos:

| Comando | Que hace |
|---|---|
| `npm run dev` | Abre la app en tu PC mientras se desarrolla |
| `npm run build` | Compila la version final |
| `npm run typecheck` | Revisa que no haya errores de tipos |
| `npm run lint` | Revisa el estilo del codigo |
| `npm run test` | Corre las pruebas de la logica |
| `npm run icons` | Regenera los iconos de la app |

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

**Android (Chrome):** abre el link de la app → menu de tres puntos → *Instalar aplicacion*.

**iPhone (Safari):** abre el link de la app → boton Compartir → *Agregar a inicio*.

Queda como una app normal, con su icono y sin barra de navegador.
La vibracion al terminar el descanso solo existe en Android; en iPhone quedan el sonido
y el aviso visual.

## Como funciona la sincronizacion

- Todo lo que registras se guarda **primero en el dispositivo** y se ve al instante,
  con o sin internet.
- Cuando hay señal, se sube solo a la nube (Firestore) y aparece en tus otros dispositivos.
- Si el mismo registro se edito en dos lados, **gana la version del celular**
  (regla aislada en `src/core/logic/conflict.ts`).
- Nada se borra de verdad: se marca como borrado, para que el borrado tambien se sincronice.

## Respaldar y restaurar

La nube no es un respaldo: si borras algo por error, ese borrado tambien se sincroniza.

- **Respaldar:** Ajustes → Exportar. Descarga un archivo `.json` con la fecha en el nombre.
  Guardalo donde quieras (Drive, correo, USB).
- **Restaurar:** Ajustes → Importar. Se revisa el archivo, te muestra un resumen de lo que
  contiene y pide confirmacion antes de escribir nada.

Si pasan mas de 30 dias sin exportar, la app te lo recuerda al terminar una sesion.
