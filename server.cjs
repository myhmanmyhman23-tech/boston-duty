const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const port = Number(process.env.DUTY_PORT || 4317);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
http.createServer(async (req,res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (url.pathname === '/import' && req.method === 'GET') {
    res.writeHead(200, {'Content-Type':types['.html']});
    return res.end('<!doctype html><meta charset="utf-8"><title>Импорт Boston</title><h1>Импорт базы Boston</h1><textarea aria-label="База законов" id="data" style="width:90%;height:300px"></textarea><button id="save">Сохранить базу</button><p id="result"></p><script>save.onclick=async()=>{try{const r=await fetch("/api/import",{method:"POST",headers:{"Content-Type":"application/json"},body:data.value});result.textContent=await r.text()}catch(e){result.textContent=e.message}}</script>');
  }
  if (url.pathname === '/api/import' && req.method === 'POST') {
    if (req.headers.origin !== `http://127.0.0.1:${port}`) {res.writeHead(403);return res.end('Forbidden');}
    try {
      let raw=''; for await (const chunk of req) {raw+=chunk; if(raw.length>2000000) throw Error('Слишком большой файл');}
      const data=JSON.parse(raw);
      if(!Array.isArray(data.articles) || data.articles.length!==774 || data.articles.some(a=>!a.code||!a.ref||!a.title||!a.text)) throw Error('Некорректная база');
      fs.writeFileSync(path.join(root,'laws.json'),JSON.stringify(data,null,2));
      fs.writeFileSync(path.join(root,'laws.js'),'window.LAW_DATABASE = '+JSON.stringify(data)+';\n');
      res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'}); return res.end(`Сохранено ${data.articles.length} записей Boston`);
    } catch(e) {res.writeHead(400,{'Content-Type':'text/plain; charset=utf-8'});return res.end(e.message);}
  }
  if(req.method!=='GET'){res.writeHead(405);return res.end();}
  const allowed = new Set(['index.html','app.js','style.css','logic.js','helper-logic.js','companion.js','laws.js','laws.json']);
  const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(!allowed.has(file)){res.writeHead(404);return res.end('Not found');}
  try {res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store'});res.end(fs.readFileSync(path.join(root,file)));}
  catch {res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Дежурный: http://127.0.0.1:${port}`));
