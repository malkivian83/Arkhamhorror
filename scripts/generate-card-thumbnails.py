"""Generate local hand thumbnails from the checked-in originals (requires Pillow)."""

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

root = Path(__file__).resolve().parents[1]
public = root / 'apps/web/public'
manifest = json.loads((root / 'apps/web/src/game/cardImageManifest.json').read_text())
files = []
for language, cards in manifest.items():
    for art, source in cards.items():
        destination = f'/local-assets/cards/{language}/thumbs/{art}.webp'
        target = public / destination.lstrip('/')
        target.parent.mkdir(parents=True, exist_ok=True)
        original = public / source.lstrip('/')
        with Image.open(original) as image:
            image = ImageOps.exif_transpose(image).convert('RGB')
            height = round(image.height * 192 / image.width)
            image = image.resize((192, height), Image.Resampling.LANCZOS)
            image = image.filter(ImageFilter.UnsharpMask(radius=0.6, percent=110, threshold=3))
            image.save(target, 'WEBP', quality=92, method=6)
        files.append({
            'source': source,
            'sourceSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
            'path': destination,
            'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
        })
inventory = {'width': 192, 'files': files}
(root / 'docs-proyecto/evidencias/miniaturas-cartas.json').write_text(
    json.dumps(inventory, indent=2) + '\n', encoding='utf-8'
)
print(json.dumps({'thumbnails': len(files), 'bytes': sum((public / f['path'].lstrip('/')).stat().st_size for f in files)}))
