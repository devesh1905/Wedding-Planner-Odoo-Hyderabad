import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractQuote, extractTextFromPdf } from './extract-quote';
import { normalizeForComparison } from './compare';
import { quoteExtractionSchema, rupeesToPaise } from './quote-schema';

test('three PDF layouts match validated fixtures, prices and missing inclusions',async()=>{
  const original = process.env.AI_API_KEY; delete process.env.AI_API_KEY;
  try {
    const names=['caterer-a-shahi-rasoi','caterer-b-marwar-feasts','caterer-c-royal-thaal'];
    const quotes=[];
    for (const name of names) {
      const text=await extractTextFromPdf(await readFile(new URL(`../../../demo-assets/quotes/${name}.pdf`,import.meta.url)));
      const {data}=await extractQuote(text); quotes.push(data);
    }
    assert.deepEqual(quotes.map(q=>q.perPlate),[2450,2150,2600]);
    assert.deepEqual(quotes.map(q=>q.extraHourRate),[15000,12000,18000]);
    assert.deepEqual(quotes.map(q=>q.total),[980000,946000,1227200]);
    const comparison=normalizeForComparison(quotes);
    assert.equal(comparison.cheapestVendorIndex,1);
    assert.deepEqual(comparison.rows.find(r=>r.key==='DESSERT')!.values.map(v=>v.missing),[false,true,false]);
    assert.equal(comparison.rows.find(r=>r.key==='DESSERT')!.values[0]!.value,null);
    await assert.rejects(extractQuote('Shahi Rasoi is quoting a different wedding for 100 guests'),/No service key/);
    await assert.rejects(extractQuote(''),/1 to 100000/);
    assert.equal(rupeesToPaise(2450),245000);
    assert.throws(()=>rupeesToPaise(Infinity));
    assert.equal(quoteExtractionSchema.safeParse({...quotes[0],perPlate:-1}).success,false);
    assert.equal(normalizeForComparison([]).cheapestVendorIndex,null);
    assert.equal(normalizeForComparison([{...quotes[0]!,total:null}]).cheapestVendorIndex,null);
  } finally { if (original===undefined) delete process.env.AI_API_KEY; else process.env.AI_API_KEY=original; }
});

test('invalid service JSON gets one repair retry; network failure only falls back for exact demos',async()=>{
  const originalFetch=globalThis.fetch;
  const old={...process.env};
  process.env.AI_API_KEY='test-key'; process.env.AI_PROVIDER='gemini';
  delete process.env.AI_ENDPOINT; delete process.env.AI_PROTOCOL; delete process.env.AI_HEADERS_JSON;
  const fixture=JSON.parse(await readFile(new URL('./fixtures/caterer-b-marwar-feasts.json',import.meta.url),'utf8')) as unknown;
  try {
    let calls=0;
    globalThis.fetch=async (_url,init)=>{
      calls++;
      const body=JSON.parse(String(init?.body)) as {systemInstruction:{parts:{text:string}[]}};
      if(calls===2) assert.match(body.systemInstruction.parts[0]!.text,/previous JSON was invalid/);
      return Response.json({candidates:[{content:{parts:[{text:calls===1 ? JSON.stringify({...fixture as object,perPlate:-2}) : JSON.stringify(fixture)}]}}]});
    };
    assert.equal((await extractQuote('An unknown but valid new quote')).data.vendorName,'Marwar Feasts'); assert.equal(calls,2);
    calls=0; globalThis.fetch=async()=>{calls++;return Response.json({candidates:[{content:{parts:[{text:'bad json'}]}}]});};
    await assert.rejects(extractQuote('Unknown text'),/could not be validated/); assert.equal(calls,2);
    globalThis.fetch=async()=>{throw new TypeError('fetch failed');};
    const text=await extractTextFromPdf(await readFile(new URL('../../../demo-assets/quotes/caterer-b-marwar-feasts.pdf',import.meta.url)));
    assert.equal((await extractQuote(text)).data.perPlate,2150);
    await assert.rejects(extractQuote('Unknown text'),/fetch failed/);
    globalThis.fetch=async()=>new Response('Unauthorized',{status:401});
    await assert.rejects(extractQuote(text),/401/);
  } finally { globalThis.fetch=originalFetch; for(const key of Object.keys(process.env)) if(!(key in old)) delete process.env[key]; Object.assign(process.env,old); }
});

test('invalid PDFs are rejected',async()=>{
  await assert.rejects(extractTextFromPdf(Buffer.from('not a PDF')),/Upload a PDF/);
});
