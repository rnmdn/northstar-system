// Normalize the provider response so both providers use the same rubric validator.
const cooldowns = new Map();
function groqFetch(fetchImpl, model, ids, rubricVersion) {
  const item = { type: 'object', additionalProperties: false,
    properties: { id: { type: 'string', enum: ids }, rubricVersion: { type: 'string', enum: [rubricVersion] },
      criteria: { type: 'array', items: { type: 'integer', enum: [0,1] }, minItems: 4, maxItems: 4 },
      points: { type: 'integer', minimum: 0, maximum: 4 }, feedback: { type: 'string' },
      evidence: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 } },
    required: ['id','rubricVersion','criteria','points','feedback','evidence'] };
  return async (_url, options) => {
    const bucket = require('node:crypto').createHash('sha256').update(options.headers['x-goog-api-key']).digest('hex');
    const remaining = Math.ceil(((cooldowns.get(bucket) || 0) - Date.now()) / 1000);
    if (remaining > 0) return { ok: false, status: 429, headers: new Headers({'retry-after':String(remaining)}), json: async () => ({error:{status:'RATE_LIMITED'}}) };
    const prompt = JSON.parse(options.body).contents[0].parts[0].text;
    const response = await fetchImpl('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + options.headers['x-goog-api-key'] },
      signal: options.signal, body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }],
        reasoning_effort: 'low', max_completion_tokens: 4096,
        response_format: { type: 'json_schema', json_schema: { name: 'assessment_grades', strict: true,
          schema: { type: 'object', additionalProperties: false, properties: { grades: { type: 'array', items: item, minItems: ids.length, maxItems: ids.length } }, required: ['grades'] } } } }) });
    if (response.status === 429) cooldowns.set(bucket, Date.now() + Math.max(60, Math.min(86400, Number(response.headers?.get('retry-after')) || 60)) * 1000);
    return { ok: response.ok, status: response.status, headers: response.headers, json: async () => {
      const data = await response.json();
      if (!response.ok) { const text=data.error?.message||'';const reason=/\bTPD\b|tokens per day/i.test(text)?'DAILY_TOKEN_LIMIT':/\bTPM\b|tokens per minute/i.test(text)?'MINUTE_TOKEN_LIMIT':response.status===429?'RATE_LIMITED':'PROVIDER_REJECTED';return {error:{status:reason}}; } // Only fixed categories leave the adapter.
      return { candidates: [{ content: { parts: [{ text: data.choices?.[0]?.message?.content || '' }] } }] };
    } };
  };
}
module.exports = { groqFetch };
