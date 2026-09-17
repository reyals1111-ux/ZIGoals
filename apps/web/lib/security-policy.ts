/** Web Crypto only: runs in Next's edge middleware and workerd. */
export function securityPolicy(development: boolean, https: boolean) {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    // React progress bars use style attributes. This exception never authorizes scripts.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:", "font-src 'self'",
    `connect-src 'self' https://testnet-api.zigchain.com https://testnet-rpc.zigchain.com https://api.zigchain.com${development ? " ws://127.0.0.1:3100" : ""}`,
    "object-src 'none'", "frame-src 'none'", "frame-ancestors 'none'", "base-uri 'none'", "form-action 'self'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  return { nonce, csp };
}
