'use strict';
// Static deployment verification only. No native page or downloaded code runs.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function verify(output){const report=JSON.parse(fs.readFileSync(path.join(output,'pages-build.json'))),failures=[];let links=0,checkedScripts=0;
 function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);}
 for(const file of walk(output)){const p=path.relative(output,file).replaceAll('\\','/');if(/^hosts\/runtime\/.+\.m?js$/i.test(p)){assert.equal(sha(fs.readFileSync(file)),sha(fs.readFileSync(path.join(root,p))),p);checkedScripts++;}
  if(!/^hosts\/(?!runtime\/).+\.html$/i.test(p))continue;const html=fs.readFileSync(file,'utf8');for(const m of html.matchAll(/\b(?:href|src|poster)=["']([^"']+)["']/g)){const value=m[1].replaceAll('&amp;','&');if(!value||/^(?:[a-z]+:|\/\/|#)/i.test(value))continue;const url=new URL(value,'https://speedy-away.github.io/WWB-HOST/'+p);links++;if(!url.pathname.startsWith('/WWB-HOST/')){failures.push(p+' unprefixed '+value);continue;}let target=path.join(output,decodeURIComponent(url.pathname.slice('/WWB-HOST/'.length)));if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');if(!fs.existsSync(target))failures.push(p+' missing '+value);}
 }
 const vm=require('node:vm'),module={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(output,'assets/host-dashboard.js'),'utf8'),{module,exports:module.exports,URL,console,setTimeout,clearTimeout});
 assert.equal(module.exports.loadCapability({runtimeId:'fixture',launchURL:'/WWB-HOST/hosts/runtime/fixture/',category:'mods',format:'BIN'}).kind,'browser','Project-prefix native Load must stay enabled through its console guard');
 assert.ok(report.bytes<1e9);assert.equal(failures.length,0,failures.slice(0,15).join('\n'));const result={status:'passed',bytes:report.bytes,pagesLinks:links,nativeScriptsUnchanged:checkedScripts,offloadedFiles:report.offloadedFiles,issues:0};console.log(JSON.stringify(result));return result;}
if(require.main===module)verify(path.resolve(process.argv[2]));module.exports={verify};
