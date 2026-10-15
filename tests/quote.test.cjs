const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function boot() {
    const els = new Map(), handlers = {}, saved = new Map();
    const el = key => { if(!els.has(key)) els.set(key,{value:'',hidden:false,disabled:false,files:[],dataset:{},listeners:{},addEventListener(n,f){this.listeners[n]=f;},setCustomValidity(v){this.error=v;}}); return els.get(key); };
    const radios=['file','repair','design'].map(value=>Object.assign(el(value),{value,checked:value==='repair'}));
    const form=el('form');
    form.querySelector=s=>s==='[name="Rodzaj zlecenia"]:checked'?radios.find(r=>r.checked):el(s);
    form.querySelectorAll=()=>radios;
    form.appendChild=input=>els.set(`[name="${input.name}"]`,input);
    form.setAttribute=()=>{}; form.removeAttribute=()=>{};
    form.reportValidity=()=>!el('#quote-files').error && el('#quote-description').value.length>0 && el('#quote-email').value.length>0;
    el('#quote-description').value='  Test uchwytu  '; el('#quote-email').value=' test@example.com '; el('#quote-quantity').value='2';
    const context={document:{querySelector:()=>form,querySelectorAll:()=>[],createElement:()=>({})},window:{addEventListener(n,f){handlers[n]=f;}},location:{href:'https://3dmake.pl/#kontakt'},crypto:require('node:crypto').webcrypto,URL,sessionStorage:{setItem(k,v){saved.set(k,v);}},fetch(){throw Error('Native form must not fetch');}};
    vm.runInNewContext(fs.readFileSync('quote.js','utf8'),context);
    return {el,form,radios,saved,handlers,submit(){let prevented=false;form.listeners.submit({preventDefault(){prevented=true;}});return prevented;}};
}
test('native POST stays enabled, receipt ID matches email, no PII in URL',()=>{
    const b=boot();assert.equal(b.submit(),false);
    assert.equal(b.el('#quote-fields').disabled,false);assert.equal(b.el('[type="submit"]').disabled,true);
    const url=new URL(b.el('[name="_next"]').value), id=b.el('[name="Numer zapytania"]').value;
    assert.equal(url.pathname,'/zapytanie-przyjete.html');assert.equal(url.hash,'');assert.equal(url.searchParams.get('request'),id);
    assert.ok(b.el('[name="_subject"]').value.includes(id));assert.equal(b.saved.get('3dmake.quote.pending'),id);
    assert.equal(b.el('#quote-email').value,'test@example.com');assert.equal(b.submit(),true);
    b.handlers.pageshow();assert.equal(b.el('[type="submit"]').disabled,false);assert.equal(b.el('#quote-description').value,'Test uchwytu');
});
test('multipart keeps two file names and all text fields',()=>{
    const b=boot();b.el('#quote-files').files=[{name:'uchwyt.jpg',size:4},{name:'uchwyt.stl',size:5}];
    const values=new Map([['files','unused'],['email','test@example.com'],['Opis i zastosowanie','uchwyt']]);const uploads=[];
    b.form.listeners.formdata({formData:{set(k,v){values.set(k,v);},delete(k){values.delete(k);},append(...v){uploads.push(v);}}});
    assert.equal(values.has('files'),false);assert.equal(values.get('email'),'test@example.com');assert.equal(values.get('Opis i zastosowanie'),'uchwyt');
    assert.deepEqual(uploads.map(v=>[v[0],v[2]]),[['attachment','uchwyt.jpg'],['attachment2','uchwyt.stl']]);
});
test('bad file sizes/counts/extensions, whitespace and honeypot stop POST',()=>{
    for(const list of [[{name:'x.stl',size:10000001}],Array(6).fill({name:'x.jpg',size:1}),[{name:'x.exe',size:1}]]){const b=boot();b.el('#quote-files').files=list;assert.equal(b.submit(),true);assert.equal(b.el('[type="submit"]').disabled,false);}
    const b=boot();b.el('#quote-description').value='   ';assert.equal(b.submit(),true);
    const c=boot();c.el('[name="_honey"]').value='bot';assert.equal(c.submit(),true);
});
test('receipt measures matching submission once, never a direct open/reload',()=>{
    const id='00000000-0000-4000-8000-000000000001', nodes=new Map(); let lead=0,pending=id;
    const context={location:{href:`https://3dmake.pl/zapytanie-przyjete.html?request=${id}`},URL,document:{querySelector(k){if(!nodes.has(k))nodes.set(k,{});return nodes.get(k);}},sessionStorage:{getItem(){return pending;},removeItem(){pending=null;}},window:{siteAnalytics:{quoteSubmitted(){lead++;}}}};
    const code=fs.readFileSync('quote-receipt.js','utf8');vm.runInNewContext(code,context);vm.runInNewContext(code,context);
    assert.equal(lead,1);assert.equal(nodes.get('#receipt-number').textContent,id);
    context.location.href='https://3dmake.pl/zapytanie-przyjete.html?request=<script>';nodes.clear();vm.runInNewContext(code,context);assert.equal(nodes.size,0);assert.equal(lead,1);
});
