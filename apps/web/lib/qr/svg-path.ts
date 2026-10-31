/**
 * One SVG path for a QR matrix: each horizontal run of dark modules in a row becomes one rectangle, offset by the quiet
 * zone. Coordinates are in modules, so the path is drawn in a viewBox of (size + 2 * quiet) modules.
 */
export function qrSvgPath(modules: boolean[][], quiet = 4): string {
  let d = '';
  modules.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      const start = x;
      while (x + 1 < row.length && row[x + 1]) x++;
      d += `M${start + quiet} ${y + quiet}h${x - start + 1}v1h-${x - start + 1}z`;
    }
  });
  return d;
}
