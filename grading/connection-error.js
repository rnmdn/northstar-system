// Log diagnostic categories only: raw upstream errors can contain credentials.
function connectionCode(error) {
  const allowed = ['ENOTFOUND','EAI_AGAIN','ECONNREFUSED','ECONNRESET','ETIMEDOUT',
    'ENETUNREACH','EHOSTUNREACH','UND_ERR_SOCKET','UND_ERR_CONNECT_TIMEOUT',
    'ERR_INVALID_CHAR','ERR_INVALID_HTTP_TOKEN','CERT_HAS_EXPIRED',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE','DEPTH_ZERO_SELF_SIGNED_CERT','TimeoutError','AbortError'];
  const candidates = [error?.cause?.code, error?.code, error?.name,
    ...(error?.cause?.errors || []).map(item => item.code)];
  const codes = candidates.filter(code => allowed.includes(code) || /^ERR_SSL_[A-Z0-9_]{1,60}$/.test(code || ''));
  if (process.env.NODE_ENV === 'production') console.warn('Gemini connection categories:', codes.join(',') || 'CONNECTION_FAILED');
  return codes[0] || 'CONNECTION_FAILED';
}
module.exports = { connectionCode };
