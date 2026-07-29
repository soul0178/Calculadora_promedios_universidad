/* ============================= REPORTES PDF ============================= */
// Genera reportes en PDF 100% en el navegador (sin backend), usando jsPDF
// (cargado desde CDN en index.html). No requiere conexión salvo la primera
// vez que se carga la librería; si ya se cacheó por el service worker,
// funciona incluso offline.

function jsPDFCtor(){
  return (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : null;
}

function slug(str){
  return (str||'reporte').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // quita tildes
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'reporte';
}

function pdfHeader(doc, title, subtitle){
  doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.setTextColor(30,25,18);
  doc.text(title, 40, 50);
  doc.setFont('helvetica','normal'); doc.setFontSize(10.5); doc.setTextColor(110,110,110);
  doc.text(subtitle, 40, 68, {maxWidth:500});
  doc.setDrawColor(210,105,79); doc.setLineWidth(1.2);
  doc.line(40, 80, 555, 80);
  doc.setTextColor(20,20,20);
}

function pdfFooter(doc){
  const pageCount = doc.internal.getNumberOfPages();
  for(let i=1;i<=pageCount;i++){
    doc.setPage(i);
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(150,150,150);
    doc.text('Generado con Libreta — calculadora de notas', 40, 810);
    doc.text(`Página ${i} de ${pageCount}`, 515, 810);
  }
}

function ensurePageSpace(doc, y, needed){
  if(y + needed > 780){ doc.addPage(); return 50; }
  return y;
}

/* ---------- Reporte de un curso ---------- */
function exportCoursePDF(id){
  const JsPDF = jsPDFCtor();
  if(!JsPDF){ alert('No se pudo cargar el generador de PDF. Revisa tu conexión e inténtalo de nuevo.'); return; }
  const c = getCourse(id);
  if(!c) return;

  const doc = new JsPDF({unit:'pt', format:'a4'});
  const eff = effectiveGrades(c), acc = acumulado(c), proj = projection(c);
  const pass = passStatus(c), meta = metaStatus(c);
  const dateStr = new Date().toLocaleDateString('es-PE',{year:'numeric',month:'long',day:'numeric'});

  pdfHeader(doc, c.name || '(sin nombre)',
    `${careerName(c.careerId)} · ${c.creditos>0? c.creditos+' créditos' : 'sin créditos'} · Generado el ${dateStr}`);

  let y = 108;
  doc.setFont('helvetica','bold'); doc.setFontSize(12.5);
  doc.text('Notas', 40, y); y += 20;
  doc.setFont('helvetica','normal'); doc.setFontSize(10.5);
  LABELS.forEach((lbl,i)=>{
    const val = eff[i];
    const isSus = c.sustitutorio && c.sustitutorio.targetIndex===i;
    doc.text(lbl, 50, y);
    doc.text(val==null ? '—' : String(Math.round(val)), 230, y);
    doc.text(`peso ${fmtW(c.weights[i])}%`, 290, y);
    if(isSus) doc.text('(sustitutorio aplicado)', 380, y);
    y += 16;
  });

  y += 14;
  doc.setFont('helvetica','bold'); doc.setFontSize(12.5);
  doc.text('Resumen', 40, y); y += 20;
  doc.setFont('helvetica','normal'); doc.setFontSize(10.5);
  doc.text(`Acumulado actual: ${fmt(acc)}`, 50, y); y += 16;
  doc.text(`Proyectado: ${proj==null ? '—' : fmt(proj)}`, 50, y); y += 16;
  y = ensurePageSpace(doc, y, 40);
  doc.text(`Estado de aprobación: ${pass.label}`, 50, y); y += 14;
  doc.setTextColor(90,90,90);
  doc.text(pass.detail, 60, y, {maxWidth:480}); y += 28;
  doc.setTextColor(20,20,20);
  y = ensurePageSpace(doc, y, 40);
  doc.text(`Meta personal (${c.goal}): ${meta.label}`, 50, y); y += 14;
  doc.setTextColor(90,90,90);
  doc.text(meta.detail, 60, y, {maxWidth:480}); y += 28;
  doc.setTextColor(20,20,20);

  // Gráfico de evolución, si está visible en pantalla (solo disponible
  // cuando el reporte se genera desde el detalle del curso).
  const chartCanvas = document.getElementById('chart-course');
  if(chartCanvas){
    try{
      const img = chartCanvas.toDataURL('image/png');
      y = ensurePageSpace(doc, y, 240);
      doc.setFont('helvetica','bold'); doc.setFontSize(12.5);
      doc.text('Evolución de notas', 40, y); y += 12;
      doc.addImage(img, 'PNG', 40, y, 500, 220);
    }catch(e){ /* si el canvas no se puede leer, se omite el gráfico sin romper el PDF */ }
  }

  pdfFooter(doc);
  doc.save(`reporte-${slug(c.name)}.pdf`);
}

/* ---------- Reporte de un semestre cerrado ---------- */
function exportSemesterPDF(semId){
  const JsPDF = jsPDFCtor();
  if(!JsPDF){ alert('No se pudo cargar el generador de PDF. Revisa tu conexión e inténtalo de nuevo.'); return; }
  const sem = state.semesters.find(s=>s.id===semId);
  if(!sem) return;

  const doc = new JsPDF({unit:'pt', format:'a4'});
  const dateStr = new Date(sem.closedAt).toLocaleDateString('es-PE',{year:'numeric',month:'long',day:'numeric'});
  pdfHeader(doc, sem.label, `Semestre cerrado el ${dateStr} · ${sem.courses.length} curso(s)`);

  let y = 108;
  const careersInSem = state.careers.filter(car => sem.courses.some(c=>c.careerId===car.id));

  if(careersInSem.length===0){
    doc.setFont('helvetica','normal'); doc.setFontSize(11);
    doc.text('Este semestre no tiene cursos registrados.', 40, y);
  }

  careersInSem.forEach(car=>{
    const st = semesterCareerStats(sem, car.id);
    y = ensurePageSpace(doc, y, 60);
    doc.setFont('helvetica','bold'); doc.setFontSize(12.5);
    doc.text(car.name, 40, y); y += 18;
    doc.setFont('helvetica','normal'); doc.setFontSize(10.5); doc.setTextColor(90,90,90);
    doc.text(`Promedio del semestre: ${st.avg==null ? '—' : fmt(st.avg)} (${st.count} curso(s))`, 50, y);
    doc.setTextColor(20,20,20);
    y += 18;

    sem.courses.filter(c=>c.careerId===car.id).forEach(c=>{
      const acc = acumulado(c);
      y = ensurePageSpace(doc, y, 16);
      const line = `•  ${c.name || '(sin nombre)'}  —  nota final: ${roundGrade(acc)} (promedio ${fmt(acc)})${c.creditos>0 ? ', '+c.creditos+' cr.' : ''}`;
      doc.setFont('helvetica','normal'); doc.setFontSize(10.5);
      doc.text(line, 55, y, {maxWidth:480});
      y += 16;
    });
    y += 16;
  });

  pdfFooter(doc);
  doc.save(`reporte-${slug(sem.label)}.pdf`);
}
