/* ============================= IMPORT / EXPORT ============================= */
function doExport(){
  const blob=new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=`libreta-notas-${new Date().toISOString().slice(0,10)}.json`; a.click();
  URL.revokeObjectURL(url);
}
function onImport(e){
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const data=JSON.parse(reader.result);
      if(!data.courses) throw new Error('formato inválido');
      state=data; migrate(); saveState(); render();
    }catch(err){ alert('No se pudo importar el archivo: '+err.message); }
  };
  reader.readAsText(file);
}

