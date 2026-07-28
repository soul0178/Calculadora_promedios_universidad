/* ============================= RENDER ============================= */
function esc(s){ return (s||'').replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
const chartInstances = {};
function destroyAllCharts(){ Object.keys(chartInstances).forEach(k=>{ chartInstances[k].destroy(); delete chartInstances[k]; }); }
function makeLineChart(canvasId, seriesActual, seriesProj, extraOpts){
  const el = document.getElementById(canvasId);
  if(!el) return;
  chartInstances[canvasId] = new Chart(el, {
    type:'line',
    data:{ labels:SHORT, datasets:[
      {label:'Real', data:seriesActual, borderColor:'#d2694f', backgroundColor:'#d2694f', pointRadius:4, tension:.25, spanGaps:false},
      {label:'Proyección', data:seriesProj, borderColor:'#e8c468', borderDash:[6,4], pointRadius:2.5, tension:.25, spanGaps:true}
    ]},
    options:{ responsive:true, scales:{ y:{min:0,max:20, grid:{color:'rgba(242,240,230,0.08)'}, ticks:{color:'#9db3a5'}}, x:{grid:{display:false}, ticks:{color:'#9db3a5'}}}, plugins:{legend:{labels:{color:'#c9d6cd'}}} }
  });
}

function render(){
  destroyAllCharts();
  const app=document.getElementById('app');
  const view=state.view;
  let html = renderTopbar();
  if(view.tab==='dashboard') html += renderDashboard();
  else if(view.tab==='course') html += renderCourseDetail(view.courseId);
  html += `<footer class="hint">Tus datos se guardan solo en este navegador (localStorage). Usa exportar/importar para respaldar.</footer>`;
  app.innerHTML = html;
  bindEvents();
  if(view.tab==='dashboard') drawDashboardCharts();
  if(view.tab==='course') drawCourseChart(view.courseId);
}

function renderTopbar(){
  const view=state.view;
  return `
  <div class="topbar">
    <div class="brand">
      <span class="mark">L</span>
      <div><h1>Libreta</h1><div class="sub">calculadora y proyección de notas</div></div>
    </div>
    <div class="toolbar">
      <button class="btn btn-ghost btn-sm" data-act="open-careers">Gestionar carreras</button>
      <button class="btn btn-ghost btn-sm" data-act="export">Exportar</button>
      <label class="btn btn-ghost btn-sm" style="position:relative;">Importar
        <input type="file" id="import-file" accept="application/json" style="position:absolute;inset:0;opacity:0;cursor:pointer;">
      </label>
      <button class="btn btn-primary btn-sm" data-act="open-create">+ Crear curso</button>
    </div>
  </div>`;
}

/* ---------- DASHBOARD ---------- */
function renderDashboard(){
  const view=state.view;
  let html='';

  // 1) Resumen general por carrera
  html += `<div class="section-title"><h2>Resumen general por carrera</h2><div class="line"></div></div>`;
  html += `<div class="summary-grid">`;
  state.careers.forEach(car=>{
    const st = overallCareerStats(car.id);
    html += `<div class="card">
      <div class="career-name">${esc(car.name)}</div>
      <div class="pair">
        <div><div class="num mono">${st.oficial==null?'—':fmt(st.oficial)}</div><div class="lbl">Oficial (semestres cerrados: ${st.closedCount} curso(s))</div></div>
        <div><div class="num mono" style="color:var(--amber);">${st.estimado==null?'—':fmt(st.estimado)}</div><div class="lbl">Estimado (incluye semestre actual)</div></div>
      </div>
    </div>`;
  });
  html += `</div>`;

  // 2) Semestre actual
  html += `<div class="section-title"><h2>Semestre actual</h2><div class="line"></div>
    <button class="btn btn-primary btn-sm" data-act="open-close-semester">Terminar semestre</button>
  </div>`;

  if(state.courses.length===0){
    html += `<div class="empty"><div class="big">📓</div><h3 style="margin:0 0 6px;">Aún no tienes cursos en este semestre</h3>
      <p style="margin:0 0 18px;">Crea tu primer curso para empezar a registrar notas.</p>
      <button class="btn btn-primary" data-act="open-create">+ Crear curso</button></div>`;
  } else {
    const active = state.courses.filter(c=> view.showArchived ? true : !c.archived);
    let rows = active.map(c=>{
      const acc=acumulado(c), proj=projection(c), arrow=trendArrow(c), pass=passStatus(c), meta=metaStatus(c);
      const badgeCls = pass.level==='ok'?'badge-ok':pass.level==='danger'?'badge-danger':pass.level==='warn'?'badge-warn':'badge-neutral';
      const metaCls = meta.level==='ok'?'badge-ok':meta.level==='danger'?'badge-danger':meta.level==='warn'?'badge-warn':'badge-neutral';
      return `<div class="course-row" data-act="open-course" data-id="${c.id}">
        <div>
          <div class="name">${esc(c.name)||'(sin nombre)'}</div>
          <div class="meta-tag"><span class="career-chip">${esc(careerName(c.careerId))}</span><span>${c.creditos>0? c.creditos+' cr.' : 'sin créditos'}</span>${c.archived?'<span>· archivado</span>':''}</div>
        </div>
        <div class="stat-mini"><div class="val mono">${fmt(acc)}</div><div class="lbl">Acumulado</div></div>
        <div class="stat-mini"><div class="val mono">${proj==null?'—':fmt(proj)}</div><div class="lbl">Proyectado</div></div>
        <div class="trend-arrow ${arrow.cls}">${arrow.icon}</div>
        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
          <span class="badge ${badgeCls}">${pass.label}</span>
          <span class="badge ${metaCls}" style="font-size:9.5px;">🎯 ${meta.label}</span>
        </div>
      </div>`;
    }).join('');
    html += `<div style="margin-bottom:10px;"><button class="btn btn-ghost btn-sm" data-act="toggle-archived">${view.showArchived?'Ocultar archivados':'Ver archivados'}</button></div>`;
    html += rows;

    // gráficos por carrera del semestre actual
    const careersActive = state.careers.filter(car => state.courses.some(c=>c.careerId===car.id));
    if(careersActive.length){
      html += `<div class="two-charts" style="margin-top:20px;">`;
      careersActive.forEach(car=>{
        const st = currentCareerStats(car.id);
        html += `<div class="chart-card">
          <h3>${esc(car.name)} — semestre actual</h3>
          <div class="sub-stat">Acumulado: <b class="mono">${st.acc==null?'—':fmt(st.acc)}</b> · Proyectado: <b class="mono" style="color:var(--amber);">${st.proj==null?'—':fmt(st.proj)}</b></div>
          <canvas id="agg-current-${car.id}" height="150"></canvas>
        </div>`;
      });
      html += `</div>`;
    }
  }

  // 3) Historial de semestres
  html += `<div class="section-title"><h2>Historial de semestres</h2><div class="line"></div></div>`;
  if(state.semesters.length===0){
    html += `<div class="empty" style="padding:30px;">Aún no has cerrado ningún semestre.</div>`;
  } else {
    state.semesters.forEach(sem=>{
      const careersInSem = state.careers.filter(car=> sem.courses.some(c=>c.careerId===car.id));
      const dateStr = new Date(sem.closedAt).toLocaleDateString('es-PE',{year:'numeric',month:'long',day:'numeric'});
      html += `<div class="semester-card">
        <div class="sem-head">
          <div><h3>${esc(sem.label)}</h3><div class="sem-date">Cerrado el ${dateStr} · ${sem.courses.length} curso(s)</div></div>
          <div class="toolbar">
            <span class="locked-note">🔒 Bloqueado</span>
            <button class="btn btn-ghost btn-sm" data-act="reopen-semester" data-id="${sem.id}">Reabrir semestre</button>
          </div>
        </div>
        <div class="two-charts">
        ${careersInSem.map(car=>{
          const st = semesterCareerStats(sem, car.id);
          return `<div class="chart-card" style="margin-bottom:0;">
            <h3>${esc(car.name)}</h3>
            <div class="sub-stat">Promedio del semestre: <b class="mono">${st.avg==null?'—':fmt(st.avg)}</b> (${st.count} curso(s))</div>
            <canvas id="agg-hist-${sem.id}-${car.id}" height="150"></canvas>
          </div>`;
        }).join('')}
        </div>
      </div>`;
    });
  }
  return html;
}

function drawDashboardCharts(){
  const careersActive = state.careers.filter(car => state.courses.some(c=>c.careerId===car.id));
  careersActive.forEach(car=>{
    const st = currentCareerStats(car.id);
    makeLineChart(`agg-current-${car.id}`, st.series.actual, st.series.proj);
  });
  state.semesters.forEach(sem=>{
    const careersInSem = state.careers.filter(car=> sem.courses.some(c=>c.careerId===car.id));
    careersInSem.forEach(car=>{
      const st = semesterCareerStats(sem, car.id);
      makeLineChart(`agg-hist-${sem.id}-${car.id}`, st.series.actual, st.series.proj);
    });
  });
}

/* ---------- COURSE DETAIL ---------- */
function renderCourseDetail(id){
  const c=getCourse(id);
  if(!c) return `<div class="empty">Curso no encontrado.</div>`;
  const eff=effectiveGrades(c), acc=acumulado(c), proj=projection(c), rem=remainingWeight(c);
  const pass=passStatus(c), meta=metaStatus(c);
  const passCls='risk-'+pass.level, metaCls='risk-'+meta.level;

  const cells = LABELS.map((lbl,i)=>{
    const val=eff[i]; const isSus = c.sustitutorio && c.sustitutorio.targetIndex===i;
    const displayVal = (val==null||val==='') ? `<span class="empty-val">—</span>` : Math.round(val);
    return `<div class="grade-cell" data-idx="${i}">
      ${isSus?`<div class="sus-badge" title="Sustitutorio aplicado (original: ${fmtGrade(c.sustitutorio.originalValue)})">S</div>`:''}
      <div class="dot dot-${TYPES[i]}"></div>
      <div class="lbl">${lbl}</div>
      <div class="val" data-act="edit-grade" data-idx="${i}">${displayVal}</div>
      <div class="weight">${fmtW(c.weights[i])}%</div>
    </div>`;
  }).join('');

  const canSus = eff[1]!=null || eff[3]!=null;
  const susText = c.sustitutorio
    ? `Sustitutorio aplicado en <b>${LABELS[c.sustitutorio.targetIndex]}</b>: ${fmtGrade(c.sustitutorio.value)} (reemplazó ${c.sustitutorio.originalValue==null?'nota vacía':fmtGrade(c.sustitutorio.originalValue)})`
    : (canSus ? 'Puedes insertar tu nota de sustitutorio para reemplazar tu parcial más bajo (Parcial 1 o 2).' : 'Ingresa Parcial 1 o Parcial 2 para habilitar el sustitutorio.');

  return `
  <div class="back-top"><button class="btn-panel-general" data-act="go-dashboard"><span class="arrow">←</span> Panel general</button></div>
  <div class="detail-header">
    <div>
      <h2>${esc(c.name)||'(sin nombre)'}</h2>
      <div class="meta-tag" style="font-size:13px;"><span class="career-chip">${esc(careerName(c.careerId))}</span><span style="color:var(--ink-faint);">${c.creditos>0? c.creditos+' créditos':'sin créditos asignados'}</span></div>
    </div>
    <div class="toolbar">
      <button class="btn btn-ghost btn-sm" data-act="edit-course" data-id="${c.id}">Editar curso</button>
      <button class="btn btn-ghost btn-sm" data-act="${c.archived?'unarchive':'archive'}" data-id="${c.id}">${c.archived?'Desarchivar':'Archivar'}</button>
      <button class="btn btn-danger btn-sm" data-act="delete-course" data-id="${c.id}">Eliminar</button>
    </div>
  </div>

  <div class="stamp-row">
    <div class="stamp"><div class="stamp-circle">${fmt(acc)}</div><div class="stamp-txt"><div class="t1">Acumulado actual</div><div class="t2">Suma ponderada de lo ya ingresado</div></div></div>
    <div class="stamp"><div class="stamp-circle ghost">${proj==null?'—':fmt(proj)}</div><div class="stamp-txt"><div class="t1">Proyectado</div><div class="t2">Si sigues tu tendencia actual</div></div></div>
  </div>

  <div class="grade-row">${cells}</div>

  <div class="sus-panel">
    <div class="info">${susText}</div>
    <div class="toolbar">
      ${c.sustitutorio?`<button class="btn btn-ghost btn-sm" data-act="clear-sus" data-id="${c.id}">Quitar</button>`:''}
      <button class="btn btn-sm ${c.sustitutorio?'btn-ghost':'btn-primary'}" data-act="open-sus" data-id="${c.id}" ${canSus?'':'disabled style="opacity:.4;cursor:not-allowed;"'}>${c.sustitutorio?'Editar sustitutorio':'Insertar sustitutorio'}</button>
    </div>
  </div>

  <div class="risk-banner ${passCls}"><strong>${pass.label}.</strong>&nbsp;${pass.detail}&nbsp;<span style="opacity:.65;">— la nota mínima para aprobar es 10,5</span></div>
  <div class="risk-banner ${metaCls}"><strong>${meta.label}.</strong>&nbsp;${meta.detail}${meta.clean===false?' <span style="opacity:.75;">(no es una meta limpia)</span>':''}</div>

  <div class="two-col">
    <div class="chart-card" style="margin-bottom:0;"><h3>Evolución de notas</h3><canvas id="chart-course" height="180"></canvas></div>
    <div>
      <div class="panel">
        <h3>Meta personal del curso</h3>
        <div class="desc" style="margin:-6px 0 10px;color:var(--ink-faint);font-size:12px;">Distinta de aprobar (10,5 fijo). Es tu propia nota objetivo.</div>
        <div class="field-row"><label>Nota meta (entero)</label><input type="number" min="0" max="20" step="1" id="goal-input" value="${c.goal}"></div>
        <button class="btn btn-primary btn-sm" data-act="save-goal" data-id="${c.id}">Guardar meta</button>
      </div>
      <div class="panel">
        <h3>Simulador — ¿qué necesito sacar?</h3>
        ${rem<=0.0001 ? `<div class="sim-result">Ya ingresaste todas tus notas. Tu nota final es <b>${roundGrade(acc)}</b> (promedio ${fmt(acc)}).</div>` : `
        <div class="field-row"><label>Meta a simular (entero)</label><input type="number" min="0" max="20" step="1" id="sim-target" value="${c.goal}"></div>
        <button class="btn btn-sm" data-act="run-sim" data-id="${c.id}">Calcular</button>
        <div id="sim-output"></div>`}
      </div>
    </div>
  </div>`;
}

function drawCourseChart(id){
  const c=getCourse(id);
  if(!c || !document.getElementById('chart-course')) return;
  const s = courseSeries(c);
  makeLineChart('chart-course', s.actual, s.proj);
}

