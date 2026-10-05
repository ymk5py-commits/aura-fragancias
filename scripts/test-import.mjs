import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTs, sales, erp } from './test-erp.mjs';
const imp = loadTs('../src/lib/erpImport.ts', { './sales': sales, './erp': erp });
const headers = ['Fecha','COD','Fragancia','CLIENTE','ML','Cantidad','PV','Total Cobrado','Delivery Cobrado','Delivery Real','Dif Delivery','Costo UN','Total Costo','Ganacia Neta'];
const snapshot = rows => ({ version:1, spreadsheetId:'spreadsheet_aura', title:'AURA CAJA', readAt:'2026-10-04', sheets:[{title:'V.OCT',sheetId:1,rows:[headers,...rows]}] });
const options = {month:'all',monthlyExpenseDates:false,correctInternet:false};
const row = [46296,'UU48','Erba Gold','Cliente',30,2,50000,100000,12000,10900,-1100,17398,34796,66304];
test('imports historical prices and costs, normalizes code and uses actual delivery margin', () => {
  const [r] = imp.prepareImport(snapshot([row]),options,[{id:'UU048',name:'ERBA GOLD'}]);
  assert.equal(r.errors.length,0); assert.equal(r.record.items[0].unitCost,17398);
  assert.equal(r.record.items[0].code,'UU048'); assert.equal(r.record.date,'2026-10-01');
  assert.equal(sales.saleTotals(r.record).revenue,100000); assert.equal(sales.saleTotals(r.record).profit,66304);
  assert.equal(r.record.collected,112000);
});
test('skips empty formula rows and totals, but retains duplicate-looking genuine rows', () => {
  const rs = imp.prepareImport(snapshot([row,row,[null,null,null,null,30,null,null,0,null,null,0,17398,0,0],['Totales',null,null,null,null,4,null,200000]]),options,[]);
  assert.equal(rs.length,2); assert.notEqual(rs[0].key,rs[1].key);
});
test('origin identity does not change when a price, date or code is corrected', () => {
  const first = imp.prepareImport(snapshot([row]),options,[])[0];
  const revised = [...row]; revised[1]='CC034'; revised[6]=60000; revised[7]=120000;
  assert.equal(imp.prepareImport(snapshot([revised]),options,[])[0].key,first.key);
});
test('does not guess dates or round ambiguous decimal expenses; opt-in corrections are explicit', () => {
  const data={...snapshot([]),sheets:[{title:'G.OCT',sheetId:2,rows:[[],['FECHA','CATEGORÍA','DETALLE','MONTO (Gs)'],[null,'CEL/INTERNET','COMUNICACION',214.914],[46204,null,'SET',324000]]}]};
  assert.ok(imp.prepareImport(data,options,[]).every(r=>r.errors.length));
  const rs=imp.prepareImport(data,{...options,monthlyExpenseDates:true,correctInternet:true},[]);
  assert.equal(rs[0].record.amount,214914); assert.equal(rs[0].record.date,'2026-10-01');
  assert.ok(rs[0].record.notes.includes('214.914')); assert.equal(rs[1].record.date,'2026-10-01');
});
test('separates expense blocks and ignores formula totals without descriptions', () => {
  const data={...snapshot([]),sheets:[{title:'G.OCT',sheetId:2,rows:[[],['FECHA','CATEGORÍA','DETALLE','MONTO (Gs)'],[46296,'Publicidad','Meta',10000,null,46296,'Insumos','Botellas',50000,null,46296,'Socio','Retiro',20000],[null,null,null,10000,null,null,null,null,50000]]}]};
  const rs=imp.prepareImport(data,options,[]);
  assert.equal(rs.length,3); assert.equal(rs[1].record.type,'Mercadería'); assert.equal(rs[2].record.type,'Retiro');
});
test('blocks bad dates, missing sizes and totals greater than the sale price', () => {
  for(const [index,value] of [[0,null],[4,20],[7,120000],[7,null]]) {const r=[...row];r[index]=value;assert.ok(imp.prepareImport(snapshot([r]),options,[])[0].errors.length);}
});
test('missing historic cost stays unknown and missing names can be resolved from catalog', () => {
  const r=[...row];r[2]=null;r[11]='';
  const result=imp.prepareImport(snapshot([r]),options,[{id:'UU048',name:'ERBA GOLD'}])[0];
  assert.equal(result.record.items[0].unitCost,null); assert.equal(sales.saleTotals(result.record).profit,null);
});
test('filters the chosen accounting month without changing historical dates', () => {
  const r=[...row];r[0]=46295;
  assert.equal(imp.prepareImport(snapshot([row,r]),{...options,month:'2026-10'},[]).length,1);
});
test('rejects malformed snapshots and unknown column layouts', () => {
  for(const data of [null,{}, {...snapshot([]),sheets:[...snapshot([]).sheets,...snapshot([]).sheets]}]) assert.throws(()=>imp.parseSnapshot(JSON.stringify(data)));
  assert.throws(()=>imp.prepareImport({...snapshot([]),sheets:[{title:'V.OCT',sheetId:1,rows:[['invalid']]}]},options,[]));
});
