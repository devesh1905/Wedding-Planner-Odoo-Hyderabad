/**
 * Assistant keys in the order to try them: AI_API_KEY first, then AI_API_KEY_BACKUP.
 * When a call fails with a quota, auth or server error, the next key is tried.
 */
export const aiKeys = () => [process.env.AI_API_KEY, process.env.AI_API_KEY_BACKUP].filter((k): k is string => Boolean(k));

/** Worth retrying with another key: rate limit / quota (429), a rejected key (401, 403) or a provider outage (5xx). */
export const shouldTryNextKey = (status: number) => status === 429 || status === 401 || status === 403 || status >= 500;
