/* ============================= CALC: CURSO ============================= */
function effectiveGrades(course){
  const eff = course.grades.slice();
  const sus = course.sustitutorio;
  if(sus && sus.value!=null && sus.targetIndex!=null) eff[sus.targetIndex]=sus.value;
  return eff;
}
function enteredIndices(course){ const eff=effectiveGrades(course); const out=[]; for(let i=0;i<6;i++) if(eff[i]!=null && eff[i]!=='') out.push(i); return out; }
function missingIndices(course){ const ent=enteredIndices(course); const out=[]; for(let i=0;i<6;i++) if(!ent.includes(i)) out.push(i); return out; }
function acumulado(course){ const eff=effectiveGrades(course); let sum=0; enteredIndices(course).forEach(i=>{ sum+=eff[i]*course.weights[i]; }); return sum; }
function remainingWeight(course){ let w=0; missingIndices(course).forEach(i=> w+=course.weights[i]); return w; }
function linearFit(points){
  const n=points.length; const sx=points.reduce((a,p)=>a+p[0],0); const sy=points.reduce((a,p)=>a+p[1],0);
  const sxx=points.reduce((a,p)=>a+p[0]*p[0],0); const sxy=points.reduce((a,p)=>a+p[0]*p[1],0);
  const denom=n*sxx-sx*sx; if(denom===0) return {slope:0, intercept:sy/n};
  const slope=(n*sxy-sx*sy)/denom; const intercept=(sy-slope*sx)/n; return {slope,intercept};
}
function clip(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }
function projection(course){
  const eff=effectiveGrades(course); const entered=enteredIndices(course);
  if(entered.length===0) return null;
  let predictFn;
  if(entered.length===1){ const flat=eff[entered[0]]; predictFn=()=>flat; }
  else{ const pts=entered.map(i=>[i+1,eff[i]]); const {slope,intercept}=linearFit(pts); predictFn=(x)=>clip(slope*x+intercept,0,20); }
  const full=eff.slice(); missingIndices(course).forEach(i=>{ full[i]=predictFn(i+1); });
  let sum=0; for(let i=0;i<6;i++) sum+=full[i]*course.weights[i];
  return sum;
}
function trendSlope(course){
  const eff=effectiveGrades(course); const entered=enteredIndices(course);
  if(entered.length<2) return 0;
  const pts=entered.map(i=>[i+1,eff[i]]); return linearFit(pts).slope;
}
function trendArrow(course){
  const s=trendSlope(course);
  if(Math.abs(s)<0.35) return {icon:'→',cls:'trend-flat'};
  return s>0? {icon:'↑',cls:'trend-up'} : {icon:'↓',cls:'trend-down'};
}
function roundGrade(n){ return Math.round(n); }
function courseFinalValue(course){
  const rem=remainingWeight(course);
  if(rem<=0.0001) return acumulado(course);
  const p=projection(course);
  return p!=null? p : acumulado(course);
}
function passStatus(course){
  const acc=acumulado(course), rem=remainingWeight(course);
  if(rem<=0.0001){
    const rounded=roundGrade(acc);
    return acc>=PASS_GRADE ? {level:'ok',label:'Aprobado',detail:`Nota final: ${rounded} (promedio ${fmt(acc)})`}
                            : {level:'danger',label:'Desaprobado',detail:`Nota final: ${rounded} (promedio ${fmt(acc)})`};
  }
  const maxPossible=acc+rem*20;
  if(maxPossible<PASS_GRADE) return {level:'danger',label:'No podrás aprobar',detail:`Aunque saques 20 en todo lo que falta, llegas a ${fmt(maxPossible)}`};
  const neededRaw=(PASS_GRADE-acc)/rem;
  if(neededRaw<=0) return {level:'ok',label:'Aprobación asegurada',detail:'Ya acumulaste el mínimo para aprobar (10,5)'};
  if(neededRaw>20) return {level:'danger',label:'Muy difícil aprobar',detail:`Necesitarías ${fmt(neededRaw)} de promedio en lo restante`};
  const neededInt=Math.min(20,Math.ceil(neededRaw-1e-9));
  return {level:'neutral',label:'En curso',detail:`Necesitas al menos ${neededInt} en cada evaluación pendiente para aprobar`};
}
function metaStatus(course){
  const acc=acumulado(course), rem=remainingWeight(course), goal=course.goal??11;
  if(rem<=0.0001){
    const rounded=roundGrade(acc);
    if(acc>=goal) return {level:'ok',label:'Meta alcanzada',clean:true,detail:`Promedio real ${fmt(acc)}`};
    if(rounded>=goal) return {level:'warn',label:'Meta alcanzada (por redondeo)',clean:false,detail:`Promedio real ${fmt(acc)} redondea a ${rounded}, no llegaste limpio a ${goal}`};
    return {level:'danger',label:'Meta no alcanzada',detail:`Promedio ${fmt(acc)}, te faltó para ${goal}`};
  }
  const proj=projection(course);
  if(proj==null) return {level:'neutral',label:'Meta: sin datos aún',detail:'Ingresa al menos una nota para proyectar'};
  const roundedProj=roundGrade(proj);
  if(proj>=goal) return {level:'ok',label:'Vas bien para tu meta',detail:`Proyección: ${fmt(proj)}`};
  if(roundedProj>=goal) return {level:'warn',label:'Meta ajustada (por redondeo)',detail:`Tu proyección (${fmt(proj)}) solo alcanza ${goal} si redondea`};
  return {level:'danger',label:'En riesgo de no llegar a tu meta',detail:`Proyección: ${fmt(proj)}, meta: ${goal}`};
}
function fmt(n){ if(n==null||isNaN(n)) return '—'; return n.toFixed(2).replace('.',','); }
function fmtGrade(n){ if(n==null||isNaN(n)) return '—'; return String(Math.round(n)); }
function fmtW(w){ return Math.round(w*1000)/10; }
function applySustitutorio(course,value){
  const eff=effectiveGrades(course); const p1=eff[1], p2=eff[3];
  if(p1==null && p2==null) return {ok:false, msg:'Ingresa al menos Parcial 1 o Parcial 2 antes de usar el sustitutorio.'};
  let target = (p1==null)?3 : (p2==null)?1 : (p1<=p2?1:3);
  const currentLow=eff[target];
  if(currentLow!=null && value<=currentLow) return {ok:false, msg:`Tu sustitutorio (${fmtGrade(value)}) no supera tu nota más baja de parciales (${fmtGrade(currentLow)}). No se aplicó.`};
  course.sustitutorio={value, targetIndex:target, originalValue: course.grades[target]};
  return {ok:true};
}

/* ============================= CALC: SERIES (para gráficos) ============================= */
function courseSeries(course){
  const eff=effectiveGrades(course); const entered=enteredIndices(course);
  let actual=eff.map(v=>v==null?null:v);
  let proj=new Array(6).fill(null);
  if(entered.length>0){
    let predictFn;
    if(entered.length===1){ const flat=eff[entered[0]]; predictFn=()=>flat; }
    else{ const pts=entered.map(i=>[i+1,eff[i]]); const {slope,intercept}=linearFit(pts); predictFn=(x)=>clip(slope*x+intercept,0,20); }
    const lastEntered=Math.max(...entered);
    proj[lastEntered]=eff[lastEntered];
    for(let i=0;i<6;i++) if(!entered.includes(i)) proj[i]=predictFn(i+1);
  }
  return {actual, proj};
}
function creditWeightedAvg(courses, valueFn){
  const withCredits = courses.filter(c=>c.creditos>0);
  const totalCred = withCredits.reduce((a,c)=>a+c.creditos,0);
  if(totalCred<=0) return null;
  const sum = withCredits.reduce((a,c)=>a+valueFn(c)*c.creditos,0);
  return sum/totalCred;
}
function aggregateSeries(courses){
  const withCredits = courses.filter(c=>c.creditos>0);
  const actual=[], proj=[];
  for(let i=0;i<6;i++){
    let sumA=0,credA=0,sumP=0,credP=0;
    withCredits.forEach(c=>{
      const s=courseSeries(c);
      if(s.actual[i]!=null){ sumA+=s.actual[i]*c.creditos; credA+=c.creditos; }
      if(s.proj[i]!=null){ sumP+=s.proj[i]*c.creditos; credP+=c.creditos; }
    });
    actual.push(credA>0? sumA/credA : null);
    proj.push(credP>0? sumP/credP : null);
  }
  return {actual, proj};
}
function currentCareerStats(careerId){
  const courses = state.courses.filter(c=>c.careerId===careerId);
  if(courses.length===0) return null;
  return {
    acc: creditWeightedAvg(courses, acumulado),
    proj: creditWeightedAvg(courses, c=> projection(c)!=null?projection(c):acumulado(c)),
    series: aggregateSeries(courses),
    count: courses.length
  };
}
function semesterCareerStats(semester, careerId){
  const courses = semester.courses.filter(c=>c.careerId===careerId);
  if(courses.length===0) return null;
  return { avg: creditWeightedAvg(courses, acumulado), series: aggregateSeries(courses), count: courses.length };
}
function overallCareerStats(careerId){
  let closedCourses=[];
  state.semesters.forEach(s=>{ closedCourses = closedCourses.concat(s.courses.filter(c=>c.careerId===careerId)); });
  const oficial = creditWeightedAvg(closedCourses, acumulado);
  const currentCourses = state.courses.filter(c=>c.careerId===careerId);
  const combined = closedCourses.concat(currentCourses);
  const estimado = creditWeightedAvg(combined, c => currentCourses.includes(c) ? courseFinalValue(c) : acumulado(c));
  return {oficial, estimado, closedCount:closedCourses.length, currentCount:currentCourses.length};
}

