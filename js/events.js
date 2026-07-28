/* ============================= EVENTS ============================= */
function bindEvents(){
  document.querySelectorAll('[data-act]').forEach(el=> el.addEventListener('click', onAction));
  const importInput=document.getElementById('import-file');
  if(importInput) importInput.addEventListener('change', onImport);
}

function onAction(e){
  const el=e.currentTarget, act=el.dataset.act, id=el.dataset.id;
  if(act==='go-dashboard'){ state.view={tab:'dashboard',courseId:null, showArchived:state.view.showArchived}; render(); }
  else if(act==='toggle-archived'){ state.view.showArchived=!state.view.showArchived; render(); }
  else if(act==='open-course'){ state.view={tab:'course', courseId:id, showArchived:state.view.showArchived}; render(); }
  else if(act==='open-create'){ openCreateModal(); }
  else if(act==='edit-course'){ openEditCourseModal(id); }
  else if(act==='archive'){ getCourse(id).archived=true; saveState(); render(); }
  else if(act==='unarchive'){ getCourse(id).archived=false; saveState(); render(); }
  else if(act==='delete-course'){ if(confirm('¿Eliminar este curso? Esta acción no se puede deshacer.')){ state.courses=state.courses.filter(c=>c.id!==id); state.view={tab:'dashboard',courseId:null}; saveState(); render(); } }
  else if(act==='edit-grade'){ startEditGrade(el); }
  else if(act==='open-sus'){ openSusModal(id); }
  else if(act==='clear-sus'){ getCourse(id).sustitutorio=null; saveState(); render(); }
  else if(act==='save-goal'){ const v=parseFloat(document.getElementById('goal-input').value); getCourse(id).goal=isNaN(v)?11:Math.round(v); saveState(); render(); }
  else if(act==='run-sim'){ runSimulator(id); }
  else if(act==='export'){ doExport(); }
  else if(act==='open-careers'){ openCareersModal(); }
  else if(act==='open-close-semester'){ openCloseSemesterModal(); }
  else if(act==='reopen-semester'){ reopenSemester(id); }
}

function startEditGrade(el){
  const idx=parseInt(el.dataset.idx); const c=getCourse(state.view.courseId); const current=c.grades[idx];
  el.innerHTML = `<input type="number" min="0" max="20" step="1" inputmode="numeric" value="${current==null?'':current}">`;
  const input=el.querySelector('input'); input.focus(); input.select();
  const commit=()=>{
    const raw=input.value.trim();
    if(raw===''){ c.grades[idx]=null; }
    else{ let v=parseFloat(raw.replace(',','.')); v = isNaN(v)? null : clip(Math.round(v),0,20); c.grades[idx]=v; }
    saveState(); render();
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', ev=>{ if(ev.key==='Enter') input.blur(); if(ev.key==='Escape') render(); });
}

function runSimulator(id){
  const c=getCourse(id);
  const targetRaw=parseFloat(document.getElementById('sim-target').value);
  const target=Math.round(targetRaw);
  const out=document.getElementById('sim-output');
  const acc=acumulado(c), rem=remainingWeight(c), missing=missingIndices(c);
  if(isNaN(target)){ out.innerHTML=`<div class="sim-result">Ingresa una meta válida.</div>`; return; }
  if(rem<=0.0001 || missing.length===0){ out.innerHTML=`<div class="sim-result">Ya no tienes evaluaciones pendientes.</div>`; return; }
  const threshold=target-0.5;
  const neededSum=threshold-acc;
  if(neededSum<=1e-9){ out.innerHTML=`<div class="sim-result">Ya aseguraste tu meta de <b>${target}</b>: aunque saques 0 en lo que falta, tu promedio (${fmt(acc)}) ya redondea a ${target} o más.</div>`; return; }
  if(neededSum > rem*20+1e-9){ out.innerHTML=`<div class="sim-result">No es posible: incluso sacando 20 en todo lo que falta, tu promedio llegaría a ${fmt(acc+rem*20)}, que no alcanza para redondear a ${target}.</div>`; return; }
  const w=missing.map(i=>c.weights[i]); const lbl=missing.map(i=>LABELS[i]);
  let bodyHtml = `<div style="margin-bottom:8px;">Estas combinaciones enteras aseguran al menos <b>${fmt(threshold)}</b> de promedio, el mínimo que redondea a tu meta de <b>${target}</b>:</div>`;
  if(missing.length===1){
    const neededVal=Math.min(20, Math.ceil(neededSum/w[0]-1e-9));
    bodyHtml += `<div class="sim-result" style="margin:0;">Necesitas sacar exactamente <b>${neededVal}</b> en <b>${lbl[0]}</b>.</div>`;
  } else if(missing.length===2){
    const rows=[];
    for(let a=0;a<=20;a++){
      const restante=neededSum-a*w[0];
      let b = restante<=1e-9 ? 0 : Math.ceil(restante/w[1]-1e-9);
      if(b<=20) rows.push([a,b]);
    }
    bodyHtml += `<div style="max-height:230px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="position:sticky;top:0;background:var(--bg-card);"><th style="text-align:left;padding:7px 10px;border-bottom:1px solid var(--border);">${lbl[0]}</th><th style="text-align:left;padding:7px 10px;border-bottom:1px solid var(--border);">${lbl[1]}</th></tr></thead>
        <tbody>${rows.map(r=>`<tr><td style="padding:6px 10px;border-bottom:1px solid var(--border);" class="mono">${r[0]}</td><td style="padding:6px 10px;border-bottom:1px solid var(--border);" class="mono">${r[1]}</td></tr>`).join('')}</tbody>
      </table></div>
      <div style="font-size:11.5px;color:var(--ink-faint);margin-top:6px;">Cada fila es una combinación mínima exacta: bajar cualquiera de las dos notas un punto más ya no te alcanza.</div>`;
  } else {
    const rawNeeded=neededSum/rem; const neededInt=Math.min(20, Math.ceil(rawNeeded-1e-9));
    bodyHtml += `<div class="sim-result" style="margin:0;">Tienes ${missing.length} evaluaciones pendientes (${lbl.join(', ')}), así que hay demasiadas combinaciones exactas para listarlas todas. Como referencia: sacando <b>${neededInt}</b> en cada una llegas a tu meta.</div>`;
  }
  out.innerHTML = bodyHtml;
}

