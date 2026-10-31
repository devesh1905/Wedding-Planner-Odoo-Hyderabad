import { readFile } from 'node:fs/promises';
import { extractQuote, extractTextFromPdf } from './extract-quote';
try {
  if (!process.argv[2]) throw new Error('Usage: tsx src/lib/ai/try.ts <quote.pdf>');
  const text = await extractTextFromPdf(await readFile(process.argv[2]));
  const {data} = await extractQuote(text);
  console.log(JSON.stringify(data,null,2));
} catch (error) { console.error(error instanceof Error ? error.message : 'Quote read failed'); process.exitCode=1; }
