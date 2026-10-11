# Contact sheet: cut a tall capture into segments of seg px and lay them side by side, scaled to maxw.
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
seg = int(sys.argv[3]) if len(sys.argv) > 3 else 1800
maxw = int(sys.argv[4]) if len(sys.argv) > 4 else 2400
top = int(sys.argv[5]) if len(sys.argv) > 5 else 0
limit = int(sys.argv[6]) if len(sys.argv) > 6 else 10**9
im = Image.open(src)
w, h = im.size
h = min(h, top + limit)
parts = [im.crop((0, y, w, min(y + seg, h))) for y in range(top, h, seg)]
sheet = Image.new('RGB', (w * len(parts) + 10 * (len(parts) - 1), seg), 'white')
for i, p in enumerate(parts): sheet.paste(p, (i * (w + 10), 0))
if sheet.width > maxw: sheet = sheet.resize((maxw, int(seg * maxw / sheet.width)))
sheet.save(out, quality=70)
print(out, sheet.size)
