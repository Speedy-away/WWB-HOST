'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{fixture}=require('./host-continuation-dom.cjs'),{hostActions}=require('../build-host-selector.cjs');
test('firmware picker offers complete original browser hosts and preserves exact compatibility',()=>{
 const rows=hostActions('ps4'),g=rows.find(a=>a.id==='gamerhack-g2all'),raw=rows.find(a=>a.id==='raw13g-1302-1352'),after=rows.find(a=>a.id==='built-in-ps4-afterglow');assert.ok(g.browserHost);assert.ok(g.firmwares.includes('9.00'));assert.equal(g.firmwares.includes('14.00'),false);assert.deepEqual(raw.firmwares,['13.02','13.04','13.50','13.52']);assert.deepEqual(after.firmwares,['13.52','14.00']);assert.equal(rows.some(a=>['built-in-ps4-900','built-in-ps4-psfree-700-960'].includes(a.id)),false);
});
test('one Load gesture navigates the matching PS4 directly to its original host without a popup or BIN transfer',()=>{
 const a=hostActions('ps4').find(a=>a.id==='gamerhack-g2all'),app=fixture({actions:[a],initialCategory:'loaders',catalogGrid:true,userAgent:'Mozilla/5.0 (PlayStation 4/9.00)'}),tile=app.ids['host-action-grid'].querySelector('[data-launch]');assert.ok(tile);assert.equal(tile.disabled,false);assert.match(app.ids['host-action-grid'].innerHTML,/>Load</);app.ids['host-action-grid'].fire('click',{target:tile});assert.equal(app.window.location.href,a.launchURL);assert.equal(app.opened.length,0);assert.equal(app.sends.length,0);assert.equal(app.ids['host-version-overlay'].hidden,true);
});
test('PC browsing cannot launch the console chain, and 14.00 only offers its confirmed Afterglow route',()=>{
 const actions=hostActions('ps4').filter(a=>a.category==='loaders'),pc=fixture({actions,initialCategory:'loaders',catalogGrid:true});assert.ok(pc.ids['host-action-grid'].querySelector('[data-launch]').disabled);assert.equal(pc.sends.length,0);const ps4=fixture({actions,initialCategory:'loaders',catalogGrid:true,userAgent:'Mozilla/5.0 (PlayStation 4/14.00)'});assert.match(ps4.ids['host-action-grid'].innerHTML,/built-in-ps4-afterglow/);assert.doesNotMatch(ps4.ids['host-action-grid'].innerHTML,/gamerhack-g2all|raw13g-1302-1352/);
});
test('ordinary payloads never become external browser hosts when URL is absent or ID is unknown',()=>{
 const {prepare,isTrustedOriginal}=require('../ps4-browser-hosts.cjs');for(const a of [{id:'unknown',platform:'ps4'},{id:'gamerhack-g2all',platform:'ps4',launchURL:'https://example.com/'}]){assert.equal(isTrustedOriginal(a),false);assert.deepEqual(prepare([a],'ps4'),[a]);}
});
test('old bookmarks now show Load and retain the advanced native listener separately',()=>{
 for(const id of ['ps4-900','ps4-psfree-700-960']){const html=fs.readFileSync(path.resolve(__dirname,'../../hosts/runtime',id,'index.html'),'utf8');assert.match(html,/>Load</);assert.match(html,/https:\/\/gamerhack.github.io\/g2all\//);assert.doesNotMatch(html,/GoldHEN is not automatically|This entry does not automatically|then wait/);assert.match(html,/href="web\/index.html"/);}
});
