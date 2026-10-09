const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
let executable,args;
try{executable=require('electron');args=[root];}catch{
  executable=path.join(root,'release','BostonDuty','BostonDuty.exe');args=[];
  if(!fs.existsSync(executable)){console.error('Установи Electron: node node_modules/electron/install.js');process.exit(1);}
}
const child=spawn(executable,args,{cwd:root,stdio:'inherit'});
child.on('error',e=>{console.error(e.message);process.exit(1)});
child.on('exit',code=>process.exit(code||0));
