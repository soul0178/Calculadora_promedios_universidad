/* ============================= INIT ============================= */
state.view.tab = 'dashboard';
state.view.courseId = null;
if (typeof initCloudSync === 'function') initCloudSync();
render();

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('service-worker.js')
      .catch(err=> console.warn('No se pudo registrar el service worker:', err));
  });
}
