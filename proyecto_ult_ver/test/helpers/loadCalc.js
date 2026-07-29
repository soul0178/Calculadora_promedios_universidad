// Los archivos de la app son scripts clásicos (no ES modules): se cargan como
// <script> planos en index.html y se apoyan en que todo vive en el mismo
// scope global. Para probarlos SIN modificar ni un byte de esos archivos
// (y así testear exactamente lo que corre en el navegador), los ejecutamos
// aquí con el módulo "vm" de Node dentro de un contexto aislado ("sandbox").
// Ese sandbox termina exponiendo las mismas funciones/constantes globales
// que tendría `window` en el navegador (acumulado, projection, PASS_GRADE, etc).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JS_DIR = path.resolve(__dirname, '../../js');

/**
 * Carga config.js y calc.js (en ese orden, igual que index.html) en un
 * contexto nuevo y devuelve ese contexto. Cada llamada crea un sandbox
 * fresco, así los tests no se contaminan entre sí.
 */
export function loadCalc(){
  const sandbox = {};
  vm.createContext(sandbox);
  for(const file of ['config.js', 'calc.js']){
    const code = readFileSync(path.join(JS_DIR, file), 'utf8');
    vm.runInContext(code, sandbox, { filename: file });
  }
  return sandbox;
}
