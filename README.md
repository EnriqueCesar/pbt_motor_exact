# pbt_data_filtros · PBT Motor Exacto

Versión reconstruida desde cero para GitHub Pages con motor lógico fiel al PBT.24.

## Incluye
- Pestañas: CAFE y DRIVE THRU.
- Sin EQUIPO, sin fotos y sin reloj operativo.
- Filtros dinámicos: Mes, WeekPart, Day Part y Tienda.
- Motor de celdas con equivalencias PBT.24: D3, D4, D5, F16, I16, J16 y Partner Tablet en DT.
- Datos de canales y mix de producto desde Enero, Febrero y Abril.
- Coordenadas y rutinas desde `excel_data.js`.
- Regla de color única:
  - `Fijo = Sí` → posición fija en verde.
  - `Fijo = No` → posición flexible en blanco.
- Tabla inferior y layout visual leen la misma regla de rutinas.
- Exportación PDF por impresión del navegador con título dinámico: `PBT_Tienda_WeekPart_DayPart_#Partners`.

## Subida a GitHub
Subir por partes si GitHub Web marca límite:
1. Raíz: `index.html`, `README.md`, `manifest.json`, `sw.js`, `css/`, `icons/`.
2. Carpeta `/js`: `app.js` y `data_loader.js`.
3. Un commit por archivo grande:
   - `excel_data.js`
   - `data_part_01.js`
   - `data_part_02.js`
   - `data_part_03.js`
   - `data_part_04.js`

No subir `data.js`.


## Fase 7
- KPI arriba del layout.
- Vista Operativa / Ejecutiva.
- Rutinas colapsables.
- PDF vertical A4 con colores preservados.
- Layout centrado con mayor margen visual.
