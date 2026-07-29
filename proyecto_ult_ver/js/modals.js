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

function openAddPastSemesterModal(){
  // Estado local del formulario: una fila por curso.
  let rows = [{ rid: uid(), name:'', careerId: state.careers[0].id, creditos:'', nota:'' }];

  function rowHtml(r){
    return `<tr data-rid="${r.rid}">
      <td style="padding:4px 6px;"><input type="text" class="past-name" data-rid="${r.rid}" placeholder="Ej. Cálculo II" value="${esc(r.name)}" style="width:100%;"></td>
      <td style="padding:4px 6px;"><select class="past-career" data-rid="${r.rid}" style="width:100%;">${careerOptionsHtml(r.careerId)}</select></td>
      <td style="padding:4px 6px;"><input type="number" class="past-creditos" data-rid="${r.rid}" min="0" step="1" placeholder="0" value="${r.creditos}" style="width:100%;"></td>
      <td style="padding:4px 6px;"><input type="number" class="past-nota" data-rid="${r.rid}" min="0" max="20" step="1" placeholder="0-20" value="${r.nota}" style="width:100%;"></td>
      <td style="padding:4px 6px;text-align:center;"><button class="btn btn-danger btn-sm" data-del-row="${r.rid}" title="Quitar curso">✕</button></td>
    </tr>`;
  }

  function tableHtml(){
    return `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;">
      <thead><tr>
        <th style="text-align:left;padding:6px;border-bottom:1px solid var(--border);font-size:11px;color:var(--ink-faint);text-transform:uppercase;">Curso</th>
        <th style="text-align:left;padding:6px;border-bottom:1px solid var(--border);font-size:11px;color:var(--ink-faint);text-transform:uppercase;">Carrera</th>
        <th style="text-align:left;padding:6px;border-bottom:1px solid var(--border);font-size:11px;color:var(--ink-faint);text-transform:uppercase;">Créditos</th>
        <th style="text-align:left;padding:6px;border-bottom:1px solid var(--border);font-size:11px;color:var(--ink-faint);text-transform:uppercase;">Nota final</th>
        <th style="border-bottom:1px solid var(--border);"></th>
      </tr></thead>
      <tbody id="past-rows-body">${rows.map(rowHtml).join('')}</tbody>
    </table>`;
  }

  function body(){
    return `
    <h3>Agregar semestre pasado</h3>
    <div class="desc">Para cada curso, ingresa solo el nombre, la carrera, los créditos y tu nota final — no hace falta desglosar cada evaluación. Internamente esa nota se guarda como si la hubieras sacado en las 6 evaluaciones, con los pesos por defecto 15/15/15/15/20/20%, así el promedio ponderado coincide exactamente con tu nota final y no rompe las gráficas ni las estadísticas.</div>
    <label>Nombre del semestre</label>
    <input type="text" id="past-sem-label" placeholder="Ej. 2023-II" value="Semestre ${state.semesters.length+1}">
    <div style="overflow-x:auto;">${tableHtml()}</div>
    <div style="margin-top:10px;"><button class="btn btn-ghost btn-sm" id="past-add-row">+ Agregar curso</button></div>
    <div class="err-txt" id="past-err"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-act="close-modal">Cancelar</button>
      <button class="btn btn-primary" id="confirm-past-sem">Guardar semestre</button>
    </div>`;
  }

  openOverlay(body());

  function syncRowsFromDOM(){
    rows.forEach(r=>{
      const nameEl=document.querySelector(`.past-name[data-rid="${r.rid}"]`);
      const careerEl=document.querySelector(`.past-career[data-rid="${r.rid}"]`);
      const credEl=document.querySelector(`.past-creditos[data-rid="${r.rid}"]`);
      const notaEl=document.querySelector(`.past-nota[data-rid="${r.rid}"]`);
      if(nameEl) r.name=nameEl.value;
      if(careerEl) r.careerId=careerEl.value;
      if(credEl) r.creditos=credEl.value;
      if(notaEl) r.nota=notaEl.value;
    });
  }

  function redrawRows(){
    document.getElementById('past-rows-body').innerHTML = rows.map(rowHtml).join('');
    bindRowEvents();
  }

  function bindRowEvents(){
    document.querySelectorAll('[data-del-row]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        syncRowsFromDOM();
        if(rows.length<=1) return; // siempre debe quedar al menos una fila
        rows = rows.filter(r=>r.rid!==btn.dataset.delRow);
        redrawRows();
      });
    });
  }

  document.querySelector('[data-act="close-modal"]').addEventListener('click', closeOverlay);

  document.getElementById('past-add-row').addEventListener('click', ()=>{
    syncRowsFromDOM();
    rows.push({ rid:uid(), name:'', careerId: state.careers[0].id, creditos:'', nota:'' });
    redrawRows();
  });

  document.getElementById('confirm-past-sem').addEventListener('click', ()=>{
    syncRowsFromDOM();
    const label = document.getElementById('past-sem-label').value.trim();
    const errEl = document.getElementById('past-err');
    const validRows = rows.filter(r=> r.name.trim()!=='');
    if(validRows.length===0){ errEl.textContent='Agrega al menos un curso con nombre.'; return; }
    for(const r of validRows){
      const notaNum = parseFloat(String(r.nota).replace(',','.'));
      if(isNaN(notaNum) || notaNum<0 || notaNum>20){ errEl.textContent=`Nota inválida en "${r.name.trim()}". Debe ser un número entre 0 y 20.`; return; }
    }
    errEl.textContent='';
    const courses = validRows.map(r=>{
      const notaNum = clip(Math.round(parseFloat(String(r.nota).replace(',','.'))), 0, 20);
      const creditosNum = parseFloat(r.creditos) || 0;
      return {
        id: uid(), name: r.name.trim(), careerId: r.careerId, creditos: creditosNum,
        weights: DEFAULT_WEIGHTS.slice(),
        grades: new Array(6).fill(notaNum),
        sustitutorio: null, goal: 11, archived: false, createdAt: Date.now()
      };
    });
    state.semesters.unshift({ id: uid(), label: label || `Semestre ${state.semesters.length+1}`, closedAt: Date.now(), courses });
    saveState(); closeOverlay(); render();
  });

  bindRowEvents();
}

function openCloseSemesterModal(){
  if(state.courses.length===0){ alert('No hay cursos activos para cerrar el semestre.'); return; }
  const incomplete = incompleteCourses();
  if(incomplete.length>0){
    openOverlay(`
      <h3>Aún no puedes terminar el semestre</h3>
      <div class="desc">Para cerrar el semestre, todos los cursos activos deben tener sus 6 evaluaciones ingresadas. Completa las notas que faltan, o archiva el curso si ya no aplica (los cursos archivados no bloquean el cierre).</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin:14px 0;">
        ${incomplete.map(c=>{
          const miss=missingIndices(c);
          return `<div class="risk-banner risk-danger" style="margin:0;padding:10px 14px;">
            <div>
              <strong>${esc(c.name)||'(sin nombre)'}</strong>
              <div style="font-size:12.5px;margin-top:2px;">Falta${miss.length>1?'n':''}: ${miss.map(i=>LABELS[i]).join(', ')}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-act="close-modal">Cerrar</button>
        <button class="btn btn-primary" id="go-to-first-incomplete">Ir al primer curso pendiente</button>
      </div>
    `);
    document.querySelector('[data-act="close-modal"]').addEventListener('click', closeOverlay);
    document.getElementById('go-to-first-incomplete').addEventListener('click', ()=>{
      closeOverlay();
      state.view={tab:'course', courseId:incomplete[0].id, showArchived:state.view.showArchived};
      render();
    });
    return;
  }
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
    if(closeSemester(label)){ 
      closeOverlay(); 
      render(); 
      
      // --- NUEVO: LANZAR LOGROS AL CERRAR ---
      // El semestre recién creado siempre se pone al inicio (índice 0) de state.semesters
      const closedSem = state.semesters[0]; 
      const achievementsData = calculateSemesterAchievements(closedSem);
      
      // Solo abrimos el modal si ganó al menos 1 logro
      if (achievementsData.length > 0) {
        // Un pequeño delay para que el usuario vea que el dashboard se actualizó primero
        setTimeout(() => openAchievementsModal(closedSem.label, achievementsData), 400);
      }
    }
  });
}
/* ============================= MODAL DE LOGROS (WRAPPED) ============================= */
function openAchievementsModal(semLabel, achievementsData) {
  let html = `
    <div class="wrapped-header">
      <h2>🎉 Diagnóstico Académico</h2>
      <div class="desc">Logros desbloqueados del semestre: ${esc(semLabel)}</div>
    </div>
    <div class="wrapped-body">
  `;

  achievementsData.forEach(item => {
    html += `<div class="achieve-course">
      <div class="ac-name">${esc(item.course.name || '(sin nombre)')}</div>
      <div class="ac-list">
        ${item.achievements.map(achId => {
          const def = ACHIEVEMENTS_DEF[achId];
          return `<div class="ac-badge">
            <div class="ac-icon">${def.icon}</div>
            <div class="ac-info">
              <div class="ac-title">${def.name}</div>
              <div class="ac-desc">${def.desc}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  });

  html += `</div>
  <div class="modal-actions" style="margin-top:20px; justify-content: center;">
    <button class="btn btn-primary" data-act="close-modal" style="width: 100%; font-size: 16px; padding: 12px;">¡Increíble!</button>
  </div>`;

  openOverlay(html);
  document.querySelector('[data-act="close-modal"]').addEventListener('click', closeOverlay);
}
