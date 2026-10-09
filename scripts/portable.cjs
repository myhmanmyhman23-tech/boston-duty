const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const dist=path.join(root,'release','BostonDuty');
fs.mkdirSync(dist,{recursive:true});
const runtime=process.env.DUTY_ELECTRON_DIST||path.join(root,'node_modules','electron','dist');
const runtimePackage=path.join(runtime,'..','package.json');
const version=fs.existsSync(runtimePackage)?JSON.parse(fs.readFileSync(runtimePackage,'utf8')).version:'bundled';
const infoPath=path.join(dist,'BUILD-INFO.json');
const previous=fs.existsSync(infoPath)?JSON.parse(fs.readFileSync(infoPath,'utf8')):null;
if(previous?.electron!==version||!fs.existsSync(path.join(dist,'BostonDuty.exe'))){
  fs.cpSync(runtime,dist,{recursive:true});
  fs.renameSync(path.join(dist,'electron.exe'),path.join(dist,'BostonDuty.exe'));
}
const app=path.join(dist,'resources','app');fs.mkdirSync(app,{recursive:true});
for(const name of ['package.json','desktop.cjs','preload.cjs','index.html','style.css','app.js','logic.js','helper-logic.js','companion.js','native-features.cjs','laws.js','laws.json','README.md'])fs.copyFileSync(path.join(root,name),path.join(app,name));
fs.mkdirSync(path.join(app,'scripts'),{recursive:true});
fs.copyFileSync(path.join(root,'scripts','start.cjs'),path.join(app,'scripts','start.cjs'));
fs.copyFileSync(path.join(root,'README.md'),path.join(dist,'README.md'));
fs.writeFileSync(infoPath,JSON.stringify({app:'boston-duty',version:JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version,electron:version,builtAt:new Date().toISOString()},null,2));
console.log('Готово: '+path.join(dist,'BostonDuty.exe'));
