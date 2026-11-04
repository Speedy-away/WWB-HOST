'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'../..'),ui=require('../../assets/host-dashboard.js'),{hostActions}=require('../build-host-selector.cjs'),{fixture}=require('./host-continuation-dom.cjs');
function app(fw,extra={}){return fixture({platform:'ps5',initialCategory:'loaders',catalogGrid:true,firmwareChoicesOnly:true,actions:hostActions('ps5'),userAgent:'Mozilla/5.0 (PlayStation; PlayStation 5/'+fw+')',...extra});}
test('all source-confirmed offered firmware versions have a real browser Load route; source whitelist gaps remain absent',()=>{
 const actions=hostActions('ps5'),versions=ui.availableBrowserFirmwares(actions);assert.equal(versions.length,62);for(const fw of versions)assert.ok(ui.filterActions(actions,'loaders',fw,'','',true).some(a=>(a.browserHost||a.localLauncher)&&a.launchURL&&ui.firmwareMatches(a,fw)),fw);for(const fw of ['6.00','9.05','11.40'])assert.equal(versions.includes(fw),false,fw);
 const report=JSON.parse(fs.readFileSync(path.join(root,'docs/qa/ps5-original-hosts.json')));for(const source of report.hosts){const a=actions.find(a=>a.id===source.id);assert.deepEqual(a.firmwares.slice().sort(),source.firmwares.slice().sort());assert.equal(a.launchURL,source.launchURL);assert.equal(a.browserHost,true);}
});
test('13.60 selection shows Relapse Load, stays inert until pressed, then opens the original progress host in this tab',()=>{
 const a=app('13.60'),grid=a.ids['host-action-grid'],button=grid.querySelector('[data-launch="ps5-relapse"]');assert.ok(button);assert.equal(button.disabled,false);assert.match(grid.innerHTML,/>Load</);assert.equal(a.sends.length,0);assert.equal(a.opened.length,0);grid.fire('click',{target:button});assert.equal(a.window.location.href,'https://soniciso1.github.io/relapse/relapse.html');assert.equal(a.opened.length,0);assert.equal(a.sends.length,0);
});
test('remaining5.xx and3.10/3.21 routes reach original UMTX2 with no invented autostart parameters',()=>{
 for(const fw of ['3.10','3.21','5.00','5.02','5.10','5.50']){const a=app(fw),grid=a.ids['host-action-grid'],button=grid.querySelector('[data-launch="ps5-umtx2"]');assert.ok(button,fw);grid.fire('click',{target:button});assert.equal(a.window.location.href,'https://umtx2.pages.dev/');assert.equal(a.sends.length,0);}
});
test('only actual firmware choices are rendered; saved or detected6.00 never creates an empty placeholder button',()=>{
 const html=require('../host-webhost-markup.cjs').dashboard('ps5',hostActions('ps5'),{gamesLanding:true});assert.ok(html.includes('data-host-firmware="13.60"'));assert.ok(!html.includes('data-host-firmware="6.00"'));assert.ok(html.includes('"firmwareChoicesOnly":true'));
 const storage=new Map([['whatwhatboy.host.ps5',JSON.stringify({firmware:'6.00',address:''})]]),a=app('6.00',{storage,firmwareButtons:['4.51','6.00','13.60']});assert.equal(a.ids['host-firmware'].value,'');const unavailable=a.ids['host-firmware-buttons'].querySelector('[data-host-firmware="6.00"]');assert.equal(unavailable.hidden,true);assert.equal(unavailable.disabled,true);assert.match(a.ids['host-firmware-status'].textContent,/No Load route/);assert.equal(a.sends.length,0);assert.equal(a.opened.length,0);
});
test('desktop firmware clicks select and reveal the route without opening anything; Load explains the console target',()=>{
 const a=app('13.60',{userAgent:'Desktop browser'});a.selectFirmware('13.60');assert.equal(a.ids['host-firmware'].value,'13.60');const button=a.ids['host-action-grid'].querySelector('[data-launch="ps5-relapse"]');assert.ok(button);assert.equal(button.disabled,true);assert.match(a.ids['host-action-grid'].innerHTML,/Open on PS5/);assert.equal(a.sends.length,0);assert.equal(a.opened.length,0);assert.equal(a.anchorClicks.length,0);
});
test('a manually selected firmware cannot launch a different firmware chain on the console',()=>{
 const a=app('5.50');a.selectFirmware('13.60');const button=a.ids['host-action-grid'].querySelector('[data-launch="ps5-relapse"]');assert.ok(button);assert.equal(button.disabled,true);a.ids['host-action-grid'].fire('click',{target:button});assert.match(a.ids['host-status'].textContent,/firmware detected/);assert.ok(!a.window.location.href.includes('soniciso1'));assert.equal(a.sends.length,0);
});
test('only the reviewed original IDs and exact HTTPS targets enter the active browser catalogue',()=>{
 const {bind}=require('../host-first-party-navigation.cjs');for(const a of [{id:'ps5-umtx2',platform:'ps5',launchURL:'https://foreign.example/',browserHost:true},{id:'unknown',platform:'ps5',launchURL:'https://umtx2.pages.dev/',browserHost:true}])assert.equal(bind(a),null);
});

test('shared production catalogues retain supported-only choices and the13.60 Load route',()=>{const actions=hostActions('ps5'),a=app('13.60',{sharedCatalogue:{key:'original-hosts',actions}});assert.ok(a.ids['host-action-grid'].querySelector('[data-launch="ps5-relapse"]'));assert.equal(a.ids['host-firmware-buttons'].querySelector('[data-host-firmware="6.00"]'),null);assert.equal(a.sends.length,0);assert.equal(a.opened.length,0);});
