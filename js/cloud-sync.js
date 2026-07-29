/* ============================= SINCRONIZACIÓN EN LA NUBE (Firebase) ============================= */
// Capa opcional sobre state.js: si no configuraste js/firebase-config.js (o
// el SDK de Firebase no cargó, p.ej. por estar offline), todas las funciones
// de aquí quedan inertes y la app sigue funcionando 100% local, exactamente
// como antes. Nada de esto se activa "por accidente".

let cloudApp = null, cloudAuth = null, cloudDb = null;
let currentUser = null;                 // objeto de usuario de Firebase Auth, o null
let unsubscribeSnapshot = null;         // función para dejar de escuchar cambios remotos
let pushTimer = null;
let applyingRemoteChange = false;       // evita re-subir un cambio que acabamos de recibir
const localOriginId = 'origin_' + Math.random().toString(36).slice(2, 10);

function cloudConfigured(){
  return typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG
    && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== 'TU_API_KEY';
}

function initCloudSync(){
  if(!cloudConfigured()) return; // js/firebase-config.js no fue configurado: no hacer nada
  if(typeof firebase === 'undefined'){
    console.warn('[cloud-sync] El SDK de Firebase no cargó (¿sin conexión?). La app sigue funcionando local.');
    return;
  }
  try{
    cloudApp = firebase.initializeApp(FIREBASE_CONFIG);
    cloudAuth = firebase.auth();
    cloudDb = firebase.firestore();
    try{ cloudDb.enablePersistence({ synchronizeTabs: true }).catch(()=>{}); }catch(e){}

    cloudAuth.onAuthStateChanged(user=>{
      currentUser = user;
      if(unsubscribeSnapshot){ unsubscribeSnapshot(); unsubscribeSnapshot = null; }
      if(user) attachRemoteListener(user.uid);
      render();
    });
  }catch(e){
    console.warn('[cloud-sync] No se pudo inicializar Firebase:', e);
  }
}

function signInWithGoogle(){
  if(!cloudAuth){
    alert('La sincronización en la nube no está configurada todavía. Revisa js/firebase-config.js y la sección correspondiente del README.');
    return;
  }
  const provider = new firebase.auth.GoogleAuthProvider();
  cloudAuth.signInWithPopup(provider).catch(err=>{
    // El caso más común es abrir la app con file:// o desde un dominio no
    // autorizado en Firebase (Authentication → Settings → Authorized domains).
    alert('No se pudo iniciar sesión con Google: ' + err.message);
  });
}

function signOutCloud(){
  if(!cloudAuth) return;
  cloudAuth.signOut();
}

function docRef(uid){ return cloudDb.collection('libretaUsers').doc(uid); }

function applyRemoteState(remoteState){
  if(!remoteState) return;
  applyingRemoteChange = true;
  
  // Guardamos en qué pantalla estás localmente en este momento
  const currentView = state.view; 
  
  state = remoteState;
  
  // Le devolvemos tu pantalla local (ignorando la que vino de la nube)
  state.view = currentView; 
  
  migrate();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); // guarda sin re-disparar push
  applyingRemoteChange = false;
  render();
}

// Determina si el dispositivo actual tiene datos "reales" (más allá de las
// carreras por defecto que crea migrate()) antes de decidir si hace falta
// preguntar qué copia conservar al iniciar sesión.
function localHasMeaningfulData(){
  return state.courses.length > 0 || state.semesters.length > 0;
}

function attachRemoteListener(uid){
  const ref = docRef(uid);
  ref.get().then(snap=>{
    if(!snap.exists){
      // Primera vez que este usuario inicia sesión: sube lo que ya tenías local.
      pushStateToCloud(uid);
    } else {
      const remote = snap.data();
      if(localHasMeaningfulData()){
        const keepCloud = confirm(
          'Ya hay datos guardados en la nube para esta cuenta de Google.\n\n' +
          'Aceptar → usar los datos de la nube (reemplaza los de este dispositivo).\n' +
          'Cancelar → subir los datos de este dispositivo (reemplaza los de la nube).'
        );
        if(keepCloud) applyRemoteState(remote.state);
        else pushStateToCloud(uid);
      } else {
        applyRemoteState(remote.state);
      }
    }
    // A partir de aquí, cualquier cambio remoto (desde otro dispositivo) se
    // aplica automáticamente en tiempo real.
    unsubscribeSnapshot = ref.onSnapshot(snap2=>{
      if(!snap2.exists) return;
      const remote2 = snap2.data();
      if(!remote2 || remote2._localOriginId === localOriginId) return; // eco de nuestra propia subida
      applyRemoteState(remote2.state);
    }, err=> console.warn('[cloud-sync] Error escuchando cambios remotos:', err));
  }).catch(err=> console.warn('[cloud-sync] Error obteniendo datos remotos:', err));
}

function pushStateToCloud(uid){
  if(!cloudDb) return;
  docRef(uid).set({
    state,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    _localOriginId: localOriginId
  }).catch(err=> console.warn('[cloud-sync] No se pudo sincronizar con la nube:', err));
}

// Llamado desde saveState() (state.js) cada vez que el estado cambia local.
// Se agrupan varios cambios seguidos (p.ej. escribir varias notas) en una
// sola subida, para no saturar Firestore.
function scheduleCloudPush(){
  if(!currentUser || applyingRemoteChange) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(()=> pushStateToCloud(currentUser.uid), 600);
}
