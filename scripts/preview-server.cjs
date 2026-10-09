// Development-only screenshot export via a local form.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'..','previews');fs.mkdirSync(out,{recursive:true});
http.createServer(async(req,res)=>{
  if(req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end('<!doctype html><meta charset="utf-8"><title>Сохранение превью</title><h1>Превью приложения</h1><label>Название<select id="name"><option>overview</option><option>counsel</option><option>compact</option></select></label><textarea aria-label="Изображение" id="data"></textarea><button id="save">Сохранить превью</button><p id="result"></p><script>save.onclick=async()=>{const r=await fetch("/save",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:document.getElementById("name").value,image:data.value})});result.textContent=await r.text()}</script>');}
  if(req.method==='POST'&&req.url==='/save'&&req.headers.origin==='http://127.0.0.1:4318'){
    try{let body='';for await(const c of req){body+=c;if(body.length>3000000)throw Error('Too large');}const d=JSON.parse(body);if(!['overview','counsel','compact'].includes(d.name))throw Error('Bad name');const b=Buffer.from(d.image,'base64');if(b[0]!==255||b[1]!==216)throw Error('Not JPEG');fs.writeFileSync(path.join(out,d.name+'.jpg'),b);return res.end('Превью сохранено: '+d.name);}catch(e){res.writeHead(400);return res.end(e.message);}
  }res.writeHead(403);res.end();
}).listen(4318,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:4318'));
