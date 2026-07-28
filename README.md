# Libreta — Calculadora de notas

App de una sola página (sin backend, sin build) para llevar tus notas, proyectar tu
promedio y simular qué necesitas sacar en lo que falta. Todo se guarda en el
`localStorage` de tu navegador.

## Cómo ejecutarla en local

No necesita instalación ni servidor. Basta con abrir el archivo en tu navegador:

1. Descarga/descomprime la carpeta `libreta-notas`.
2. Haz doble clic en `index.html` (o ábrelo con "Abrir con → tu navegador").

Si prefieres levantar un servidor local (opcional, por ejemplo para evitar
restricciones de algunos navegadores con `file://`):

```bash
cd libreta-notas
python3 -m http.server 8000
# luego abre http://localhost:8000
```

## Estructura del proyecto

```
libreta-notas/
├── index.html              # Esqueleto HTML, enlaza CSS y JS
├── css/
│   └── styles.css          # Todos los estilos
└── js/
    ├── config.js            # Constantes globales (etiquetas, pesos, storage key)
    ├── state.js              # Carga/guardado de estado, migraciones, carreras
    ├── calc.js                # Todo el cálculo de notas: acumulado, proyección,
    │                           #   estado de aprobación, meta, sustitutorio, series
    ├── semesters-courses.js   # Cierre/reapertura de semestres, CRUD de cursos
    ├── render.js               # Construcción del HTML: dashboard, detalle de curso,
    │                           #   gráficos (Chart.js)
    ├── events.js                # Delegación de eventos (data-act), edición de notas,
    │                           #   simulador "¿qué necesito sacar?"
    ├── modals.js                 # Ventanas modales: crear/editar curso, sustitutorio,
    │                           #   gestionar carreras, cerrar semestre
    ├── import-export.js          # Exportar/importar JSON de respaldo
    └── main.js                    # Punto de entrada: primer render()
```

Los archivos se cargan como scripts globales clásicos (no ES modules), en el
orden declarado en `index.html`, para que funcione con solo abrir el HTML
—sin servidor y sin problemas de CORS con `file://`.

## Cambio reciente

El botón **"← Panel general"** para volver desde el detalle de un curso ahora
es un botón grande y centrado (antes era un texto pequeño en la esquina
superior izquierda).
