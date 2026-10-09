(function(root,factory){const api=factory(typeof module==='object'?require('./logic.js'):root.DutyLogic);if(typeof module==='object')module.exports=api;else root.DutyHelper=api;})(typeof window==='undefined'?globalThis:window,function(L){
  const stars=a=>Number(a.text.match(/Зв[её]зды розыска:\s*([1-5])/i)?.[1])||null;
  function selection(ids,articles){return [...new Set(ids)].map(id=>articles.find(a=>a.id===id&&!L.retired(a))).filter(Boolean);}
  function validateResult(raw,articles){
    if(!raw||typeof raw!=='object'||typeof raw.summary!=='string'||!Array.isArray(raw.articles)||!Array.isArray(raw.checks)||typeof raw.speech!=='string'||!Array.isArray(raw.missing))throw Error('ИИ вернул неполный ответ. Повтори запрос; статьи не подставлены автоматически.');
    const rejected=[],found=[],seen=new Set();
    for(const item of raw.articles.slice(0,80)){const a=articles.find(a=>a.id===item?.id&&!L.retired(a));if(!a){rejected.push(String(item?.id||'неизвестная статья'));continue;}if(!seen.has(a.id)){seen.add(a.id);found.push({id:a.id,reason:String(item.reason||'').slice(0,2000)});}}
    return {summary:raw.summary.slice(0,12000),articles:found,checks:raw.checks.filter(s=>typeof s==='string').slice(0,30),speech:raw.speech.slice(0,12000),missing:raw.missing.filter(s=>typeof s==='string').slice(0,30),transcript:typeof raw.transcript==='string'?raw.transcript.slice(0,20000):'',rejected};
  }
  function command(kind,charges,articles,options={}){
    const chosen=selection(charges.map(c=>c.id),articles);if(!chosen.length)throw Error('Сначала выбери статьи.');
    if(chosen.some(a=>a.code!=='УК'))throw Error('Команда доступна для подборки УК. Другие нормы скопируй списком.');
    const id=String(options.subjectId||'').trim();if(id&&!/^\d{1,8}$/.test(id))throw Error('ID должен содержать только цифры.');
    const refs=chosen.map(a=>`${a.code} ${a.ref}`).join('; ');
    if(kind==='su'){const levels=chosen.map(stars);if(levels.some(s=>s===null))throw Error('В источнике одной из статей нет звёзд розыска.');return `/su ${id||'[ID]'} ${Math.max(...levels)} ${refs}`;}
    const months=Number(options.months),calc=L.calculate(charges,articles,options),ceiling=calc.exceptionalCeiling??calc.strictest;
    if(!Number.isInteger(months)||months<=0||months>ceiling)throw Error('Укажи целое число месяцев в пределах выбранных санкций.');
    if(calc.rows.some(r=>r.code==='УК'&&(r.maxMonths===null||r.jurisdiction==='unknown'||['F','M','E'].includes(r.jurisdiction))))throw Error('Для команды ареста проверь санкции и полномочия LSCSD по всем статьям.');
    return `/arrest ${id||'[ID]'} ${months} ${refs}`;
  }
  function restoreDesk(raw,articles,defaults){const value=raw&&typeof raw==='object'?raw:{},out={...defaults,charges:[],results:[],procedureSteps:{},timer:{startedAt:null,stoppedAt:null,pauses:[]}};
    for(const name of ['situation','subjectId','months'])if(typeof value[name]==='string')out[name]=value[name].slice(0,name==='situation'?20000:40);
    for(const name of ['insultDuringProcedure','sideOpen','tts'])if(typeof value[name]==='boolean')out[name]=value[name];
    for(const [name,allowed] of Object.entries({sideTab:['favorites','selection','miranda','procedure'],source:['mic','system','both'],procedureMode:['investigation','warrant'],hotkey:['','F6','Control+Shift+D','Control+Shift+Space']}))if(allowed.includes(value[name]))out[name]=value[name];
    if(Number.isFinite(value.opacity))out.opacity=Math.max(.55,Math.min(1,value.opacity));
    const seen=new Set();for(const c of Array.isArray(value.charges)?value.charges.slice(0,80):[]){if(!c||seen.has(c.id)||!articles.some(a=>a.id===c.id&&!L.retired(a)))continue;seen.add(c.id);out.charges.push({id:c.id,stage:['complete','attempt','preparation'].includes(c.stage)?c.stage:'complete',jurisdiction:['unknown','R','F/R','F','M','E'].includes(c.jurisdiction)?c.jurisdiction:'unknown'});}
    for(const r of Array.isArray(value.results)?value.results.slice(0,10):[])try{out.results.push({...validateResult(r,articles),mode:['situation','lawyer','transcribe'].includes(r.mode)?r.mode:'situation',model:String(r.model||''),at:Number.isFinite(r.at)?r.at:Date.now()});}catch{}
    if(value.procedureSteps&&typeof value.procedureSteps==='object')for(const [id,time] of Object.entries(value.procedureSteps))if(/^[a-z]{1,30}$/.test(id)&&Number.isFinite(time)&&time>0)out.procedureSteps[id]=time;
    const timer=value.timer;if(timer&&Number.isFinite(timer.startedAt)&&timer.startedAt>0){out.timer.startedAt=timer.startedAt;out.timer.stoppedAt=Number.isFinite(timer.stoppedAt)?Math.max(timer.startedAt,timer.stoppedAt):null;out.timer.pauses=(Array.isArray(timer.pauses)?timer.pauses:[]).filter(p=>p&&Number.isFinite(p.start)&&p.start>=timer.startedAt&&(p.end==null||Number.isFinite(p.end))&&(p.capMs==null||(Number.isFinite(p.capMs)&&p.capMs>0))).slice(0,200).map(p=>({start:p.start,end:p.end??null,capMs:p.capMs??null,reason:String(p.reason||'').slice(0,200),ref:String(p.ref||'').slice(0,50)}));}
    return out;
  }
  return {stars,selection,validateResult,command,restoreDesk};
});
