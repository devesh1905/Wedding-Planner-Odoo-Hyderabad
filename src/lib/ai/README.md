1. The PDF reader extracts embedded text; scanned images require manual entry.
2. Uploads are limited to 15 MB and extracted text to 100,000 characters.
3. A fixed prompt requests facts and uses null for unknown numbers.
4. Zod validates every field and rejects extra keys and negative prices.
5. Invalid JSON gets one repair attempt with validation errors included.
6. Configure AI_PROVIDER, AI_API_KEY and AI_MODEL on the server only; Gemini is the default.
7. Other services use AI_ENDPOINT and AI_PROTOCOL=chat or messages; AI_HEADERS_JSON supplies version headers.
8. Known demo text fingerprints select fixtures without a key or during a service outage; unknown documents never match.
9. Comparison preserves exclusions and unknown prices; quoted totals determine the cheapest vendor.
10. Extraction money is rupees; rupeesToPaise converts once before database storage, and planners review before saving.
