const {test}=require('node:test'),assert=require('node:assert/strict');
const H=require('../helper-logic.js'),L=require('../logic.js'),articles=require('../laws.json').articles;
const find=(code,ref)=>articles.find(a=>a.code===code&&a.ref===ref);
const charges=[{id:find('УК','17.1 ч.1').id,stage:'complete',jurisdiction:'R'},{id:find('УК','17.6 ч.1').id,stage:'complete',jurisdiction:'R'}];
test('Команды проверяют срок и юрисдикцию, берут розыск из нормы',()=>{
 assert.equal(H.stars(find('УК','17.6 ч.1')),3);
 assert.match(H.command('su',charges,articles),/^\/su \[ID\] 5 УК 17\.1 ч\.1; УК 17\.6 ч\.1$/);
 assert.match(H.command('arrest',charges,articles,{months:40,subjectId:'524'}),/^\/arrest 524 40 /);
 assert.throws(()=>H.command('arrest',charges,articles,{months:80}));
 assert.throws(()=>H.command('arrest',charges.map(c=>({...c,jurisdiction:'unknown'})),articles,{months:40}));
});
test('УК 17.6 показывает штраф, две статьи показывают сумму и разбивку',()=>{
 const one=L.calculate([charges[1]],articles);assert.equal(one.fines.min,20000);assert.equal(one.fines.max,60000);
 const two=L.calculate([charges[1],{id:find('УК','17.3 ч.1').id}],articles);assert.equal(two.fines.min,40000);assert.equal(two.fines.max,110000);assert.equal(two.fines.groups[0].code,'УК');assert.equal(two.strictest,30);
});
test('Штрафы разных кодексов включены; отсутствие штрафа не становится нулевым штрафом',()=>{
 const ak=articles.find(a=>a.code==='АК'&&!L.retired(a)&&L.penalty(a).fineMax>0);
 const r=L.calculate([charges[1],{id:ak.id},{id:find('ДК','29').id}],articles);
 assert.deepEqual(r.fines.groups.map(g=>g.code),['УК','АК','ДК']);assert.equal(r.fines.max,60000+L.penalty(ak).fineMax+15000);
 assert.equal(L.calculate([charges[0]],articles).fines.count,0);
});
test('Восстановление подборки удаляет неизвестные статьи и дубликаты',()=>{
 const r=H.restoreDesk({charges:[...charges,charges[0],{id:'missing'}],opacity:2,hotkey:'invalid'},articles,{hotkey:'F6'});
 assert.equal(r.charges.length,2);assert.equal(r.opacity,1);assert.equal(r.hotkey,'F6');
});
