(function(root, factory) {
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  else root.DutyLogic = api;
})(typeof window === 'undefined' ? globalThis : window, function() {
  const normalize = s => String(s || '').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9.]+/g,' ').trim();
  const retired = a => /утратила силу|упразднена|утратил силу/i.test(a.title);
  const aliases = {
    'угон':['завладение','транспорт'], 'погоня':['неповиновение','транспорт'],
    'оружие':['оруж','боеприпас'], 'наркотики':['наркот','наркотичес'],
    'адвокат':['адвокат','конфиденциаль'], 'оскорбление':['оскорб','представителя'],
    'маска':['скрывающ','личности'], 'документы':['документ','личности'],
    'права':['миранды','задерживаемого'], 'скорость':['скорост','лимит'],
    'обыск':['обыск','досмотр'], 'прокурор':['прокурор','прокуратур'],
    'побег':['побег','неповиновение'], 'штраф':['штраф','санкций']
  };
  function search(articles, query, filter={}) {
    const q=normalize(query); const tokens=q.split(/\s+/).filter(t=>!['ст','статья','статьи','ч','часть','ук','ак','дк','пк'].includes(t));
    const codeInQuery = String(query).toUpperCase().match(/(?:^|\s)(УК|АК|ДК|ПК)(?:\s|$)/)?.[1];
    return articles.filter(a=>(!filter.code||filter.code==='Все'||a.code===filter.code)&&(!codeInQuery||a.code===codeInQuery)&&(!filter.favorites||filter.favorites.includes(a.id))&&(!filter.sanction||a.sanction)&&(!retired(a)||filter.retired)).map(a=>{
      if(!q)return {a,score:1};
      const ref=normalize(a.ref),title=normalize(a.title),body=normalize(a.text);
      let score=0;
      for(const t of tokens) {
        if(/^\d/.test(t)) {if(ref.split(' ')[0]===t)score+=100;else if(ref.startsWith(t+'.'))score+=30;else if(body.includes(t))score+=1;}
        else {const stem=t.length>5?t.slice(0,-2):t;
          if(title.includes(t)||title.includes(stem))score+=20;
          if(body.includes(t)||body.includes(stem))score+=4;
          for(const term of aliases[t]||[]) {if(title.includes(term))score+=9;else if(body.includes(term))score+=2;}
        }
      }
      if(ref===normalize(query))score+=200;
      return {a,score};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).map(x=>x.a);
  }
  function penalty(a) {
    const s = (a.sanction || '').replace(/([\d][\d.,]*(?:\s\d{3})*)\s*\$/g,(_,amount)=>'$'+amount.replace(/\s/g,'')).replace(/от\s+([\d.,]+)\s+до\s*\$/gi,'от $$$1 до $');
    const months = s.match(/(?:до\s+)?(\d+(?:[.,]\d+)?)\s*месяц/i);
    const range = s.match(/от\s*\$\s*([\d.,]+)\s*до\s*\$\s*([\d.,]+)/i);
    const fine = s.match(/штраф[^$]*\$\s*([\d.,]+)/i);
    const money=n=>Number(n.replace(/[.,]/g,''));
    return {maxMonths:months?Number(months[1].replace(',','.')):null,fineMin:range?money(range[1]):fine?(/до\s*\$/i.test(s)?0:money(fine[1])):null,fineMax:range?money(range[2]):fine?money(fine[1]):null,retired:retired(a)};
  }
  function calculate(charges, articles, options={}) {
    const rows=charges.map(c=>{const a=articles.find(a=>a.id===c.id); if(!a)return null;
      const p=penalty(a); const factor=c.stage==='preparation'?.5:c.stage==='attempt'?.75:1;
      return {...p,code:a.code,ref:a.ref,id:a.id,maxMonths:p.maxMonths==null?null:p.maxMonths*factor,sanction:a.sanction,stage:c.stage||'complete',jurisdiction:c.jurisdiction||'unknown'};
    }).filter(Boolean);
    const uk=rows.filter(r=>r.code==='УК'&&!r.retired&&r.maxMonths!=null);
    const strictest=uk.reduce((max,r)=>Math.max(max,r.maxMonths),0);
    const exceptional=!!options.insultDuringProcedure;
    const insult=exceptional?uk.find(r=>r.ref.split(' ')[0]==='17.3'):null;
    const others=uk.filter(r=>r!==insult);
    const exceptionalCeiling=insult&&others.length?Math.max(...others.map(r=>r.maxMonths))+insult.maxMonths:null;
    const administrative=rows.filter(r=>r.code==='АК'&&!r.retired&&r.fineMax!=null);
    const fineRows=rows.filter(r=>!r.retired&&r.fineMax!=null);
    const fines={count:fineRows.length,min:fineRows.reduce((s,r)=>s+r.fineMin,0),max:fineRows.reduce((s,r)=>s+r.fineMax,0),unparsed:rows.filter(r=>!r.retired&&/штраф/i.test(r.sanction)&&r.fineMax==null),groups:['УК','АК','ДК'].map(code=>{const list=fineRows.filter(r=>r.code===code);return {code,count:list.length,min:list.reduce((s,r)=>s+r.fineMin,0),max:list.reduce((s,r)=>s+r.fineMax,0),rows:list};}).filter(g=>g.count)};
    return {rows,strictest,exceptionalCeiling,fines,administrativeMax:administrative.reduce((s,r)=>s+r.fineMax,0),administrativeMin:administrative.reduce((s,r)=>s+r.fineMin,0),unknownJurisdiction:rows.filter(r=>r.code==='УК'&&r.jurisdiction==='unknown'),outsideJurisdiction:rows.filter(r=>r.code==='УК'&&['F','M','E'].includes(r.jurisdiction))};
  }
  function elapsed(timer, now=Date.now()) {
    if(!timer.startedAt)return 0;
    const end=Math.min(now,timer.stoppedAt||now);
    const pauses=(timer.pauses||[]).map(p=>[Math.max(timer.startedAt,p.start),Math.min(end,p.end||end,p.capMs?p.start+p.capMs:Infinity)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
    let paused=0,last=-Infinity;
    for(const [a,b] of pauses){paused+=Math.max(0,b-Math.max(a,last));last=Math.max(last,b);}
    return Math.max(0,end-timer.startedAt-paused);
  }
  function formatTime(ms) {const s=Math.floor(Math.abs(ms)/1000);return (ms<0?'−':'')+[Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,'0')).join(':');}
  function makeCase(id, now=Date.now()) {return {id,createdAt:now,status:'active',name:'',passport:'',location:'',facts:'',basis:'',warrant:'',subject:'civilian',mode:'investigation',charges:[],evidence:[],steps:{},timeline:[],timer:{startedAt:null,stoppedAt:null,pauses:[]},reminders:[],counselNotes:'',decision:'',insultDuringProcedure:false};}
  function validateBackup(data) {
    if(data?.version!==1||!Array.isArray(data.cases)||data.cases.length>1000)throw Error('Это не резервная копия Дежурного');
    const validId = value => typeof value==='string' && /^[a-zа-я0-9_-]{1,100}$/i.test(value);
    if(data.profile && ['name','badge','callsign','rank'].some(k=>typeof data.profile[k]!=='string'))throw Error('Некорректный профиль');
    if(data.favorites && (!Array.isArray(data.favorites)||data.favorites.some(x=>!validId(x))))throw Error('Некорректное избранное');
    if(data.settings && ['sound','compact','top'].some(k=>typeof data.settings[k]!=='boolean'))throw Error('Некорректные настройки');
    const ids=new Set();
    for(const c of data.cases) {
      if(!validId(c.id)||ids.has(c.id)||!['active','closed'].includes(c.status)||!Array.isArray(c.charges)||!Array.isArray(c.evidence)||!Array.isArray(c.timeline)||!Array.isArray(c.reminders)||!c.timer||!Array.isArray(c.timer.pauses)||!c.steps||!['civilian','government'].includes(c.subject)||!['investigation','warrant'].includes(c.mode))throw Error('Повреждённая карточка дела');
      ids.add(c.id);
      if(!Number.isFinite(c.createdAt)||typeof c.steps!=='object'||Array.isArray(c.steps)||Object.values(c.steps).some(v=>!Number.isFinite(v)))throw Error('Некорректная хронология шагов');
      for(const k of ['startedAt','stoppedAt']) if(c.timer[k]!=null&&(!Number.isFinite(c.timer[k])||c.timer[k]<0))throw Error('Некорректное время');
      if(c.timer.pauses.some(p=>!Number.isFinite(p.start)||p.start<0||(p.end!=null&&!Number.isFinite(p.end))||(p.capMs!=null&&(!Number.isFinite(p.capMs)||p.capMs<0))))throw Error('Некорректная пауза');
      for(const k of ['name','passport','location','facts','basis','warrant','counselNotes','decision'])if(typeof c[k]!=='string')throw Error('Некорректные поля дела');
      if(c.charges.some(x=>typeof x.id!=='string')||c.evidence.some(x=>typeof x.id!=='string'||typeof x.title!=='string'||typeof x.url!=='string'||typeof x.timecode!=='string'||typeof x.note!=='string')||c.timeline.some(x=>typeof x.text!=='string'||!Number.isFinite(x.at)))throw Error('Некорректные материалы');
      if(c.charges.some(x=>!validId(x.id))||c.evidence.some(x=>!validId(x.id))||c.reminders.some(r=>!validId(r.id)||typeof r.title!=='string'||!Number.isFinite(r.deadline)||!Number.isFinite(r.startedAt)))throw Error('Некорректные идентификаторы или напоминания');
      if(c.charges.some(x=>!['complete','attempt','preparation'].includes(x.stage)||!['unknown','R','F/R','F','M','E'].includes(x.jurisdiction)))throw Error('Некорректные параметры статьи');
    }
    return data;
  }
  return {normalize,retired,search,penalty,calculate,elapsed,formatTime,makeCase,validateBackup};
});
