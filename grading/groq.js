// Normalize the provider response so both providers use the same rubric validator.
function groqFetch(fetchImpl, model, ids, rubricVersion) {
  const item = { type: 'object', additionalProperties: false,
    properties: { id: { type: 'string', enum: ids }, rubricVersion: { type: 'string', enum: [rubricVersion] },
      criteria: { type: 'array', items: { type: 'integer', enum: [0,1] }, minItems: 4, maxItems: 4 },
      points: { type: 'integer', minimum: 0, maximum: 4 }, feedback: { type: 'string' },
      evidence: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 } },
    required: ['id','rubricVersion','criteria','points','feedback','evidence'] };
  return async (_url, options) => {
    const prompt = JSON.parse(options.body).contents[0].parts[0].text;
    const response = await fetchImpl('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + options.headers['x-goog-api-key'] },
      signal: options.signal, body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }],
        reasoning_effort: 'low', max_completion_tokens: 4096,
        response_format: { type: 'json_schema', json_schema: { name: 'assessment_grades', strict: true,
          schema: { type: 'object', additionalProperties: false, properties: { grades: { type: 'array', items: item, minItems: ids.length, maxItems: ids.length } }, required: ['grades'] } } } }) });
    return { ok: response.ok, status: response.status, json: async () => {
      const data = await response.json();
      if (!response.ok) return {}; // Never expose raw provider errors or credentials.
      return { candidates: [{ content: { parts: [{ text: data.choices?.[0]?.message?.content || '' }] } }] };
    } };
  };
}
module.exports = { groqFetch };
