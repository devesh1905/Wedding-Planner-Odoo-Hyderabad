import { createHash } from 'node:crypto';
import { PDFParse } from 'pdf-parse';
import { z } from 'zod';
import { quoteExtractionSchema, type QuoteExtraction } from './quote-schema';
import { systemPrompt } from './prompts';
import manifest from './fixtures/manifest.json';
import shahiRasoi from './fixtures/caterer-a-shahi-rasoi.json';
import marwarFeasts from './fixtures/caterer-b-marwar-feasts.json';
import royalThaal from './fixtures/caterer-c-royal-thaal.json';

export async function extractTextFromPdf(buf: Buffer): Promise<string> {
  if (buf.length > 15 * 1024 * 1024 || !buf.subarray(0,1024).includes(Buffer.from('%PDF-'))) throw new Error('Upload a PDF smaller than 15 MB');
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  try {
    const { text } = await parser.getText();
    if (!text.trim()) throw new Error('This PDF has no readable text. Enter the quote manually.');
    return text;
  } finally { await parser.destroy(); }
}

export function textFingerprint(text: string): string {
  return createHash('sha256').update(text.replace(/\s+/g,' ').trim()).digest('hex');
}

const fixtures: Record<string, unknown> = {
  'caterer-a-shahi-rasoi.json': shahiRasoi,
  'caterer-b-marwar-feasts.json': marwarFeasts,
  'caterer-c-royal-thaal.json': royalThaal,
};
async function fixtureFor(text: string): Promise<QuoteExtraction | null> {
  // Static imports let server bundlers include every fixture in deployment output.
  const filename = (manifest as Record<string,string>)[textFingerprint(text)];
  return filename && fixtures[filename] ? quoteExtractionSchema.parse(fixtures[filename]) : null;
}

const responseSchema = z.object({ candidates: z.array(z.object({content:z.object({parts:z.array(z.object({text:z.string().optional()}))})})).optional(), choices:z.array(z.object({message:z.object({content:z.string()})})).optional(), content:z.array(z.object({type:z.string(),text:z.string().optional()})).optional() });

async function requestJson(text: string, correction: string): Promise<string> {
  const provider = process.env.AI_PROVIDER || 'gemini';
  const protocol = process.env.AI_PROTOCOL || (provider === 'gemini' ? 'gemini' : 'chat');
  const model = process.env.AI_MODEL || (protocol === 'gemini' ? 'gemini-3.8-flash' : '');
  if (!model) throw new Error('Configure AI_MODEL for the selected provider');
  const endpoint = process.env.AI_ENDPOINT || (protocol === 'gemini' ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` : '');
  if (!endpoint) throw new Error('Configure AI_ENDPOINT and AI_PROTOCOL for the selected provider');
  const url = new URL(endpoint);
  if (url.protocol !== 'https:') throw new Error('AI_ENDPOINT must use HTTPS');
  const prompt = `${systemPrompt}\n${correction}`;
  let headers: Record<string,string> = {'Content-Type':'application/json'};
  let body: unknown;
  if (protocol === 'gemini') {
    headers['x-goog-api-key'] = process.env.AI_API_KEY!;
    body = {systemInstruction:{parts:[{text:prompt}]},contents:[{role:'user',parts:[{text}]}],generationConfig:{responseMimeType:'application/json',temperature:0}};
  } else if (protocol === 'messages') {
    headers['x-api-key'] = process.env.AI_API_KEY!;
    body = {model,max_tokens:8192,system:prompt,messages:[{role:'user',content:text}],temperature:0};
  } else if (protocol === 'chat') {
    headers.Authorization = `Bearer ${process.env.AI_API_KEY!}`;
    body = {model,messages:[{role:'system',content:prompt},{role:'user',content:text}],response_format:{type:'json_object'},temperature:0};
  } else { throw new Error('AI_PROTOCOL must be gemini, messages or chat'); }
  // Extra version headers stay deployment configuration, keeping adapters portable.
  if (process.env.AI_HEADERS_JSON) headers = {...headers,...z.record(z.string(),z.string()).parse(JSON.parse(process.env.AI_HEADERS_JSON))};
  const response = await fetch(url,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  if (!response.ok) throw new ProviderHttpError(response.status);
  const payload = responseSchema.parse(await response.json());
  const raw = protocol === 'gemini' ? payload.candidates?.[0]?.content.parts.map(p=>p.text || '').join('') : protocol === 'messages' ? payload.content?.filter(p=>p.type==='text').map(p=>p.text || '').join('') : payload.choices?.[0]?.message.content;
  if (!raw) throw new Error('The provider returned no quote text');
  return raw;
}

class ProviderHttpError extends Error { constructor(public readonly status: number) { super(`Quote service failed (${status})`); } }

export async function extractQuote(text: string): Promise<{data:QuoteExtraction;raw:string}> {
  if (!text.trim() || text.length > 100000) throw new Error('Quote text must contain 1 to 100000 characters');
  if (!process.env.AI_API_KEY) {
    const data = await fixtureFor(text);
    if (!data) throw new Error('No service key is configured. Enter this quote manually.');
    return {data,raw:JSON.stringify(data)};
  }
  let correction = '';
  for (let attempt=0; attempt<2; attempt++) {
    let raw: string;
    try { raw = await requestJson(text,correction); }
    catch (error) {
      // Only known demo documents may fall back; unknown PDFs never receive invented prices.
      const offline = error instanceof TypeError || (error instanceof DOMException && ['TimeoutError','AbortError'].includes(error.name)) || (error instanceof ProviderHttpError && (error.status>=500 || error.status===429));
      if (offline) { const data = await fixtureFor(text); if (data) return {data,raw:JSON.stringify(data)}; }
      throw error;
    }
    try { return {data:quoteExtractionSchema.parse(JSON.parse(raw.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''))),raw}; }
    catch (error) {
      if (attempt===1) throw new Error('The quote could not be validated. Enter the quote manually.');
      correction = `Your previous JSON was invalid. Correct these errors: ${error instanceof z.ZodError ? JSON.stringify(error.issues) : 'Invalid JSON syntax'}`;
    }
  }
  throw new Error('Quote extraction failed');
}
