# Libreta2 — Calculadora de notas

**Versión 12**

App de una sola página (sin backend, sin build) para llevar tus notas, proyectar tu
promedio y simular qué necesitas sacar en lo que falta. Todo se guarda en el
`localStorage` de tu navegador. Interfaz responsive: funciona igual de bien en
computadora que en el celular (instalable como PWA, ver sección de abajo).

## Cómo ejecutarla en local

No necesita instalación ni servidor. Basta con abrir el archivo en tu navegador:

1. Clona o descarga el repositorio.
2. Haz doble clic en `index.html` (o ábrelo con "Abrir con → tu navegador").

Si prefieres levantar un servidor local (opcional, por ejemplo para evitar
restricciones de algunos navegadores con `file://`):

```bash
cd libreta2
python3 -m http.server 8000
# luego abre http://localhost:8000
```

> **Importante para probar la PWA:** los *service workers* (y por lo tanto el
> modo offline y el botón "Instalar app") **no funcionan abriendo el archivo
> directamente con `file://`**, solo sobre `http://` o `https://`. Para
> probar esa parte, usa el servidor local de arriba (`http://localhost:8000`)
> o sube la carpeta a cualquier hosting estático (GitHub Pages, Netlify,
> Vercel, etc.), que sirve por HTTPS. El resto de la app (notas, cálculos,
> import/export) sí funciona igual abriendo el HTML directamente.

## Estructura del proyecto

```
libreta2/
├── index.html              # Esqueleto HTML, enlaza CSS y JS
├── manifest.json           # Manifest de la PWA (nombre, íconos, colores)
├── service-worker.js       # Cache offline de los archivos estáticos
├── package.json            # Solo para herramientas de desarrollo (tests)
├── vitest.config.js        # Config de Vitest
├── .gitignore               # node_modules, .DS_Store, logs
├── icons/                  # Íconos de la app (192, 512, maskable, apple-touch) — logo actualizado
├── css/
│   └── styles.css          # Todos los estilos (incluye tema oscuro/claro)
├── js/
│   ├── config.js            # Constantes globales (etiquetas, pesos, storage key)
│   ├── state.js              # Carga/guardado de estado, migraciones, carreras
│   ├── calc.js                # Todo el cálculo de notas: acumulado, proyección,
│   │                           #   estado de aprobación, meta, sustitutorio, series
│   ├── semesters-courses.js   # Cierre/reapertura de semestres, CRUD de cursos
│   ├── render.js               # Construcción del HTML: dashboard, detalle de curso,
│   │                           #   gráficos (Chart.js)
│   ├── events.js                # Delegación de eventos (data-act), edición de notas,
│   │                           #   simulador "¿qué necesito sacar?"
│   ├── modals.js                 # Ventanas modales: crear/editar curso, sustitutorio,
│   │                           #   gestionar carreras, cerrar semestre
│   ├── import-export.js          # Exportar/importar JSON de respaldo
│   ├── pdf-report.js              # Exportar reporte de un curso o semestre a PDF
│   ├── firebase-config.js          # Tu config de Firebase (placeholder por defecto)
│   ├── cloud-sync.js                # Login con Google + sincronización con Firestore
│   └── main.js                    # Punto de entrada: primer render()
└── test/
    ├── helpers/loadCalc.js  # Harness que carga config.js/calc.js reales en un
    │                        #   sandbox de Node (módulo "vm"), sin modificarlos
    └── calc.test.js         # Pruebas de la lógica de cálculo de notas
```

Los archivos de `js/` se cargan como scripts globales clásicos (no ES
modules), en el orden declarado en `index.html`, para que la app funcione
con solo abrir el HTML —sin servidor y sin problemas de CORS con `file://`.
Esto es intencional y **no cambia** con las pruebas: los tests son una
herramienta de desarrollo aparte, no afectan cómo corre la app en el
navegador.

## Carreras

Un usuario nuevo (sin datos previos en `localStorage`) arranca con una sola
carrera creada por defecto: **Ciencia de la Computación**. Desde el botón
**"Gestionar carreras"** del dashboard puedes renombrarla, agregar más
carreras o eliminarla (siempre debe quedar al menos una carrera mientras
existan cursos asociados a ella).

## Pruebas automatizadas (Vitest)

`js/calc.js` concentra toda la matemática de la app (acumulado, proyección,
estado de aprobación, meta, sustitutorio). `test/calc.test.js` cubre esas
funciones con Vitest para detectar regresiones si se toca ese archivo.

Como `calc.js` no es un módulo (es un script clásico que depende de variables
globales), los tests no lo importan directamente: `test/helpers/loadCalc.js`
carga el **archivo real, sin copias ni modificaciones**, dentro de un
contexto aislado de Node (`vm.createContext` + `vm.runInContext`), igual a
como el navegador lo cargaría como `<script>`. Así los tests siempre
verifican el código que de verdad se sirve a los usuarios.

Para correrlos:

```bash
cd libreta2
npm install
npm test          # corre los tests una vez
npm run test:watch  # modo watch, útil mientras desarrollas
```

Esto **no afecta en nada** el uso normal de la app: `npm install` solo trae
Vitest como dependencia de desarrollo; `index.html` sigue abriéndose
directamente en el navegador sin necesidad de Node ni de build alguno.

Qué cubre la suite actual:
- `acumulado` / `remainingWeight`: suma ponderada de lo ingresado y peso pendiente.
- `projection`: proyección plana (una sola nota) y por regresión lineal
  (dos o más notas), incluyendo el clip a [0, 20].
- `trendSlope` / `trendArrow`: dirección de la tendencia.
- `roundGrade`: redondeo y corrección de imprecisiones de punto flotante.
- `passStatus`: los 5 estados de aprobación (Aprobado, Desaprobado, No
  podrás aprobar, Aprobación asegurada, En curso).
- `metaStatus`: los 6 estados de la meta personal, incluyendo el caso de
  "alcanzada solo por redondeo".
- `applySustitutorio`: a qué evaluación apunta según qué parciales estén
  ingresados, y el rechazo cuando no supera la nota más baja.
- `creditWeightedAvg`: ponderación por créditos, ignorando cursos sin créditos.

Si modificas `calc.js`, corre `npm test` antes de dar el cambio por bueno.

## Exportar reportes a PDF

Desde el detalle de un curso o desde una tarjeta de semestre cerrado en el
historial, el botón **"📄 Exportar PDF"** genera y descarga un reporte —
todo en el navegador, sin backend ni subir datos a ningún lado (usa
[jsPDF](https://github.com/parallax/jsPDF), cargado desde CDN igual que
Chart.js).

- **Reporte de curso**: nombre, carrera, créditos, cada nota con su peso,
  acumulado, proyectado, estado de aprobación, estado de la meta personal y,
  si el gráfico de evolución está visible en pantalla, una imagen de ese
  gráfico.
- **Reporte de semestre**: por cada carrera del semestre, el promedio
  ponderado y el listado de cursos con su nota final.

> **Nota:** esto es un PDF descargable, no un enlace público para compartir
> con otra persona sin que pueda editar los datos. Eso último (un link de
> solo lectura) requeriría subir una copia de los datos a algún servicio o
> backend, algo que esta app —por diseño— no tiene (todo vive en tu
> `localStorage`).

## Sincronización en la nube con Google (opcional)

Por defecto, Libreta sigue funcionando 100% local (`localStorage`), sin
ninguna cuenta ni conexión. Si quieres tener tus notas sincronizadas entre
varios dispositivos (por ejemplo laptop + celular), puedes activar el login
con Google y sincronización en tiempo real usando
[Firebase](https://firebase.google.com) (plan gratuito "Spark" es suficiente).

**Mientras no completes estos pasos, no cambia nada**: `js/firebase-config.js`
trae valores de ejemplo (`"TU_API_KEY"`, etc.) y, al detectarlos, la app no
intenta conectarse a Firebase ni muestra el botón de "Iniciar sesión".

### 1) Crear el proyecto de Firebase

1. Entra a [console.firebase.google.com](https://console.firebase.google.com) y crea un proyecto nuevo (gratis).
2. Dentro del proyecto, click en el ícono `</>` ("Agregar app" → Web) y regístrala con cualquier nombre.
3. Firebase te mostrará un objeto `firebaseConfig` con `apiKey`, `authDomain`, etc. Cópialo.
4. Pega esos valores en `js/firebase-config.js`, reemplazando los `"TU_..."` de ejemplo.

> Estas claves **no son secretas**: Firebase las expone públicamente en el
> código de cualquier app web (puedes verlas con "Ver código fuente" en
> cualquier sitio hecho con Firebase). Lo que protege tus datos son las
> reglas de seguridad de Firestore del paso 3, no ocultar este archivo.

### 2) Habilitar el login con Google

En el proyecto, ve a **Authentication → Sign-in method → Google** y
actívalo (elige un correo de soporte, es obligatorio).

Si vas a probar en `http://localhost:8000` no necesitas hacer nada más:
Firebase autoriza `localhost` por defecto. Si subes la app a un hosting
(GitHub Pages, Netlify, etc.), agrega ese dominio en **Authentication →
Settings → Authorized domains**.

> **El login con Google no funciona abriendo `index.html` con `file://`**
> (igual que el service worker, ver nota más arriba). Usa el servidor local
> (`python3 -m http.server 8000`) o un hosting con HTTPS.

### 3) Crear Firestore y sus reglas de seguridad

1. Ve a **Firestore Database → Crear base de datos** (modo producción, la región que prefieras).
2. En la pestaña **Reglas**, reemplaza el contenido por:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /libretaUsers/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Esto asegura que cada usuario solo puede leer y escribir su propio
documento (`libretaUsers/{su-uid}`), nunca el de otra persona.

### Cómo funciona una vez configurado

- Aparece un botón **"🔑 Iniciar sesión con Google"** en la barra superior.
- Al iniciar sesión, tu estado (`state`: cursos, carreras, semestres) se
  guarda en `Firestore` bajo `libretaUsers/{tu-uid}`, además de seguir
  guardándose en `localStorage` como respaldo local.
- Los cambios se sincronizan **en tiempo real**: si editas una nota en el
  celular, se refleja en la laptop (con la sesión iniciada) sin recargar.
- Si inicias sesión por primera vez desde un dispositivo que ya tenía
  cursos guardados localmente, y esa cuenta **ya tiene datos en la nube**,
  la app te pregunta cuál copia conservar (para no perder nada por
  accidente). Si la cuenta no tiene datos aún, sube automáticamente lo que
  tenías local.
- "Cerrar sesión" detiene la sincronización, pero no borra nada: tus datos
  siguen en este dispositivo (`localStorage`) y en la nube.

### Qué NO incluye esta primera versión

- **Resolución de conflictos fina**: si editas el mismo curso *offline* en
  dos dispositivos a la vez y luego ambos recuperan conexión, gana el
  último que sincronice ("last write wins"), no se combinan los cambios
  campo por campo.
- **Compartir datos entre distintas cuentas de Google** (por ejemplo, que un
  profesor vea las notas de un alumno): cada cuenta solo ve su propio
  documento, por diseño de las reglas de seguridad de arriba.

## Funcionalidades ya establecidas

Estas funciones llevan varias versiones estables en la app:

- **PWA (Progressive Web App)**: `manifest.json`, `service-worker.js` e
  íconos en `icons/`. Se puede "Instalar app" / "Añadir a pantalla de
  inicio" desde el navegador móvil (Chrome/Safari), y funciona offline una
  vez visitada la primera vez (el HTML/CSS/JS se cachea; los datos siempre
  viven solo en `localStorage`, nunca en el service worker). Si editas algún
  archivo cacheado, sube `CACHE_VERSION` en `service-worker.js` para forzar
  la actualización en los navegadores de los usuarios.
- **Validación de cierre de semestre**: no se puede terminar un semestre si
  algún curso activo tiene notas pendientes; se muestra qué evaluaciones
  faltan en cada uno. Los cursos **archivados quedan exentos** de esta
  validación (archivar es la forma de decir "este curso ya no cuenta", por
  ejemplo uno retirado).
- **Tema oscuro/claro** (🌙/☀️) en la barra superior. Al abrir la app por
  primera vez se usa la preferencia del sistema (`prefers-color-scheme`);
  después, la elección se guarda en `localStorage`
  (`libreta-notas-theme`) y se respeta en visitas futuras.
- **Pruebas automatizadas con Vitest** para `calc.js` y **exportación a
  PDF** para el detalle de un curso y para cada semestre cerrado del
  historial (ver secciones de arriba).
- **Sincronización en la nube con Google** opcional (Firebase Auth +
  Firestore, ver sección de arriba). Sin configurar
  `js/firebase-config.js`, la app sigue siendo 100% local.

## Novedades de la versión 12

- **Rebranding**: nuevo nombre (**Libreta2**) y nuevo logo/ícono de la app
  (`icons/`, `manifest.json`).
- **Diseño responsive revisado**: ajustes específicos para pantallas de
  celular en `css/styles.css` (filas de curso, encabezados y grillas se
  reacomodan en columnas en vez de desbordar).
- **Carrera por defecto simplificada**: un usuario nuevo ya no arranca con
  dos carreras de ejemplo ("Ciencia de la Computación" + "Filosofía"), sino
  con una sola ("Ciencia de la Computación"), ver sección "Carreras" arriba.
- **`js/firebase-config.js` limpio**: el archivo commiteado al repositorio
  solo trae valores de ejemplo (`"TU_API_KEY"`, etc.), nunca las claves
  reales de un proyecto de Firebase en uso.
