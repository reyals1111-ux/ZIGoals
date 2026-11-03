import {useMemo} from 'react';
import {encodeQr, type QrEcc} from '../../lib/qr/encode';
import {qrSvgPath} from '../../lib/qr/svg-path';

export type QrCodeProps = {
  /** The text to encode, e.g. a WalletConnect pairing URI. Throws (for an error boundary) past version 20-L. */
  value: string;
  /** The accessible name, e.g. "QR code to pair a wallet". */
  label: string;
  /** CSS width (number = px); the height follows. Never wider than its container. */
  size?: number | string;
  minEcc?: QrEcc;
  className?: string;
};

const QUIET = 4;

/**
 * A QR code as one inline SVG path with a 4-module quiet zone. Always black on white, whatever the theme, because
 * scanners need dark modules on a light background. Default export so it can be React.lazy-loaded.
 */
export default function QrCode({value, label, size = 240, minEcc, className}: QrCodeProps) {
  const {d, dim} = useMemo(() => {
    const qr = encodeQr(value, {minEcc});
    return {d: qrSvgPath(qr.modules, QUIET), dim: qr.size + QUIET * 2};
  }, [value, minEcc]);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={label}
      viewBox={`0 0 ${dim} ${dim}`}
      shapeRendering="crispEdges"
      className={className}
      style={{display: 'block', width: size, maxWidth: '100%', height: 'auto', aspectRatio: '1 / 1', color: '#000'}}
    >
      <rect width={dim} height={dim} fill="#fff" />
      <path d={d} fill="currentColor" />
    </svg>
  );
}
