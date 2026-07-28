/* ============================= STATE / MIGRATION ============================= */
function loadState(){
  try{ const raw = localStorage.getItem(STORAGE_KEY); if(raw) return JSON.parse(raw); }catch(e){}
  // intentar migrar desde la versión anterior (v1) si existe
  try{
    const old = localStorage.getItem('libreta-notas-v1');
    if(old){ const parsed = JSON.parse(old); return { courses: parsed.courses||[], careers:[], semesters:[], view:{tab:'dashboard',courseId:null,showArchived:false} }; }
  }catch(e){}
  return { courses:[], careers:[], semesters:[], view:{tab:'dashboard', courseId:null, showArchived:false} };
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function uid(){ return 'c_' + Math.random().toString(36).slice(2,10); }

let state = loadState();
function migrate(){
  if(!state.careers) state.careers=[];
  if(state.careers.length===0){
    state.careers.push({id:uid(), name:'Ciencia de la Computación'});
    state.careers.push({id:uid(), name:'Filosofía'});
  }
  if(!state.semesters) state.semesters=[];
  if(!state.courses) state.courses=[];
  state.courses.forEach(c=>{
    if(c.creditos==null) c.creditos=0;
    if(!c.careerId) c.careerId = state.careers[0].id;
    if(c.goal==null) c.goal=11;
  });
  if(!state.view) state.view={tab:'dashboard', courseId:null, showArchived:false};
}
migrate();

function getCareer(id){ return state.careers.find(x=>x.id===id); }
function careerName(id){ const c=getCareer(id); return c? c.name : '(sin carrera)'; }

