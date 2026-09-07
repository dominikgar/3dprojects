const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function boot({id='G-TEST123', saved=null, blocked=false}={}) {
 const listeners={}, buttons={}, scripts=[], observers=[]; let reloads=0;
 const storage=new Map(saved ? [['3dmake.analytics-consent.v1',JSON.stringify(saved)]] : []);
 const button=()=>({addEventListener(n,f){this[n]=f;},focus(){}});
 const open=button(), withdraw=button();
 const banner={setAttribute(){},querySelector(s){return buttons[s] ||= button();}};
 const document={cookie:'',visibilityState:'visible',head:{appendChild(s){scripts.push(s);}},body:{appendChild(){}},createElement(t){return t==='aside'?banner:{};},querySelector(){return {};},querySelectorAll(s){return s.includes('withdraw')?[withdraw]:[open];},addEventListener(n,f){listeners[n]=f;}};
 const w={SITE_ANALYTICS_CONFIG:{measurementId:id},addEventListener(n,f){listeners[n]=f;}};
 let timer;
 const context={window:w,document,location:{origin:'https://3dmake.pl',pathname:'/',hostname:'3dmake.pl',reload(){reloads++;}},localStorage:{getItem(k){if(blocked)throw Error();return storage.get(k)||null;},setItem(k,v){if(blocked)throw Error();storage.set(k,v);}},setTimeout(f){timer=f;return 1;},clearTimeout(){timer=null;},IntersectionObserver:class {constructor(f){this.f=f;observers.push(this);}observe(){}disconnect(){}}};
 w.IntersectionObserver=context.IntersectionObserver;
 vm.runInNewContext(fs.readFileSync('analytics.js','utf8'),context);
 return {w,scripts,banner,withdraw,storage,observers,buttons,listeners,get reloads(){return reloads;},tick(){timer?.();},yes(){buttons['[data-choice="yes"]'].click();},no(){buttons['[data-choice="no"]'].click();},events(){return w.dataLayer.filter(a=>a[0]==='event');}};
}
test('no tag or events before consent or after rejection',()=>{const b=boot();b.w.siteAnalytics.calculatorUsed();b.tick();b.no();assert.equal(b.scripts.length,0);assert.equal(b.events().length,0);assert.equal(b.w.dataLayer[0][2].ad_user_data,'denied');});
test('empty ID remains disabled after consent',()=>{const b=boot({id:''});b.yes();assert.equal(b.scripts.length,0);b.w.siteAnalytics.calculatorUsed();b.tick();assert.equal(b.events().length,0);});
test('consent loads only once and leaves advertising denied',()=>{const b=boot();b.yes();b.yes();assert.equal(b.scripts.length,1);const u=b.w.dataLayer.filter(a=>a[0]==='consent'&&a[1]==='update').at(-1)[2];assert.equal(u.analytics_storage,'granted');for(const k of ['ad_storage','ad_user_data','ad_personalization'])assert.equal(u[k],'denied');});
test('calculator debounce and cancel, click whitelist, portfolio',()=>{const b=boot();b.yes();b.w.siteAnalytics.calculatorUsed();b.w.siteAnalytics.cancelCalculator();b.tick();assert.equal(b.events().length,0);b.w.siteAnalytics.calculatorUsed();b.tick();for(const name of ['click_contact','click_quote','untrusted']) b.listeners.click({target:{closest(){return {dataset:{analyticsEvent:name}};}}});b.observers[0].f([{isIntersecting:true,intersectionRatio:.2}]);assert.deepEqual(Array.from(b.events(),a=>a[1]),['calculator_use','click_contact','click_quote','portfolio_view']);});
test('withdrawal disables and unloads tag; cross-tab revocation',()=>{const b=boot();b.yes();b.withdraw.click();assert.equal(b.w['ga-disable-G-TEST123'],true);assert.equal(b.reloads,1);b.w.siteAnalytics.calculatorUsed();b.tick();assert.equal(b.events().length,0);const c=boot();c.yes();c.storage.clear();c.listeners.storage({key:null});assert.equal(c.reloads,1);});
test('saved, expired and inaccessible choices',()=>{assert.equal(boot({saved:{granted:true,at:Date.now()}}).scripts.length,1);assert.equal(boot({saved:{granted:true,at:0}}).scripts.length,0);const b=boot({blocked:true});b.yes();assert.equal(b.scripts.length,1);b.no();assert.equal(b.reloads,1);});
