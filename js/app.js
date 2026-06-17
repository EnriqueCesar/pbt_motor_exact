'use strict';
const PBT = {
  active:'cafe',
  state:{
    cafe:{tipo:'CAFE',layout:'Cafe_S_2M2O2P_Left_1',partners:4,filters:{Mes:[],Weekpart:[],DayPart:[],Tienda:[]}, names:{}},
    dt:{tipo:'DT',layout:'Dt_L_2M2O2P_Left_1',partners:11,partnerTablet:'No',filters:{Mes:[],Weekpart:[],DayPart:[],Tienda:[]}, names:{}}
  },
  labels:{
    channel:{Lobby:'Lobby','Pick up & Delivery':'Pick up & Delivery',DT:'DT'},
    mix:{Espresso:'Espresso','Café filtrado':'Café Filtrado',CBS:'CBS',Food:'Food',Otro:'Otro'},
    t:{time:'Periodo de tiempo',week:'Días de la semana',day:'Turno',comments:'Comentarios',inputs:'Cantidad de Partners',labor:'Información de turno',channels:'Distribución de canales',products:'Mix de productos',deploy:'Plan de distribución recomendado',partner:'Partner',position:'Estación',planted:'Fijo',routines:'Rutinas',yes:'Sí',no:'No'}
  }
};
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = v => String(v??'').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const pct = v => `${Math.round(Number(v)||0)}%`;
const norm = s => String(s||'').replace(/\s+/g,' ').trim();
const isYes = v => ['sí','si','yes','true','verdadero','1'].includes(String(v).trim().toLowerCase());
function cleanName(v){ return norm(v).replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 ._-]/g,'').slice(0,8).toUpperCase(); }
function selected(id){ return Array.from(document.getElementById(id).selectedOptions).map(o=>o.value).filter(Boolean); }
function optionsHTML(values, selectedValues=[]){
  selectedValues = (selectedValues||[]).map(String);
  return '<option value="">Todos</option>' + (values||[]).map(v=>`<option value="${esc(v)}" ${selectedValues.includes(String(v))?'selected':''}>${esc(v)}</option>`).join('');
}
function sourceList(tab,key){
  if(key==='Tienda') return PBT_ENGINE.list(tab==='cafe'?'TiendaCafe':'TiendaDT');
  return PBT_ENGINE.list(key);
}
function dist(a,b){ let s=0; for(let i=0;i<8;i++){ const d=(Number(a[i])||0)-(Number(b[i])||0); s+=d*d; } return s; }
function nearestMix(tab, vals){
  const arr = tab==='cafe' ? EXCEL_DATA.cafeCandidates : EXCEL_DATA.dtCandidates;
  let best = arr[0], bd=Infinity;
  for(const cand of arr){ const d=dist(cand,vals); if(d<bd){bd=d; best=cand; if(d===0)break;} }
  return {candidate:best, diff:bd};
}
const maps={cafe:null,dt:null};
function playMap(tab){
  if(maps[tab]) return maps[tab];
  const entries = tab==='cafe' ? EXCEL_DATA.cafePlayEntries : EXCEL_DATA.dtPlayEntries;
  const m = Object.create(null);
  for(const e of entries) m[e[0]]=e[1];
  return maps[tab]=m;
}
function mixId(c){return `cafe:${(c[0]/100).toFixed(2)};mop:${(c[1]/100).toFixed(2)};dt:${(c[2]/100).toFixed(2)};esp:${(c[3]/100).toFixed(2)};brew:${(c[4]/100).toFixed(2)};cbs:${(c[5]/100).toFixed(2)};food:${(c[6]/100).toFixed(2)};oth:${(c[7]/100).toFixed(2)}`;}
function compute(tab){
  const st=PBT.state[tab], calc=PBT_ENGINE.calculate(st.filters, st.tipo), ch=calc.canales, mx=calc.mix;
  const vals = tab==='cafe' ? [ch.Lobby||0, ch['Pick up & Delivery']||0, 0, mx.Espresso||0, mx['Café filtrado']||0, mx.CBS||0, mx.Food||0, mx.Otro||0]
                            : [ch.Lobby||0, ch['Pick up & Delivery']||0, ch.DT||0, mx.Espresso||0, mx['Café filtrado']||0, mx.CBS||0, mx.Food||0, mx.Otro||0];
  const near=nearestMix(tab, vals);
  const key=[Math.round(st.partners), ...near.candidate].join(',');
  const play=playMap(tab)[key] || '';
  const D5=`type:${st.tipo};ptn:${st.partners};gm:0;${mixId(near.candidate)}`;
  return {calc, input:vals, D3:near.diff, D4:mixId(near.candidate), D5, F16:play || 'No Recommendation for Current Configurations', I16:(EXCEL_DATA.channelProd&&EXCEL_DATA.channelProd[play])||0, J16:((EXCEL_DATA.channelProd&&EXCEL_DATA.channelProd[play])?'CHANNEL PRODUCTION':''), nearest:near.candidate};
}
function buildFilters(tab){
  const st=PBT.state[tab];
  return `<div class="filter-card">
    <div class="filter-title">Filtros dinámicos</div>
    <div class="filter-grid">
      ${['Mes','Weekpart','DayPart','Tienda'].map(k=>`<label>${k==='Weekpart'?'WeekPart':k==='DayPart'?'Day Part':k}<select id="${tab}_${k}" ${k==='Tienda'?'':'multiple'}>${optionsHTML(sourceList(tab,k), st.filters[k])}</select></label>`).join('')}
      <label>Partners<select id="${tab}_partners">${Array.from({length:14},(_,i)=>i+2).map(n=>`<option ${n===st.partners?'selected':''}>${n}</option>`).join('')}</select></label>
      ${tab==='dt'?`<label>Partner Tablet<select id="dt_tablet"><option ${st.partnerTablet==='No'?'selected':''}>No</option><option ${st.partnerTablet==='Sí'?'selected':''}>Sí</option></select></label>`:''}
    </div>
    <div class="actions"><button class="primary" onclick="renderTab('${tab}')">Actualizar layout</button><button class="primary" onclick="exportPDF('${tab}')">Exportar PDF</button><span id="${tab}_status" class="status"></span></div>
  </div>`;
}
function readFilters(tab){
  const st=PBT.state[tab];
  ['Mes','Weekpart','DayPart','Tienda'].forEach(k=>{ const el=document.getElementById(`${tab}_${k}`); if(el) st.filters[k]=selected(`${tab}_${k}`); });
  const p=document.getElementById(`${tab}_partners`); if(p) st.partners=Number(p.value)||st.partners;
  const t=document.getElementById('dt_tablet'); if(t) st.partnerTablet=t.value;
}
function cellAddressModel(tab, out){
  const st=PBT.state[tab], calc=out.calc, ch=calc.canales, mx=calc.mix;
  const model={
    B1:{v:'Store Type'},D1:{v:st.tipo},B2:{v:'Layout'},D2:{v:st.layout},
    B3:{v:'min mix diff'},D3:{v:out.D3,formula:`=MIN(${tab==='cafe'?'cafe_mixes':'dt_mixes'}!Z:Z)`},
    B4:{v:'lookup mix id'},D4:{v:out.D4,formula:`=BUSCARV(D3,${tab==='cafe'?'cafe_mixes':'dt_mixes'}!Z:AA,2,FALSO)`},
    B5:{v:'Play Lookup'},D5:{v:out.D5,formula:'="type:"&D1&";ptn:"&D14&";gm:0;"&D4'},
    B7:{v:'Periodo de tiempo'},B8:{v:'Rango de fechas'},B9:{v:'Días de la semana'},B10:{v:'Turno'},
    D12:{v:'Información de turno'},G12:{v:'Distribución de canales'},K12:{v:'Mix de productos'},
    D13:{v:'Partners'},G13:{v:'Lobby'},H13:{v:'Pick up & Delivery'},I13:{v:tab==='dt'?'DT':''},K13:{v:'Espresso'},L13:{v:'Café Filtrado'},M13:{v:'CBS'},N13:{v:'Food'},O13:{v:'Otro'},
    B14:{v:'Cantidad de Partners'},D14:{v:st.partners,editable:true},G14:{v:pct(ch.Lobby)},H14:{v:pct(ch['Pick up & Delivery'])},I14:{v:tab==='dt'?pct(ch.DT):''},
    K14:{v:pct(mx.Espresso)},L14:{v:pct(mx['Café filtrado'])},M14:{v:pct(mx.CBS)},N14:{v:pct(mx.Food)},O14:{v:pct(mx.Otro)},
    F15:{v:((ch.Lobby||0)+(ch['Pick up & Delivery']||0)+(tab==='dt'?(ch.DT||0):0))===100?'':'Distribución de canales debe sumar 100%'},
    K15:{v:((mx.Espresso||0)+(mx['Café filtrado']||0)+(mx.CBS||0)+(mx.Food||0)+(mx.Otro||0))===100?'':'Mix de productos debe sumar 100%'},
    B16:{v:'Plan de distribución recomendado'},F16:{v:out.F16,formula:'=SI.ERROR(BUSCARV($D$5,cafe_plays!A:B,2,FALSO),"No Recommendation for Current Configurations")'},
    I16:{v:out.I16,formula:'=SI.ERROR(BUSCARV(F16,channel_production!A:B,2,FALSO),0)'},J16:{v:out.J16,formula:'=SI.ERROR(SI(I16=1,"CHANNEL PRODUCTION",""),"")'}
  };
  if(tab==='dt'){ model.B15={v:'Partner Tablet'}; model.D15={v:st.partnerTablet,editable:true}; model.J17={v:st.partnerTablet==='Sí'?'DTO + Tablet':''}; }
  return model;
}
function renderCellSheet(tab,out){
  const model=cellAddressModel(tab,out), cols=['B','C','D','E','F','G','H','I','J','K','L','M','N','O'];
  let html='<div class="sheet"><div class="sheet-title">Motor de celdas PBT.24 — '+PBT.state[tab].tipo+'</div><table class="grid"><thead><tr><th></th>'+cols.map(c=>`<th>${c}</th>`).join('')+'</tr></thead><tbody>';
  for(let r=1;r<=17;r++){
    html+=`<tr><th>${r}</th>`;
    for(const c of cols){ const a=c+r, cell=model[a]||{}; html+=`<td class="${cell.formula?'formula':''} ${cell.editable?'editable':''}" title="${esc(cell.formula||'')}">${esc(cell.v||'')}</td>`; }
    html+='</tr>';
  }
  return html+'</tbody></table></div>';
}
function stationColor(name){
  const n=String(name||'').toLowerCase();
  if(n.includes('cbs')||n.includes('cold')) return 'st-cbs';
  if(n.includes('bar')||n.includes('espresso')) return 'st-espresso';
  if(n.includes('pos')||n.includes('register')) return 'st-pos';
  if(n.includes('horno')||n.includes('oven')) return 'st-horno';
  if(n.includes('hand')) return 'st-hand';
  if(n.includes('pick')||n.includes('mop')) return 'st-pick';
  if(n.includes('food')) return 'st-food';
  if(n.includes('dto')||n.includes('dtr')||n.includes('dt')) return 'st-dt';
  return 'st-brew';
}
function coordsFor(tab, play){
  const st=PBT.state[tab], raw=(EXCEL_DATA.coords && EXCEL_DATA.coords[play]) || [], layout=st.layout.replace(/^_/,'');
  return raw.filter(x=>String(x[0]||'').replace(/^_/,'')===layout).map(x=>({row:Number(x[1]), col:Number(x[2]), partner:String(x[3]||'')}));
}
function routineRows(play){
  const rows=(EXCEL_DATA.routines&&EXCEL_DATA.routines[play])||[];
  return rows.map(r=>({partner:String(r[0]||''), station:String(r[1]||''), planted:String(r[2]||''), routines:String(r[3]||'')}));
}
function routineMap(rows){ const m={}; rows.forEach(r=>{m[String(r.partner).replace('.','').trim()]=r;}); return m; }
function posPct(row,col){
  // Coordenadas originales PBT base: filas/columnas relativas. Esta conversión conserva proporción y no inventa posiciones.
  const maxRow=10, maxCol=14;
  return {left:(Number(col)-1)/maxCol*100, top:(Number(row)-1)/maxRow*100, width:100/maxCol, height:100/maxRow};
}
function baseAreas(tab){
  const area=(cls,row,col,rs,cs,text)=>{ const p=posPct(row,col); return `<div class="area ${cls}" style="left:${p.left}%;top:${p.top}%;width:${p.width*cs}%;height:${p.height*rs}%">${esc(text)}</div>`; };
  if(tab==='cafe') return [
    area('st-empty',1,1,3,3,''),area('st-cbs',1,4,1,3,'CBS'),area('st-brew',1,9,1,3,'Café Filtrado'),area('st-horno',1,12,1,1,'Horno'),area('st-horno',1,13,1,1,'Horno'),
    area('st-pick',4,1,2,1,'Pick up'),area('st-hand',6,1,1,2,'Hand off'),area('st-espresso',6,4,1,1,'Espresso'),area('st-espresso',6,6,1,1,'Espresso'),area('st-pos',6,8,1,1,'POS'),area('st-pos',6,10,1,1,'POS'),area('st-food',6,12,1,2,'Foodcase')
  ].join('');
  return [
    area('st-empty',1,1,8,1,''),area('st-empty',1,3,3,6,''),area('st-dt',1,3,1,2,'Ventana DT'),area('st-dt',2,5,1,1,'DTR'),area('st-dt',3,5,1,1,'DTO'),
    area('st-cbs',5,2,2,1,'CBS'),area('st-pick',7,2,2,1,'Pick up'),area('st-hand',9,2,1,2,'Hand off'),area('st-brew',4,10,1,3,'Café Filtrado'),area('st-horno',4,13,1,1,'Horno'),area('st-horno',4,14,1,1,'Horno'),
    area('st-espresso',9,5,1,1,'Espresso'),area('st-espresso',9,7,1,1,'Espresso'),area('st-pos',9,9,1,1,'POS'),area('st-pos',9,11,1,1,'POS'),area('st-food',9,13,1,2,'Foodcase')
  ].join('');
}
function nameFor(tab,letter){ return PBT.state[tab].names[String(letter).replace('.','').trim()] || ''; }
function renderLayout(tab,out){
  const play=out.F16, rows=routineRows(play), rmap=routineMap(rows); let html=baseAreas(tab);
  let coords=coordsFor(tab,play);
  if(!coords.length) html += '<div class="layout-warning">Sin coordenadas encontradas para este play/layout.</div>';
  if(tab==='dt' && PBT.state.dt.partnerTablet==='Sí'){
    // Regla original: Partner Tablet mueve DTO B hacia posición J17. Se modela como overlay visible.
    coords = coords.map(c=>String(c.partner).replace('.','').trim()==='B'?{...c,row:1,col:9,tablet:true}:c);
  }
  for(const c of coords){
    const letterRaw=c.partner, key=String(letterRaw).replace('.','').trim(), r=rmap[key]||{}, planted=isYes(r.planted), cls=planted?'partner-fixed':'partner-flex', p=posPct(c.row,c.col), name=nameFor(tab,key);
    html += `<div class="partner-marker ${cls}" style="left:${p.left}%;top:${p.top}%;width:${p.width}%;height:${p.height}%" title="${esc(r.station||'')} | Fijo: ${esc(r.planted||'')}"><span>${esc(letterRaw)}</span><small>${esc(name)}</small></div>`;
  }
  return `<section class="layout-card"><div class="section-title">Plan de distribución recomendado — ${PBT.state[tab].tipo}</div><div class="layout">${html}</div></section>`;
}
function renderMetrics(tab,out){
  const ch=out.calc.canales,mx=out.calc.mix, st=PBT.state[tab];
  const channels = tab==='cafe' ? ['Lobby','Pick up & Delivery'] : ['Lobby','Pick up & Delivery','DT'];
  const channelTotal=channels.reduce((a,k)=>a+(ch[k]||0),0), mixTotal=['Espresso','Café filtrado','CBS','Food','Otro'].reduce((a,k)=>a+(mx[k]||0),0);
  return `<div class="metrics">
    <div class="box"><h3>Información de turno</h3><div class="big">${st.partners}</div><small>Partners</small></div>
    <div class="box"><h3>Distribución de canales</h3><div class="metric-row">${channels.map(k=>`<div><b>${PBT.labels.channel[k]}</b><span>${pct(ch[k])}</span></div>`).join('')}</div><strong class="${channelTotal===100?'ok':'bad'}">Total: ${channelTotal}%</strong></div>
    <div class="box"><h3>Mix de productos</h3><div class="metric-row">${['Espresso','Café filtrado','CBS','Food','Otro'].map(k=>`<div><b>${PBT.labels.mix[k]}</b><span>${pct(mx[k])}</span></div>`).join('')}</div><strong class="${mixTotal===100?'ok':'bad'}">Total: ${mixTotal}%</strong></div>
  </div>`;
}
function renderRoutines(tab,out){
  const play=out.F16, rows=routineRows(play); let html=`<section class="routine-card"><div class="section-title">Rutinas de Partners</div><table class="routine"><thead><tr><th>Partner</th><th>Nombre dinámico</th><th>Estación</th><th>Fijo</th><th>Rutinas</th></tr></thead><tbody>`;
  for(const r of rows){
    const key=String(r.partner).replace('.','').trim(), fixed=isYes(r.planted), val=nameFor(tab,key), tablet=tab==='dt'&&PBT.state.dt.partnerTablet==='Sí'&&key==='B';
    html += `<tr class="${fixed?'row-fixed':'row-flex'}"><td><b>${esc(r.partner)}</b></td><td><input class="name-input" value="${esc(val)}" maxlength="8" oninput="setName('${tab}','${esc(key)}',this.value)"></td><td>${esc(tablet?r.station+' + Carril':r.station)}</td><td>${esc(r.planted)}</td><td>${esc(tablet?r.routines+' + Tablet':r.routines)}</td></tr>`;
  }
  html += '</tbody></table></section>';
  return html;
}
function setName(tab,key,value){ PBT.state[tab].names[key]=cleanName(value); localStorage.setItem(`pbt_exact_names_${tab}`,JSON.stringify(PBT.state[tab].names)); renderTab(tab,false); }
window.setName=setName;
function restoreNames(){ ['cafe','dt'].forEach(tab=>{ try{PBT.state[tab].names=JSON.parse(localStorage.getItem(`pbt_exact_names_${tab}`)||'{}');}catch(e){PBT.state[tab].names={};} }); }
function bindFilters(tab){
  ['Mes','Weekpart','DayPart','Tienda'].forEach(k=>{ const el=document.getElementById(`${tab}_${k}`); if(el) el.onchange=()=>renderTab(tab); });
  const p=document.getElementById(`${tab}_partners`); if(p) p.onchange=()=>renderTab(tab);
  const t=document.getElementById('dt_tablet'); if(t) t.onchange=()=>renderTab(tab);
}
function renderTab(tab,read=true){
  if(read) readFilters(tab);
  const out=compute(tab), st=PBT.state[tab], root=document.getElementById(tab);
  const visibleStore = st.filters.Tienda[0] || 'Todas las tiendas';
  root.innerHTML = buildFilters(tab) + `<div class="print-head"><div><b>Tienda:</b> ${esc(visibleStore)}</div><div><b>WeekPart / DayPart:</b> ${esc(st.filters.Weekpart.join(', ')||'Todos')} / ${esc(st.filters.DayPart.join(', ')||'Todos')}</div><div><b>Partners:</b> ${st.partners}</div></div>` + renderCellSheet(tab,out) + renderMetrics(tab,out) + renderLayout(tab,out) + renderRoutines(tab,out);
  document.getElementById(`${tab}_status`).textContent = `Registros: ${out.calc.registros.toLocaleString('es-MX')} | Tiendas visibles: ${out.calc.tiendasVisibles} | D5: ${out.D5} | F16: ${out.F16}`;
  bindFilters(tab);
}
function showTab(tab){ PBT.active=tab; $$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); $$('.page').forEach(p=>p.classList.toggle('active',p.id===tab)); renderTab(tab,false); }
window.showTab=showTab;
function exportPDF(tab){
  readFilters(tab); const st=PBT.state[tab]; const tienda=(st.filters.Tienda[0]||'Todas').replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ_-]+/g,'_'); const wp=(st.filters.Weekpart[0]||'Todos').replace(/\W+/g,'_'); const dp=(st.filters.DayPart[0]||'Todos').replace(/\W+/g,'_');
  document.title=`PBT_${tienda}_${wp}_${dp}_${st.partners}Partners`;
  window.print();
}
window.exportPDF=exportPDF;
function boot(){
  const ok=window.PBT_ENGINE && (typeof EXCEL_DATA !== 'undefined');
  if(!ok){ const missing=[]; if(!window.PBT_ENGINE) missing.push('PBT_ENGINE/data_loader'); if(typeof EXCEL_DATA==='undefined') missing.push('EXCEL_DATA/excel_data'); document.body.innerHTML='<main class="fatal"><h1>PBT Motor Exacto</h1><p>No cargaron los archivos de datos: '+missing.join(', ')+'. Valida js/data_part_01..04.js, js/data_loader.js y js/excel_data.js.</p></main>'; return; }
  restoreNames();
  document.getElementById('cafe').innerHTML=buildFilters('cafe');
  document.getElementById('dt').innerHTML=buildFilters('dt');
  renderTab('cafe',false); renderTab('dt',false); showTab('cafe');
}
document.addEventListener('DOMContentLoaded',boot);
