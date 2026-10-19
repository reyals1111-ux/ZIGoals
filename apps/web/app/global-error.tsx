'use client';

/**
 * Session AF Gate C (ADR-028 H135): when the root itself fails (seen in WebKit when a navigation aborts the page's own
 * route files), say so calmly instead of the framework's built-in screen, which writes its styles as raw HTML that the
 * app's Trusted Types policy refuses — the refusal was the only error the page then reported. This screen draws its own
 * document with plain elements and style attributes only (no raw HTML, no global styles: Next renders it without the
 * root layout), mirrors app/app/error.tsx's words, and sends nothing anywhere.
 */
const page: React.CSSProperties = {margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px 16px', boxSizing: 'border-box', background: '#020918', color: '#eef2ff', font: '16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif'};
const card: React.CSSProperties = {maxWidth: 480, padding: '28px 24px', borderRadius: 20, border: '1px solid rgba(146, 115, 255, 0.45)', background: 'rgba(13, 18, 48, 0.92)', textAlign: 'center'};
const button: React.CSSProperties = {minHeight: 44, padding: '0 20px', borderRadius: 999, border: 0, background: '#9273ff', color: '#05071a', font: 'inherit', fontWeight: 650, cursor: 'pointer'};
const link: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 20px', borderRadius: 999, border: '1px solid rgba(238, 242, 255, 0.4)', color: '#eef2ff', textDecoration: 'none'};

export default function GlobalError({retry}: {error: Error & {digest?: string}; retry: () => void}) {
  return <html lang="en">
    <body style={page}>
      <title>Something went wrong · ZIGoals Alpha</title>
      <main role="alert" aria-labelledby="global-error-title" style={card}>
        <h1 id="global-error-title" style={{margin: '0 0 8px', fontSize: 22, lineHeight: 1.25}}>This page could not be shown.</h1>
        <p style={{margin: '0 0 20px'}}>Something went wrong while drawing it. Nothing was changed or lost: your records stay on this device.</p>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center'}}>
          <button type="button" style={button} onClick={() => retry()}>Try again</button>
          <a href="/app" style={link}>Go to Today</a>
        </div>
      </main>
    </body>
  </html>;
}
