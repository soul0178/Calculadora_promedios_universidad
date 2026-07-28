/* ============================= MODALS ============================= */
function openOverlay(innerHtml){
  const wrap=document.createElement('div'); wrap.className='overlay'; wrap.id='overlay';
  wrap.innerHTML=`<div class="modal">${innerHtml}</div>`;
  wrap.addEventListener('click', e=>{ if(e.target===wrap) closeOverlay(); });
  document.body.appendChild(wrap);
}
function closeOverlay(){ const o=document.getElementById('overlay'); if(o) o.remove(); }

function careerOptionsHtml(selectedId){
  return state.careers.map(car=>`<option value="${car.id}" ${car.id===selectedId?'selected':''}>${esc(car.name)}</option>`).join('');
}

function openCreateModal(){
  openOverlay(`
    <h3>Crear curso</h3>
    <div class="desc">Define el nombre, carrera, créditos y el peso de cada evaluación (en %). Todo editable después.</div>
    <label>Nombre del curso</label>
    <input type="text" id="new-name" placeholder="Ej. Cálculo III">
    <div style="display:flex;gap:10px;">
      <div style="flex:1;"><label>Carrera</label><select id="new-career">${careerOptionsHtml(state.careers[0].id)}</select></div>
      <div style="width:110px;"><label>Créditos</label><input type="number" id="new-creditos" min="0" step="1" placeholder="0"></div>
    </div>
    <label style="margin-bottom:0;">Pesos por evaluación (%)</label>
    <div class="weight-grid">
      ${LABELS.map((l,i)=>`<div class="weight-item"><label>${l}</label><input type="number" min="0" max="100" step="0.1" class="w-input" data-idx="${i}" placeholder="0" value=""></div>`).join('')}
    </div>
    <div class="weight-sum" id="weight-sum"></div>
    <div class="err-txt" id="create-err"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-act="close-modal">Cancelar</button>
      <button class="btn btn-primary" id="confirm-create">Crear curso</button>
    </div>
  `);
  document.querySelectorAll('.w-input').forEach(i=>i.addEventListener('input', updateWeightSum));
  document.getElementById('confirm-create').addEventListener('click', ()=>{
    const name=document.getElementById('new-name').value.trim();
    const careerId=document.getElementById('new-career').value;
    const creditos=parseFloat(document.getElementById('new-creditos').value)||0;
    const sum=getWeightSum();
    if(!name){ document.getElementById('create-err').textContent='Ponle un nombre al curso.'; return; }
    if(Math.abs(sum-100)>0.5){ document.getElementById('create-err').textContent='Los pesos deben sumar 100%.'; return; }
    const weights=Array.from(document.querySelectorAll('.w-input')).map(i=>parseFloat(i.value||0)/100);
    const course=newCourseSkeleton();
    course.name=name; course.careerId=careerId; course.creditos=creditos; course.weights=weights;
    state.courses.push(course); saveState(); closeOverlay();
    state.view={tab:'course', courseId:course.id, showArchived:state.view.showArchived};
    render();
  });
  document.querySelector('[data-act="close-modal"]').addEventListener('click', closeOverlay);
  updateWeightSum();
}
function getWeightSum(){ return Array.from(document.querySelectorAll('.w-input')).reduce((a,i)=>a+(parseFloat(i.value)||0),0); }
function updateWeightSum(){
  const sum=getWeightSum(); const el=document.getElementById('weight-sum');
  el.textContent=`Suma actual: ${sum.toFixed(1)}%`; el.className='weight-sum '+(Math.abs(sum-100)<=0.5?'ok':'bad');
}

function openEditCourseModal(id){
  const c=getCourse(id);
  openOverlay(`
    <h3>Editar curso — ${esc(c.name)}</h3>
    <div class="desc">Ajusta carrera, créditos y pesos. Los pesos deben sumar 100%.</div>
    <div style="display:flex;gap:10px;">
      <div style="flex:1;"><label>Carrera</label><select id="edit-career">${careerOptionsHtml(c.careerId)}</select></div>
      <div style="width:110px;"><label>Créditos</label><input type="number" id="edit-creditos" min="0" step="1" value="${c.creditos||0}"></div>
    </div>
    <label style="margin-bottom:0;">Pesos por evaluación (%)</label>
    <div class="weight-grid">
      ${LABELS.map((l,i)=>`<div class="weight-item"><label>${l}</label><input type="number" min="0" max="100" step="0.1" class="w-input" data-idx="${i}" value="${fmtW(c.weights[i])}"></div>`).join('')}
    </div>
    <div class="weight-sum" id="weight-sum"></div>
    <div class="err-txt" id="create-err"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-act="close-modal">Cancelar</button>
      <button class="btn btn-primary" id="confirm-edit">Guardar cambios</button>
    </div>
  `);
  document.querySelectorAll('.w-input').forEach(i=>i.addEventListener('input', updateWeightSum));
  document.getElementById('confirm-edit').addEventListener('click', ()=>{
    const sum=getWeightSum();
    if(Math.abs(sum-100)>0.5){ document.getElementById('create-err').textContent='Los pesos deben sumar 100%.'; return; }
    c.careerId=document.getElementById('edit-career').value;
    c.creditos=parseFloat(document.getElementById('edit-creditos').value)||0;
    c.weights=Array.from(document.querySelectorAll('.w-input')).map(i=>parseFloat(i.value||0)/100);
    saveState(); closeOverlay(); render();
  });
  document.querySelector('[data-act="close-modal"]').addEventListener('click', closeOverlay);
  updateWeightSum();
}

function openSusModal(id){
  const c=getCourse(id); const eff=effectiveGrades(c); const p1=c.grades[1], p2=c.grades[3];
  openOverlay(`
    <h3>Insertar sustitutorio</h3>
    <div class="desc">Reemplazará automáticamente tu nota más baja entre Parcial 1 (${fmtGrade(p1)}) y Parcial 2 (${fmtGrade(p2)}), conservando el mismo peso.</div>
    <label>Nota del sustitutorio (entero)</label>
    <input type="number" id="sus-value" min="0" max="20" step="1" value="${c.sustitutorio?c.sustitutorio.value:''}">
    <div class="err-txt" id="sus-err"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-act="close-modal">Cancelar</button>
      <button class="btn btn-primary" id="confirm-sus">Aplicar</button>
    </div>
  `);
  document.querySelector('[data-act="close-modal"]').addEventListener('click', closeOverlay);
  document.getElementById('confirm-sus').addEventListener('click', ()=>{
    const vRaw=parseFloat(document.getElementById('sus-value').value);
    if(isNaN(vRaw)||vRaw<0||vRaw>20){ document.getElementById('sus-err').textContent='Ingresa una nota válida entre 0 y 20.'; return; }
    const res=applySustitutorio(c, Math.round(vRaw));
    if(!res.ok){ document.getElementById('sus-err').textContent=res.msg; return; }
    saveState(); closeOverlay(); render();
  });
}

function openCareersModal(){
  function body(){
    return `
    <h3>Gestionar carreras</h3>
    <div class="desc">Puedes renombrar o eliminar carreras (solo si ningún curso, activo o de un semestre cerrado, las usa).</div>
    ${state.careers.map(car=>`
      <div class="career-list-item">
        <input type="text" class="career-name-input" data-id="${car.id}" value="${esc(car.name)}">
        <button class="btn btn-danger btn-sm" data-del="${car.id}">Eliminar</button>
      </div>`).join('')}
    <div class="err-txt" id="career-err"></div>
    <label>Agregar nueva carrera</label>
    <div style="display:flex;gap:8px;">
      <input type="text" id="new-career-name" placeholder="Ej. Literatura">
      <button class="btn btn-primary btn-sm" id="add-career">Agregar</button>
    </div>
    <div class="modal-actions"><button class="btn btn-ghost" data-act="close-modal">Cerrar</button></div>
    `;
  }
  openOverlay(body());
  const rebind = ()=>{
    document.querySelector('[data-act="close-modal"]').addEventListener('click', closeOverlay);
    document.querySelectorAll('.career-name-input').forEach(inp=>{
      inp.addEventListener('blur', ()=>{
        const car=getCareer(inp.dataset.id);
        if(inp.value.trim()){ car.name=inp.value.trim(); saveState(); }
      });
    });
    document.querySelectorAll('[data-del]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const cid=btn.dataset.del;
        const inUseActive = state.courses.some(c=>c.careerId===cid);
        const inUseHist = state.semesters.some(s=>s.courses.some(c=>c.careerId===cid));
        if(inUseActive||inUseHist){ document.getElementById('career-err').textContent='No se puede eliminar: hay cursos usando esta carrera.'; return; }
        if(state.careers.length<=1){ document.getElementById('career-err').textContent='Debe quedar al menos una carrera.'; return; }
        state.careers=state.careers.filter(c=>c.id!==cid); saveState();
        document.querySelector('.modal').innerHTML=body(); rebind();
      });
    });
    document.getElementById('add-career').addEventListener('click', ()=>{
      const val=document.getElementById('new-career-name').value.trim();
      if(!val) return;
      state.careers.push({id:uid(), name:val}); saveState();
      document.querySelector('.modal').innerHTML=body(); rebind();
    });
  };
  rebind();
}

function openCloseSemesterModal(){
  if(state.courses.length===0){ alert('No hay cursos activos para cerrar el semestre.'); return; }
  openOverlay(`
    <h3>Terminar semestre</h3>
    <div class="desc">Esto bloqueará (solo lectura) los ${state.courses.length} curso(s) de tu semestre actual y los guardará en el historial. Podrás reabrir el semestre después si necesitas corregir algo.</div>
    <label>Nombre del semestre</label>
    <input type="text" id="sem-label" placeholder="Ej. 2026-I" value="Semestre ${state.semesters.length+1}">
    <div class="err-txt" id="sem-err"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-act="close-modal">Cancelar</button>
      <button class="btn btn-primary" id="confirm-close-sem">Terminar semestre</button>
    </div>
  `);
  document.querySelector('[data-act="close-modal"]').addEventListener('click', closeOverlay);
  document.getElementById('confirm-close-sem').addEventListener('click', ()=>{
    const label=document.getElementById('sem-label').value.trim();
    if(closeSemester(label)){ closeOverlay(); render(); }
  });
}

