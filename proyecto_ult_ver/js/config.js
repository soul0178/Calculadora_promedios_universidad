/* ============================= CONFIG ============================= */
const LABELS = ['Continua 1','Parcial 1','Continua 2','Parcial 2','Continua 3','Parcial 3'];
const SHORT  = ['C1','P1','C2','P2','C3','P3'];
const TYPES  = ['continua','parcial','continua','parcial','continua','parcial'];
const STORAGE_KEY = 'libreta-notas-v2';
const PASS_GRADE = 10.5;
// Pesos por defecto usados al ingresar un semestre pasado con solo la nota final
// (15/15/15/15/20/20 = 100%). Con esto, poner la misma nota en las 6 evaluaciones
// hace que el acumulado ponderado coincida exactamente con esa nota final.
const DEFAULT_WEIGHTS = [0.15, 0.15, 0.15, 0.15, 0.20, 0.20];
