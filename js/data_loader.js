/* PBT_SOURCE dividido para GitHub Web. No cargar data.js gigante. */
(function(){
  const joined = (window.__PBT_SOURCE_PARTS || []).join('');
  window.PBT_SOURCE = joined ? JSON.parse(joined) : {options:{},records:[],storeType:{}};
  const src = window.PBT_SOURCE;
  const arr = v => Array.isArray(v) ? v.filter(x=>String(x)!=='') : (v?[String(v)]:[]);
  const hit = (value, selected) => { selected=arr(selected); return !selected.length || selected.map(String).includes(String(value)); };
  const normalizeOrder = o => /drive|dt/i.test(String(o||'')) ? 'DT' : (/pick|delivery|mop/i.test(String(o||'')) ? 'Pick up & Delivery' : 'Lobby');
  const normalizeCat = c => {
    c=String(c||'');
    if(/espresso/i.test(c)) return 'Espresso';
    if(/filtrado|brew/i.test(c)) return 'Café filtrado';
    if(/cbs|cold/i.test(c)) return 'CBS';
    if(/food|alimento/i.test(c)) return 'Food';
    return 'Otro';
  };
  function rebalance(obj, keys){
    let s=keys.reduce((a,k)=>a+(obj[k]||0),0);
    if(s===100 || s===0) return;
    let maxK=keys[0]; keys.forEach(k=>{ if((obj[k]||0)>(obj[maxK]||0)) maxK=k; });
    obj[maxK] += (100-s);
  }
  function calculate(filters, tipo){
    filters=filters||{}; tipo=String(tipo||'').toUpperCase();
    const ventasOrder={Lobby:0,'Pick up & Delivery':0,DT:0};
    const ventasMix={Espresso:0,'Café filtrado':0,CBS:0,Food:0,Otro:0};
    let total=0, registros=0; const tiendas={};
    for(const r of src.records){
      const [mes,semana,weekpart,daypart,tienda,orden,cat,ventaRaw]=r;
      if(tipo && src.storeType[tienda]!==tipo) continue;
      if(!hit(mes, filters.Mes)) continue;
      if(!hit(semana, filters.Semana)) continue;
      if(!hit(weekpart, filters.Weekpart)) continue;
      if(!hit(daypart, filters.DayPart)) continue;
      if(!hit(tienda, filters.Tienda)) continue;
      const venta=Number(ventaRaw)||0;
      ventasOrder[normalizeOrder(orden)] += venta;
      ventasMix[normalizeCat(cat)] += venta;
      total += venta; registros++; tiendas[tienda]=1;
    }
    const pctObj = o => { const out={}; Object.keys(o).forEach(k=>out[k]=total?Math.round(o[k]*100/total):0); return out; };
    const canales=pctObj(ventasOrder), mix=pctObj(ventasMix);
    if(tipo==='CAFE'){
      canales.DT=0;
      const s=(canales.Lobby||0)+(canales['Pick up & Delivery']||0);
      if(s){ canales.Lobby=Math.round((canales.Lobby||0)*100/s); canales['Pick up & Delivery']=100-canales.Lobby; }
    }
    rebalance(canales, tipo==='DT'?['Lobby','Pick up & Delivery','DT']:['Lobby','Pick up & Delivery']);
    rebalance(mix, ['Espresso','Café filtrado','CBS','Food','Otro']);
    return {registros, tiendasVisibles:Object.keys(tiendas).length, venta:total, canales, mix};
  }
  function list(name){ return (src.options && src.options[name]) ? src.options[name] : []; }
  window.PBT_ENGINE = {source:src, calculate, list};
})();
