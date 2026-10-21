import type {ReactNode} from 'react';

/**
 * Critique round 2 (L5c): "How this is read", one tap down — the pattern of native staking's "How this is computed". The
 * card says one plain sentence; the developer words behind it (a contract's method name, the units a raw number is read
 * in, the message type a wallet shows) are kept here, closed by default, so nothing is removed and nothing technical sits
 * on the surface. A native <details>: keyboard and screen readers get it for free, and nothing animates but the chevron's
 * turn, which reduced motion and Motion Off stop (earn.css).
 */
export function HowRead({children, title = 'How this is read'}: {children: ReactNode; title?: string}) {
  return <details className="earn-formula earn-how-read" data-how-read="">
    <summary>{title}</summary>
    <div>{children}</div>
  </details>;
}
