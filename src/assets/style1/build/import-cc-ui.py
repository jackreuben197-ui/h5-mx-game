"""Compatibility entry: copy CC originals only. Build owns all generated atlases."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('import-cc-assets.py')), run_name='__main__')
