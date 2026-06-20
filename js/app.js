'use strict';
// Phase 8: PDF una pagina, vista limpia, sin nombres dinamicos visibles, motor oculto
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
function optionsHTML(values, selectedValues=[]){ selectedValues=(selectedValues||[]).map(String); return '<option value="">Todos</option>'+(values||[]).map(v=>`<option value="${esc(v)}" ${selectedValues.includes(String(v))?'selected':''}>${esc(v)}</option>`).join(''); }
function sourceList(tab,key){ if(key==='Tienda') return PBT_ENGINE.list(tab==='cafe'?'TiendaCafe':'TiendaDT'); return PBT_ENGINE.list(key); }
function dist(a,b){ let s=0; for(let i=0;i<8;i++){ const d=(Number(a[i])||0)-(Number(b[i])||0); s+=d*d; } return s; }
function nearestMix(tab, vals){ const arr=tab==='cafe'?EXCEL_DATA.cafeCandidates:EXCEL_DATA.dtCandidates; let best=arr[0],bd=Infinity; for(const cand of arr){ const d=dist(cand,vals); if(d<bd){bd=d;best=cand;if(d===0)break;} } return {candidate:best,diff:bd}; }
const maps={cafe:null,dt:null};
function playMap(tab){ if(maps[tab]) return maps[tab]; const entries=tab==='cafe'?EXCEL_DATA.cafePlayEntries:EXCEL_DATA.dtPlayEntries; const m=Object.create(null); for(const e of entries)m[e[0]]=e[1]; return maps[tab]=m; }
function mixId(c){return `cafe:${(c[0]/100).toFixed(2)};mop:${(c[1]/100).toFixed(2)};dt:${(c[2]/100).toFixed(2)};esp:${(c[3]/100).toFixed(2)};brew:${(c[4]/100).toFixed(2)};cbs:${(c[5]/100).toFixed(2)};food:${(c[6]/100).toFixed(2)};oth:${(c[7]/100).toFixed(2)}`;}
function compute(tab){
  const st=PBT.state[tab], calc=PBT_ENGINE.calculate(st.filters, st.tipo), ch=calc.canales, mx=calc.mix;
  const vals=tab==='cafe'?[ch.Lobby||0,ch['Pick up & Delivery']||0,0,mx.Espresso||0,mx['Café filtrado']||0,mx.CBS||0,mx.Food||0,mx.Otro||0]
                         :[ch.Lobby||0,ch['Pick up & Delivery']||0,ch.DT||0,mx.Espresso||0,mx['Café filtrado']||0,mx.CBS||0,mx.Food||0,mx.Otro||0];
  const near=nearestMix(tab,vals); const key=[Math.round(st.partners),...near.candidate].join(','); const play=playMap(tab)[key]||'';
  const D5=`type:${st.tipo};ptn:${st.partners};gm:0;${mixId(near.candidate)}`;
  return {calc,input:vals,D3:near.diff,D4:mixId(near.candidate),D5,F16:play||'No Recommendation for Current Configurations',I16:(EXCEL_DATA.channelProd&&EXCEL_DATA.channelProd[play])||0,J16:((EXCEL_DATA.channelProd&&EXCEL_DATA.channelProd[play])?'CHANNEL PRODUCTION':''),nearest:near.candidate};
}
function buildFilters(tab){
  const st=PBT.state[tab];
  return `<div class="filter-card"><div class="filter-title">Filtros dinámicos</div><div class="filter-grid">
  ${['Mes','Weekpart','DayPart','Tienda'].map(k=>`<label>${k==='Weekpart'?'WeekPart':k==='DayPart'?'Day Part':k}<select id="${tab}_${k}" ${k==='Tienda'?'':'multiple'}>${optionsHTML(sourceList(tab,k),st.filters[k])}</select></label>`).join('')}
  <label>Partners<select id="${tab}_partners">${Array.from({length:14},(_,i)=>i+2).map(n=>`<option ${n===st.partners?'selected':''}>${n}</option>`).join('')}</select></label>
  ${tab==='dt'?`<label>Partner Tablet<select id="dt_tablet"><option ${st.partnerTablet==='No'?'selected':''}>No</option><option ${st.partnerTablet==='Sí'?'selected':''}>Sí</option></select></label>`:''}</div>
  <div class="actions"><button class="primary" onclick="renderTab('${tab}')">Actualizar layout</button><button class="primary" onclick="exportPDF('${tab}')">Exportar PDF</button><span id="${tab}_status" class="status"></span></div></div>`;
}
function readFilters(tab){ const st=PBT.state[tab]; ['Mes','Weekpart','DayPart','Tienda'].forEach(k=>{const el=document.getElementById(`${tab}_${k}`); if(el) st.filters[k]=selected(`${tab}_${k}`);}); const p=document.getElementById(`${tab}_partners`); if(p) st.partners=Number(p.value)||st.partners; const t=document.getElementById('dt_tablet'); if(t) st.partnerTablet=t.value; }
function cellAddressModel(tab,out){
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
  if(tab==='dt'){ model.B15={v:'Partner Tablet'}; model.D15={v:st.partnerTablet,editable:true}; model.J17={v:st.partnerTablet==='Sí'?'B':'' ,formula:'=SI($D$15="Sí",BUSCARV(...),"")'}; }
  return model;
}
function colName(n){ let s=''; while(n){let r=(n-1)%26; s=String.fromCharCode(65+r)+s; n=Math.floor((n-1)/26);} return s; }
function addr(r,c){ return `${colName(c)}${r}`; }
function routineRows(play){ const rows=(EXCEL_DATA.routines&&EXCEL_DATA.routines[play])||[]; return rows.map(r=>({partner:String(r[0]||''),station:String(r[1]||''),planted:String(r[2]||''),routines:String(r[3]||'')})); }
function routineMap(rows){ const m={}; rows.forEach(r=>{m[String(r.partner).replace('.','').trim()]=r;}); return m; }
function isCoordinateFormulaCell(cell, baseForm){ const f=String((cell&&cell.f)||baseForm[(cell&&cell.a)||'']||''); return f.includes('coordinates!'); }
function normalizePartnerCell(cell, baseForm){ const c={...cell}; if(isCoordinateFormulaCell(c,baseForm)){ c.v=''; c.f=String(c.f||baseForm[c.a]||''); c.partner=''; c.partnerName=''; c.planted=false; c.routines=''; c.station=''; } return c; }
function coordsFor(tab, play){ const st=PBT.state[tab], raw=(EXCEL_DATA.coords&&EXCEL_DATA.coords[play])||[], layout=st.layout.replace(/^_/,''); return raw.filter(x=>String(x[0]||'').replace(/^_/,'')===layout).map(x=>({row:Number(x[1]), col:Number(x[2]), partner:String(x[3]||'')})); }
function nameFor(tab,letter){ return ''; }
function stationColor(name){ const n=String(name||'').toLowerCase(); if(n.includes('cbs')||n.includes('cold')) return 'st-cbs'; if(n.includes('bar')||n.includes('espresso')) return 'st-espresso'; if(n.includes('pos')||n.includes('register')) return 'st-pos'; if(n.includes('horno')||n.includes('oven')) return 'st-horno'; if(n.includes('hand')) return 'st-hand'; if(n.includes('pick')||n.includes('mop')) return 'st-pick'; if(n.includes('food')) return 'st-food'; if(n.includes('dto')||n.includes('dtr')||n.includes('dt')) return 'st-dt'; return 'st-brew'; }
function injectLayoutStyles(){
  if(document.getElementById('pbtLayoutSpecStyles')||!window.PBT_LAYOUT_SPECS) return;
  const css=[];
  for(const tab of ['cafe','dt']){
    const s=PBT_LAYOUT_SPECS.sheets[tab]; if(!s) continue;
    for(const [cls,st] of Object.entries(s.styles||{})){
      const rules=[];
      if(st.bg) rules.push(`background:${st.bg}`); if(st.color) rules.push(`color:${st.color}`); if(st.bold) rules.push('font-weight:900'); if(st.italic) rules.push('font-style:italic'); if(st.fs) rules.push(`font-size:${Math.max(7,Math.min(15,st.fs))}px`); if(st.ha) rules.push(`text-align:${st.ha==='centerContinuous'?'center':st.ha}`); if(st.va) rules.push(`align-items:${st.va==='center'?'center':'flex-start'}`); if(st.wrap) rules.push('white-space:normal');
      if(st.left) rules.push(`border-left:${st.left}`); if(st.right) rules.push(`border-right:${st.right}`); if(st.top) rules.push(`border-top:${st.top}`); if(st.bottom) rules.push(`border-bottom:${st.bottom}`);
      css.push(`.${tab}-sheet .${cls}{${rules.join(';')}}`);
    }
  }
  const el=document.createElement('style'); el.id='pbtLayoutSpecStyles'; el.textContent=css.join('\n'); document.head.appendChild(el);
}
function renderExactSheet(tab,out){
  const spec=PBT_LAYOUT_SPECS.sheets[tab], baseForm=(PBT_LAYOUT_SPECS.baseFormulas&&PBT_LAYOUT_SPECS.baseFormulas[tab])||{}, st=PBT.state[tab];
  const dyn=cellAddressModel(tab,out); const cellMap=new Map(); const covered=new Set(spec.covered||[]);
  for(const c0 of spec.cells||[]){ const c=normalizePartnerCell(c0, baseForm); cellMap.set(`${c.r}:${c.c}`, c); }
  // apply dynamic cells and base formulas
  for(const [a,d] of Object.entries(dyn)){ const m=a.match(/^([A-Z]+)(\d+)$/); if(!m) continue; let col=0; for(const ch of m[1]) col=col*26+ch.charCodeAt(0)-64; const row=Number(m[2]); const key=`${row}:${col}`; const cell=cellMap.get(key)||{r:row,c:col,a}; cell.v=d.v; if(d.formula) cell.f=d.formula; if(d.editable) cell.editable=1; cell.dynamic=1; cellMap.set(key,cell); }
  // partner coordinate cells: exact key play:layout:row:col => cell(row+17,col+1)
  const rows=routineRows(out.F16), rmap=routineMap(rows); let coords=coordsFor(tab,out.F16);
  if(tab==='dt' && st.partnerTablet==='Sí') coords=coords.map(c=>String(c.partner).replace('.','').trim()==='B'?{...c,row:0,col:9,tablet:true}:c);
  for(const c of coords){ const keyLetter=String(c.partner).replace('.','').trim(); const r=(c.tablet?17:c.row+17), col=(c.tablet?10:c.col+1); if(r<1||col<1||r>spec.maxRows||col>spec.maxCols) continue; const k=`${r}:${col}`, rr=rmap[keyLetter]||{}, fixed=isYes(rr.planted), cell=cellMap.get(k)||{r,c:col,a:addr(r,col)}; cell.v=c.partner; cell.partner=keyLetter; cell.partnerName=nameFor(tab,keyLetter); cell.planted=fixed; cell.station=rr.station||''; cell.routines=rr.routines||''; cell.sclass=fixed?stationColor(rr.station):''; cellMap.set(k,cell); }
  const colTpl=spec.widths.map(w=>`${Math.max(16,Math.round(w))}px`).join(' ');
  const rowTpl=spec.heights.map(h=>`${Math.max(8,Math.round(h))}px`).join(' ');
  let html=`<section class="exact-card"><div class="sheet-title">Layout 1:1 desde PBT.24 — ${st.tipo}</div><div class="exact-scroll"><div class="exact-grid ${tab}-sheet" style="grid-template-columns:${colTpl};grid-template-rows:${rowTpl}">`;
  for(let r=1;r<=spec.maxRows;r++){
    for(let c=1;c<=spec.maxCols;c++){
      if(covered.has(`${r}:${c}`)) continue;
      const cell=cellMap.get(`${r}:${c}`)||{r,c,a:addr(r,c)}; const a=cell.a||addr(r,c); const rs=cell.rs||1, cs=cell.cs||1; let val=cell.v??''; let inner=esc(val);
      const formula=cell.f || baseForm[a] || ''; const classes=['xcell']; if(cell.s) classes.push(cell.s); if(formula) classes.push('formula'); if(cell.editable) classes.push('editable');
      if(cell.partner){ classes.push(cell.planted?'pbt-fixed-cell':'pbt-flex-cell'); inner=`<strong>${esc(cell.v)}</strong>${cell.partnerName?`<small>${esc(cell.partnerName)}</small>`:''}`; }
      html+=`<div class="${classes.join(' ')}" data-addr="${a}" style="grid-row:${r}/span ${rs};grid-column:${c}/span ${cs}">${inner}</div>`;
    }
  }
  html+='</div></div></section>'; return html;
}

function renderPlanSheet(tab,out){
  const spec=PBT_LAYOUT_SPECS.sheets[tab], st=PBT.state[tab];
  const range=tab==='cafe'?{start:18,end:27}:{start:17,end:27};
  return renderSheetRange(tab,out,range.start,range.end,`Plan de distribución recomendado — ${st.tipo}`,'plan-card','plan-grid');
}
function renderSheetRange(tab,out,startRow,endRow,title,cardClass,gridClass){
  const spec=PBT_LAYOUT_SPECS.sheets[tab], baseForm=(PBT_LAYOUT_SPECS.baseFormulas&&PBT_LAYOUT_SPECS.baseFormulas[tab])||{}, st=PBT.state[tab];
  const dyn=cellAddressModel(tab,out); const cellMap=new Map(); const covered=new Set(spec.covered||[]);
  for(const c0 of spec.cells||[]){ const c=normalizePartnerCell(c0, baseForm); cellMap.set(`${c.r}:${c.c}`, c); }
  for(const [a,d] of Object.entries(dyn)){ const m=a.match(/^([A-Z]+)(\d+)$/); if(!m) continue; let col=0; for(const ch of m[1]) col=col*26+ch.charCodeAt(0)-64; const row=Number(m[2]); const key=`${row}:${col}`; const cell=cellMap.get(key)||{r:row,c:col,a}; cell.v=d.v; if(d.formula) cell.f=d.formula; if(d.editable) cell.editable=1; cell.dynamic=1; cellMap.set(key,cell); }
  const rows=routineRows(out.F16), rmap=routineMap(rows); let coords=coordsFor(tab,out.F16);
  if(tab==='dt' && st.partnerTablet==='Sí') coords=coords.map(c=>String(c.partner).replace('.','').trim()==='B'?{...c,row:0,col:9,tablet:true}:c);
  for(const c of coords){
    const keyLetter=String(c.partner).replace('.','').trim(); const r=(c.tablet?17:c.row+17), col=(c.tablet?10:c.col+1);
    if(r<1||col<1||r>spec.maxRows||col>spec.maxCols) continue;
    const k=`${r}:${col}`, rr=rmap[keyLetter]||{}, fixed=isYes(rr.planted), cell=cellMap.get(k)||{r,c:col,a:addr(r,col)};
    cell.v=c.partner; cell.partner=keyLetter; cell.partnerName=nameFor(tab,keyLetter); cell.planted=fixed; cell.station=rr.station||''; cell.routines=rr.routines||''; cell.sclass=fixed?stationColor(rr.station):''; cellMap.set(k,cell);
  }
  const rowHeights=spec.heights.slice(startRow-1,endRow).map(h=>Math.max(14,Math.round(h)));
  const colTpl=spec.widths.map(w=>`${Math.max(24,Math.round(w))}px`).join(' ');
  const rowTpl=rowHeights.map(h=>`${h}px`).join(' ');
  let html=`<section class="exact-card ${cardClass}"><div class="sheet-title">${esc(title)}</div><div class="exact-scroll plan-scroll"><div class="exact-grid ${gridClass} ${tab}-sheet" style="grid-template-columns:${colTpl};grid-template-rows:${rowTpl}">`;
  for(let r=startRow;r<=endRow;r++){
    for(let c=1;c<=spec.maxCols;c++){
      if(covered.has(`${r}:${c}`)) continue;
      const cell=cellMap.get(`${r}:${c}`)||{r,c,a:addr(r,c)}; const a=cell.a||addr(r,c); const rs=Math.min(cell.rs||1,endRow-r+1), cs=cell.cs||1; if(rs<=0) continue;
      let inner=esc(cell.v??''); const formula=cell.f || baseForm[a] || ''; const classes=['xcell']; if(cell.s) classes.push(cell.s); if(formula) classes.push('formula'); if(cell.editable) classes.push('editable');
      if(cell.partner){ classes.push(cell.planted?'pbt-fixed-cell':'pbt-flex-cell'); inner=`<strong>${esc(cell.v)}</strong>${cell.partnerName?`<small>${esc(cell.partnerName)}</small>`:''}`; }
      const gr=(r-startRow+1);
      html+=`<div class="${classes.join(' ')}" data-addr="${a}" style="grid-row:${gr}/span ${rs};grid-column:${c}/span ${cs}">${inner}</div>`;
    }
  }
  html+='</div></div></section>'; return html;
}
function renderAdminMotor(tab,out){
  return `<details class="admin-motor"><summary>⚙ Mostrar Motor de Celdas PBT24</summary>${renderExactSheet(tab,out)}</details>`;
}
function renderMetrics(tab,out){ const ch=out.calc.canales,mx=out.calc.mix,st=PBT.state[tab]; const channels=tab==='cafe'?['Lobby','Pick up & Delivery']:['Lobby','Pick up & Delivery','DT']; const channelTotal=channels.reduce((a,k)=>a+(ch[k]||0),0), mixTotal=['Espresso','Café filtrado','CBS','Food','Otro'].reduce((a,k)=>a+(mx[k]||0),0); return `<div class="metrics"><div class="box"><h3>Información de turno</h3><div class="big">${st.partners}</div><small>Partners</small></div><div class="box"><h3>Distribución de canales</h3><div class="metric-row">${channels.map(k=>`<div><b>${PBT.labels.channel[k]}</b><span>${pct(ch[k])}</span></div>`).join('')}</div><strong class="${channelTotal===100?'ok':'bad'}">Total: ${channelTotal}%</strong></div><div class="box"><h3>Mix de productos</h3><div class="metric-row">${['Espresso','Café filtrado','CBS','Food','Otro'].map(k=>`<div><b>${PBT.labels.mix[k]}</b><span>${pct(mx[k])}</span></div>`).join('')}</div><strong class="${mixTotal===100?'ok':'bad'}">Total: ${mixTotal}%</strong></div></div>`; }
function renderViewSwitch(tab){ return ''; }
function renderRoutines(tab,out){
  const play=out.F16, rows=routineRows(play), mode=PBT.state[tab].viewMode||'operativa';
  let html=`<section class="routine-card ${mode==='ejecutiva'?'hidden-view':''}"><div class="routine-header" onclick="toggleRoutines('${tab}')"><span id="${tab}_routine_chev">▼</span> Rutinas de Partners</div><div id="${tab}_routine_body" class="routine-body"><table class="routine"><thead><tr><th>Partner</th><th>Nombre dinámico</th><th>Estación</th><th>Fijo</th><th>Rutinas</th></tr></thead><tbody>`;
  for(const r of rows){
    const key=String(r.partner).replace('.','').trim(), fixed=isYes(r.planted), val=nameFor(tab,key), tablet=tab==='dt'&&PBT.state.dt.partnerTablet==='Sí'&&key==='B';
    html+=`<tr class="${fixed?'row-fixed':'row-flex'}"><td><b>${esc(r.partner)}</b></td><td class="blank-name"></td><td>${esc(tablet?r.station+' + Carril':r.station)}</td><td>${esc(r.planted)}</td><td>${esc(tablet?r.routines+' + Tablet':r.routines)}</td></tr>`;
  }
  return html+'</tbody></table></div></section>';
}
function setView(tab,mode){
  PBT.state[tab].viewMode='operativa';
  const page=document.getElementById(tab);
  if(page) page.classList.remove('view-executive');
  page?.querySelectorAll('.routine-card').forEach(el=>{ el.style.display=''; });
}
window.setView=setView;
function toggleRoutines(tab){
  const body=document.getElementById(`${tab}_routine_body`), chev=document.getElementById(`${tab}_routine_chev`);
  if(!body) return;
  const hidden=body.style.display==='none';
  body.style.display=hidden?'':'none';
  if(chev) chev.textContent=hidden?'▼':'▶';
}
window.toggleRoutines=toggleRoutines;
function setName(tab,key,value){ return; }
window.setName=setName;
function restoreNames(){ PBT.state.cafe.names={}; PBT.state.dt.names={}; }
function bindFilters(tab){ ['Mes','Weekpart','DayPart','Tienda'].forEach(k=>{const el=document.getElementById(`${tab}_${k}`); if(el) el.onchange=()=>renderTab(tab);}); const p=document.getElementById(`${tab}_partners`); if(p) p.onchange=()=>renderTab(tab); const t=document.getElementById('dt_tablet'); if(t) t.onchange=()=>renderTab(tab); }
function renderTab(tab,read=true){
  if(read) readFilters(tab);
  const out=compute(tab), st=PBT.state[tab], root=document.getElementById(tab);
  const visibleStore=st.filters.Tienda[0]||'Todas las tiendas';
  root.innerHTML=buildFilters(tab)+`<div class="print-head"><div><b>Tienda:</b> ${esc(visibleStore)}</div><div><b>WeekPart / DayPart:</b> ${esc(st.filters.Weekpart.join(', ')||'Todos')} / ${esc(st.filters.DayPart.join(', ')||'Todos')}</div><div><b>Partners:</b> ${st.partners}</div></div>`+renderMetrics(tab,out)+renderPlanSheet(tab,out)+renderViewSwitch(tab)+renderRoutines(tab,out)+renderAdminMotor(tab,out);
  document.getElementById(`${tab}_status`).textContent=`Registros: ${out.calc.registros.toLocaleString('es-MX')} | Tiendas visibles: ${out.calc.tiendasVisibles} | D5: ${out.D5} | F16: ${out.F16}`;
  bindFilters(tab);
  setView(tab,st.viewMode||'operativa');
}
function showTab(tab){ PBT.active=tab; $$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); $$('.page').forEach(p=>p.classList.toggle('active',p.id===tab)); renderTab(tab,false); }
window.showTab=showTab;

function toggleAdminMotor(){
  const m=document.querySelector(`#${PBT.active} .admin-motor`);
  if(!m) return;
  m.classList.toggle('admin-visible');
  if(m.classList.contains('admin-visible')) m.open=true;
}
window.toggleAdminMotor=toggleAdminMotor;
document.addEventListener('keydown',e=>{ if(e.ctrlKey&&e.altKey&&String(e.key).toLowerCase()==='m'){ e.preventDefault(); toggleAdminMotor(); }});
function exportPDF(tab){
  readFilters(tab);
  const st=PBT.state[tab];
  const tienda=(st.filters.Tienda[0]||'Todas').replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ_-]+/g,'_');
  const wp=(st.filters.Weekpart[0]||'Todos').replace(/\W+/g,'_');
  const dp=(st.filters.DayPart[0]||'Todos').replace(/\W+/g,'_');
  document.title=`PBT_${tienda}_${wp}_${dp}_${st.partners}Partners`;
  document.body.classList.add('printing-pdf','pdf-onepage');
  setTimeout(()=>{ window.print(); setTimeout(()=>document.body.classList.remove('printing-pdf','pdf-onepage'),800); },80);
}
window.exportPDF=exportPDF;
function boot(){ const ok=window.PBT_ENGINE && (typeof EXCEL_DATA!=='undefined') && window.PBT_LAYOUT_SPECS; if(!ok){ const missing=[]; if(!window.PBT_ENGINE) missing.push('PBT_ENGINE/data_loader'); if(typeof EXCEL_DATA==='undefined') missing.push('EXCEL_DATA/excel_data'); if(!window.PBT_LAYOUT_SPECS) missing.push('PBT_LAYOUT_SPECS/layout_specs'); document.body.innerHTML='<main class="fatal"><h1>PBT Motor Exacto</h1><p>No cargaron los archivos de datos: '+missing.join(', ')+'. Valida js/data_part_01..04.js, js/data_loader.js, js/excel_data.js y js/layout_specs.js.</p></main>'; return; } injectLayoutStyles(); restoreNames(); document.getElementById('cafe').innerHTML=buildFilters('cafe'); document.getElementById('dt').innerHTML=buildFilters('dt'); renderTab('cafe',false); renderTab('dt',false); showTab('cafe'); }
document.addEventListener('DOMContentLoaded',boot);
