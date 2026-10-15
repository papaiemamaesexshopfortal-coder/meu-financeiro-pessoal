import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const html=readFileSync('index.html','utf8'),source=readFileSync('installation.js','utf8');
function fixture(agent){const dom=new JSDOM(html,{url:'https://app.test',runScripts:'outside-only',pretendToBeVisual:true});if(agent)Object.defineProperty(dom.window.navigator,'userAgent',{value:agent});dom.window.eval(source);return dom;}
test('iPhone installation help opens before login and returns keyboard focus',()=>{
 const dom=fixture('iPhone');try{const w=dom.window,d=w.document,button=d.querySelector('[data-install-help]');button.click();assert.equal(d.querySelector('#installOverlay').hidden,false);assert.match(d.querySelector('#installInstructions').textContent,/Safari/);assert.equal(d.activeElement.id,'installClose');d.querySelector('#installOverlay').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(d.querySelector('#installOverlay').hidden,true);assert.equal(d.activeElement,button);}finally{dom.window.close();}
});
test('browser installation is prompted only after user action and consumed once',async()=>{
 const dom=fixture();try{const w=dom.window,d=w.document;let calls=0;const event=new w.Event('beforeinstallprompt',{cancelable:true});event.prompt=async()=>{calls++;};event.userChoice=Promise.resolve({outcome:'accepted'});w.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.equal(calls,0);d.querySelector('[data-install-help]').click();assert.equal(d.querySelector('#installAction').hidden,false);d.querySelector('#installAction').click();await new Promise(r=>setTimeout(r,0));assert.equal(calls,1);assert.equal(d.querySelector('#installAction').hidden,true);assert.match(d.querySelector('#installStatus').textContent,/solicitada/);w.dispatchEvent(new w.Event('appinstalled'));assert.match(d.querySelector('#installStatus').textContent,/instalado/);}finally{dom.window.close();}
});
