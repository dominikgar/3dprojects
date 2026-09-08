const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

// Exercise the submission controller without contacting the mail provider.
function boot(respond = async data => ({ok:true, redirected:true, url:data.get('_next'), json:async()=>({received:true})})) {
    const els = new Map();
    function el(key) {
        if (!els.has(key)) els.set(key, {value:'', hidden:false, disabled:false, files:[], dataset:{}, listeners:{}, addEventListener(n, fn){this.listeners[n]=fn;}, setCustomValidity(s){this.error=s;}, focus(){this.focused=true;}});
        return els.get(key);
    }
    const radios=['file','repair','design'].map(value=>Object.assign(el(value),{value,checked:value==='repair'}));
    const form=el('form');
    form.action='https://formsubmit.co/test-endpoint';
    form.querySelector=s=>s==='[name="Rodzaj zlecenia"]:checked'?radios.find(r=>r.checked):s==='[name="Rodzaj zlecenia"]'?radios[0]:el(s);
    form.querySelectorAll=()=>radios;
    form.setAttribute=()=>{}; form.removeAttribute=()=>{};
    form.reportValidity=()=>!el('#quote-files').error && el('#quote-description').value.length>0 && el('#quote-email').value.length>0;
    form.reset=()=>{el('#quote-description').value=''; el('#quote-email').value=''; el('#quote-files').files=[];};
    el('#quote-description').value='  Uchwyt — test  ';
    el('#quote-email').value=' test@example.com ';
    el('#quote-quantity').value='2';
    const blob=new Blob(['solid test\nendsolid test'],{type:'model/stl'});
    Object.defineProperty(blob,'name',{value:'test.stl'});
    el('#quote-files').files=[blob];
    class Data extends FormData { constructor(){super(); this.set('email',el('#quote-email').value); this.set('Opis i zastosowanie',el('#quote-description').value); this.set('Liczba sztuk',el('#quote-quantity').value); this.set('files',blob);} }
    let calls=0, leads=0, captured;
    const context={document:{querySelector:()=>form,querySelectorAll:()=>[]},window:{siteAnalytics:{quoteSubmitted(){leads++;}}},location:{href:'https://3dmake.pl/'},crypto:require('node:crypto').webcrypto,URL,FormData:Data,AbortController,setTimeout,clearTimeout,fetch:async(url, options)=>{calls++;captured=options;return respond(options.body, options);}};
    vm.runInNewContext(fs.readFileSync('quote.js','utf8'),context);
    return {el,form,radios,get calls(){return calls;},get leads(){return leads;},get captured(){return captured;},submit:()=>form.listeners.submit({preventDefault(){}})};
}
test('accepted redirect preserves separate attachments, uses reply email and records one lead',async()=>{
    const b=boot(); const first=b.el('#quote-files').files[0];
    b.el('#quote-files').files=[first,first]; await b.submit();
    assert.equal(b.calls,1); assert.equal(b.leads,1);
    assert.equal(b.captured.body.get('email'),'test@example.com');
    assert.equal(b.captured.body.get('Rodzaj zlecenia'),'Odtworzenie uszkodzonej części');
    assert.equal(b.captured.body.has('files'),false);
    assert.ok(b.captured.body.get('attachment') instanceof Blob);
    assert.ok(b.captured.body.get('attachment2') instanceof Blob);
    assert.equal(b.el('#quote-fields').hidden,true);
    assert.equal(b.el('#quote-status').dataset.state,'success');
    await b.submit(); assert.equal(b.calls,1); assert.equal(b.leads,1);
});
test('network failure retains text and attachments, unlocks retry, emits no lead',async()=>{
    const b=boot(async()=>{throw Error('offline');}); await b.submit();
    assert.equal(b.el('#quote-fields').hidden,false); assert.equal(b.el('#quote-fields').disabled,false);
    assert.equal(b.el('#quote-description').value,'Uchwyt — test'); assert.equal(b.el('#quote-files').files.length,1);
    assert.equal(b.el('#quote-status').dataset.state,'error'); assert.equal(b.leads,0);
    await b.submit(); assert.equal(b.calls,2);
});
test('activation page, wrong redirect, HTTP error and mere success JSON never count as accepted',async()=>{
    for (const response of [
        {ok:true,redirected:false,url:'https://formsubmit.co/test',json:async()=>({success:'true'})},
        {ok:true,redirected:true,url:'https://3dmake.pl/quote-received.json?request=wrong',json:async()=>({received:true})},
        {ok:false,redirected:true,url:'https://3dmake.pl/',json:async()=>({received:true})},
        {ok:true,redirected:false,json:async()=>{throw Error('HTML activation page');}}
    ]) {const b=boot(async()=>response);await b.submit();assert.equal(b.leads,0);assert.equal(b.el('#quote-fields').hidden,false);assert.equal(b.el('#quote-status').dataset.state,'error');}
});
test('oversized, excessive and unsupported files stop before sending',async()=>{
    for (const files of [[{name:'huge.stl',size:10000001}],Array(6).fill({name:'test.stl',size:2}),[{name:'run.exe',size:2}]]) {
        const b=boot();b.el('#quote-files').files=files;await b.submit();assert.equal(b.calls,0);assert.ok(b.el('#quote-files').error);
    }
});
test('duplicate click while sending cannot create a second request',async()=>{
    let finish;const b=boot(data=>new Promise(resolve=>{finish=()=>resolve({ok:true,redirected:true,url:data.get('_next'),json:async()=>({received:true})});}));
    const pending=b.submit();await b.submit();assert.equal(b.calls,1);finish();await pending;assert.equal(b.leads,1);
});
test('honeypot and whitespace-only description stop before sending',async()=>{
    const b=boot();b.el('[name="_honey"]').value='spam';await b.submit();assert.equal(b.calls,0);
    const c=boot();c.el('#quote-description').value='   ';await c.submit();assert.equal(c.calls,0);
});
test('quantity guidance and reset keep a new inquiry separate from a submitted one',async()=>{
    const b=boot();assert.equal(b.el('#quote-batch').hidden,false);b.el('#quote-quantity').value='1';b.el('#quote-quantity').listeners.input();assert.equal(b.el('#quote-batch').hidden,true);
    await b.submit();b.el('#quote-restart').listeners.click();assert.equal(b.el('#quote-fields').hidden,false);assert.equal(b.el('#quote-status').hidden,true);assert.equal(b.el('#quote-files').files.length,0);
});
