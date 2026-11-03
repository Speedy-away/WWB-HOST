'use strict';
// Build the independent project-site deployment without altering archived files.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),BASE='/WWB-HOST',ORIGIN='https://speedy-away.github.io',MAIN='https://whatwhatboy.com',LIMIT=880*1024*1024;
const slash=p=>p.replaceAll('\\','/'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name.startsWith('.')?[]:e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
function build(output,revision='main',root=ROOT){
 assert.ok(output&&!fs.existsSync(output),'Use a fresh build directory');assert.match(revision,/^(?:main|[a-f0-9]{40})$/);const karo=JSON.parse(fs.readFileSync(path.join(root,'docs/host-reviews/karo/build.json'))),activeKaro=karo.runtime.replace(/^\//,'').replace(/web\/$/,''),all=walk(root).map(f=>slash(path.relative(root,f))).filter(p=>!/^tmp\/|^scripts\/|^i18n-tools\//.test(p));
 const selected=all.filter(p=>!/^docs\/(?:qa|screenshots|host-reviews\/.*(?:retained|full-tests|.*log))/i.test(p)&&!/^AGENTS\.md$|^README\.md$|^SYNC|^sync\./i.test(p)&&(!/^hosts\/runtime\/karo-/.test(p)||p.startsWith(activeKaro))&&!/^hosts\/runtime\/.*\/upstream\//.test(p));
 const excluded=new Set(all.filter(p=>!selected.includes(p))),mapping={};let files=selected.map(name=>({name,bytes:fs.statSync(path.join(root,name)).size}));let bytes=files.reduce((n,f)=>n+f.bytes,0);
 const raw=p=>'https://raw.githubusercontent.com/Speedy-away/WWB-HOST/'+revision+'/'+p.split('/').map(encodeURIComponent).join('/');
 const candidates=files.filter(f=>/^downloads\//.test(f.name)&&!(/\.(?:html|json|js|css|txt|md|ini|xml)$/i.test(f.name))||/^hosts\/runtime\/.*\/(?:_decoded|_unavailable)\//.test(f.name)||/^hosts\/runtime\/.*\.(?:bin|elf|bz2|zip)$/i.test(f.name)).sort((a,b)=>b.bytes-a.bytes);
 for(const f of candidates){if(bytes<LIMIT&& !/^downloads\/.+\.zip$/.test(f.name))continue;mapping['/'+f.name]=raw(f.name);bytes-=f.bytes;}
 assert.ok(bytes<LIMIT,'Active runtime deployment exceeds Pages budget');
 const hosted=new Set(files.filter(f=>!mapping['/'+f.name]).map(f=>f.name));function target(p){p=p.replace(/^\//,'');if(p===''||p==='index.html')return MAIN+'/';if(mapping['/'+p])return mapping['/'+p];if(hosted.has(p)||hosted.has(p.replace(/\/$/,'')+'/index.html')||['assets/','languages/','hosts/','downloads/'].includes(p))return BASE+'/'+p;return MAIN+'/'+p;}
 const internalRoots=['hosts','assets','languages','downloads','console','docs'];
 function rewrite(text,name){
  if(name==='assets/host-dashboard.js')text=text.replaceAll('^\\/hosts\\/runtime\\/','^\\/(?:WWB-HOST\\/)?hosts\\/runtime\\/');
  // Prefix authored root-relative strings, including concatenated directory roots.
  text=text.replace(/https:\/\/whatwhatboy\.com\/(hosts\/[^\s"'<>\\]*)/g,(_,p)=>ORIGIN+target(p));
  text=text.replace(/(["'`=\s(])\/(hosts|assets|languages|downloads|console|docs)\/([^\s"'`<>)]*)/g,(whole,lead,dir,rest)=>{const p=dir+'/'+rest;if((!rest&&name.endsWith('.js'))||/^\$\{|\+/.test(rest))return lead+BASE+'/'+p;return lead+target(p);});
  text=text.replace(/((?:href|action)\s*=\s*["'])\/(["'])/g,'$1'+MAIN+'/$2');
  text=text.replace(/((?:href|src|action|poster)\s*=\s*["'])\/([^"']*)(["'])/gi,(whole,start,p,end)=>p.startsWith('WWB-HOST/')?whole:start+target(p)+end);
  if(name.endsWith('.html'))text=text.replace(/<!-- BEGIN SITE AD -->[\s\S]*?<!-- END SITE AD -->/g,'').replace(/<script\b[^>]*src=["'][^"']*site-ads\.js[^"']*["'][^>]*><\/script>/g,'');
  if(name.endsWith('.html'))text=text.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/i,'<link rel="canonical" href="'+ORIGIN+BASE+'/'+name.replace(/index\.html$/,'')+'">');
  return text;
 }
 fs.mkdirSync(output,{recursive:true});let nativeFiles=0;
 for(const f of files){if(mapping['/'+f.name])continue;const source=path.join(root,f.name),destination=path.join(output,f.name);fs.mkdirSync(path.dirname(destination),{recursive:true});const original=fs.readFileSync(source);let data=original;
  const runtime=f.name.startsWith('hosts/runtime/'),immutable=f.name.startsWith('downloads/')||/^console\/ps[45]\/whatsite-ps[45]\.html$/.test(f.name);
  if(runtime&&/\.m?js$/i.test(f.name)){nativeFiles++;}
  else if(!immutable&&/\.(?:html|js|css|json|xml|md|txt)$/i.test(f.name)){let text=original.toString('utf8');if(!runtime)text=rewrite(text,f.name);
   if(runtime&&f.name.endsWith('.html')){const inject='<script src="'+BASE+'/host-project-map.js"></script><script src="'+BASE+'/assets/host-project-routing.js"></script>';text=/<head\b[^>]*>/i.test(text)?text.replace(/<head\b[^>]*>/i,h=>h+inject):inject+text;}
   data=Buffer.from(text);
  }fs.writeFileSync(destination,data);
 }
 const aliases={};for(const p of hosted)aliases['/'+p]=BASE+'/'+p;for(const [p,u]of Object.entries(mapping))aliases[p]=u;
 fs.writeFileSync(path.join(output,'host-project-map.js'),'window.WWB_HOST_PROJECT='+JSON.stringify({base:BASE,main:MAIN,aliases}).replaceAll('<','\\u003c')+';');
 fs.writeFileSync(path.join(output,'index.html'),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WWB HOST</title><meta http-equiv="refresh" content="0;url='+BASE+'/hosts/"></head><body><a href="'+BASE+'/hosts/">PS4 / PS5 host</a> · <a href="'+MAIN+'">Main site</a></body></html>');
 fs.writeFileSync(path.join(output,'404.html'),'<!doctype html><html><head><meta charset="utf-8"><title>WWB HOST file lookup</title></head><body><p id="status">Finding the preserved host file…</p><a href="'+BASE+'/hosts/">Hosts</a><script src="'+BASE+'/host-project-map.js"></script><script>var p=decodeURIComponent(location.pathname).replace(/^\\/WWB-HOST/,""),u=WWB_HOST_PROJECT.aliases[p];if(u&&u.indexOf("https://raw.githubusercontent.com/Speedy-away/WWB-HOST/")===0)location.replace(u);else document.getElementById("status").textContent="This file is not in the active site. Choose its preserved download from the host directory.";</script></body></html>');
 fs.writeFileSync(path.join(output,'.nojekyll'),'');const report={revision,base:BASE,origin:ORIGIN,bytes:walk(output).reduce((n,f)=>n+fs.statSync(f).size,0),budget:LIMIT,files:hosted.size,offloadedFiles:Object.keys(mapping).length,nativeScriptsUnchanged:nativeFiles,activeKaro,downloadMap:mapping};assert.ok(report.bytes<1e9);fs.writeFileSync(path.join(output,'pages-build.json'),JSON.stringify({...report,downloadMap:undefined},null,2));console.log(JSON.stringify({...report,downloadMap:undefined}));return report;
}
if(require.main===module)build(path.resolve(process.argv[2]),process.env.GITHUB_SHA||'main');module.exports={build,BASE,ORIGIN,MAIN};
