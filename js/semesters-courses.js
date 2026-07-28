/* ============================= SEMESTRES ============================= */
function closeSemester(label){
  if(state.courses.length===0){ alert('No hay cursos activos para cerrar el semestre.'); return false; }
  const snapshot = JSON.parse(JSON.stringify(state.courses));
  state.semesters.unshift({ id:uid(), label: label || `Semestre ${state.semesters.length+1}`, closedAt: Date.now(), courses: snapshot });
  state.courses = [];
  saveState();
  return true;
}
function reopenSemester(semId){
  const sem = state.semesters.find(s=>s.id===semId);
  if(!sem) return;
  if(state.courses.length>0 && !confirm('Ya tienes cursos activos en tu semestre actual. Los cursos de "'+sem.label+'" se agregarán a esa misma lista activa. ¿Continuar?')) return;
  state.courses = state.courses.concat(sem.courses);
  state.semesters = state.semesters.filter(s=>s.id!==sem.id);
  saveState(); render();
}

/* ============================= COURSE CRUD ============================= */
function newCourseSkeleton(){
  return { id:uid(), name:'', careerId: state.careers[0].id, creditos:0, weights:[0,0,0,0,0,0],
           grades:[null,null,null,null,null,null], sustitutorio:null, goal:11, archived:false, createdAt:Date.now() };
}
function getCourse(id){ return state.courses.find(c=>c.id===id); }

