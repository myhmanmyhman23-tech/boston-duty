const {test}=require('node:test');
const assert=require('node:assert/strict');
const L=require('../logic.js');
const db=require('../laws.json'),all=db.articles;
const find=(code,ref)=>all.find(a=>a.code===code&&a.ref===ref);
const charge=(ref,stage='complete')=>({id:find('УК',ref).id,stage,jurisdiction:'unknown'});
test('Полный снимок Boston: 774 записи, 305 санкций, уникальные идентификаторы',()=>{
  assert.equal(all.length,774);assert.equal(all.filter(a=>a.sanction).length,305);
  assert.equal(new Set(all.map(a=>a.id)).size,774);
  for(const a of all){assert.ok(a.text&&a.title&&a.ref);assert.ok(a.source.startsWith('https://forum.majestic-rp.ru/'));assert.ok(!a.text.includes('\uFFFD'));}
  assert.deepEqual(all.reduce((s,a)=>(s[a.code]=(s[a.code]||0)+1,s),{}),{'УК':301,'АК':79,'ДК':72,'ПК':322});
});
test('Поиск по номеру выбирает нужную статью, а по ситуации находит связанные нормы',()=>{
  assert.equal(L.search(all,'УК 17.6')[0].ref,'17.6 ч.1');
  assert.ok(L.search(all,'угон').some(a=>/завладение/i.test(a.title)));
  assert.ok(L.search(all,'адвокат',{code:'ПК'}).every(a=>a.code==='ПК'));
  assert.ok(L.search(all,'',{favorites:[find('УК','17.6 ч.1').id]}).length===1);
  assert.ok(L.search(all,'').every(a=>!L.retired(a)));
});
test('Чтение санкций: месяцы, диапазон штрафа и верхний предел ДК',()=>{
  const p=L.penalty(find('УК','17.6 ч.1'));assert.equal(p.maxMonths,30);assert.equal(p.fineMin,20000);assert.equal(p.fineMax,60000);
  const d=L.penalty(find('ДК','29'));assert.equal(d.fineMax,15000);assert.equal(d.fineMin,0);assert.equal(d.maxMonths,null);
});
test('Совокупность УК не складывается автоматически; исключение 17.3 выделено отдельно',()=>{
  const charges=[charge('17.1 ч.1'),charge('17.6 ч.1'),charge('17.3 ч.1')];
  const normal=L.calculate(charges,all);assert.equal(normal.strictest,50);assert.equal(normal.exceptionalCeiling,null);
  const special=L.calculate(charges,all,{insultDuringProcedure:true});assert.equal(special.strictest,50);assert.equal(special.exceptionalCeiling,70);
  assert.equal(special.unknownJurisdiction.length,3);
});
test('Стадии приготовления и покушения уменьшают верхний предел, федеральная юрисдикция отмечается',()=>{
  assert.equal(L.calculate([charge('17.1 ч.1','preparation')],all).strictest,25);
  assert.equal(L.calculate([charge('17.1 ч.1','attempt')],all).strictest,37.5);
  assert.equal(L.calculate([{...charge('17.1 ч.1'),jurisdiction:'F'}],all).outsideJurisdiction.length,1);
});
test('Таймер учитывает перезапуск, ограниченную паузу, перекрытие и завершение',()=>{
  const t={startedAt:1000,pauses:[{start:11000,end:null,capMs:10000}]};
  assert.equal(L.elapsed(t,16000),10000);assert.equal(L.elapsed(t,31000),20000);
  assert.equal(L.elapsed(JSON.parse(JSON.stringify(t)),31000),20000);
  t.pauses.push({start:16000,end:26000});assert.equal(L.elapsed(t,31000),15000);
  t.stoppedAt=31000;assert.equal(L.elapsed(t,91000),15000);
  assert.equal(L.formatTime(3600000),'01:00:00');
});
test('Паузы до фактического начала не вычитают чужое время; незапущенный таймер нулевой',()=>{
  assert.equal(L.elapsed({startedAt:20000,pauses:[{start:1000,end:10000}]},30000),10000);
  assert.equal(L.elapsed({startedAt:null,pauses:[]}),0);
});
test('Копии данных проходят проверку; повреждённые и опасные идентификаторы отклоняются',()=>{
  const c=L.makeCase('BOS-TEST',1000);const b={version:1,cases:[c]};assert.equal(L.validateBackup(b),b);
  assert.throws(()=>L.validateBackup({version:1,cases:[{...c,id:'x" onclick="alert(1)'}]}));
  assert.throws(()=>L.validateBackup({version:1,cases:[{...c,timer:{startedAt:'abc',pauses:[]}}]}));
  assert.throws(()=>L.validateBackup({version:1,cases:[c,c]}));
});
