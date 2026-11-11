"""Copy original CC images for development. Atlas generation happens only in assets:pack/build."""
from pathlib import Path
import json, shutil, sys
root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]) if len(sys.argv) > 1 else root.parent / 'h5-cc-game'
manifest = json.loads((root / 'src/assets/image-sources.json').read_text())
for target, original in manifest['ccSources'].items():
    dest = root / 'src/assets/raw' / target
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source / original, dest)
print(f"Copied {len(manifest['ccSources'])} original images; no atlas generated.")

emoji_manifest = json.loads((root / 'src/assets/emoji-sources.json').read_text())
for target, original in emoji_manifest.items():
    dest = root / 'src/assets' / target
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source / original, dest)
print(f"Copied {len(emoji_manifest)} original emoji assets; Spine atlases retained.")
