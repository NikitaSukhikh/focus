# -*- mode: python ; coding: utf-8 -*-


import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules, collect_all

# Collect app data files but exclude venv and other unnecessary directories
def collect_app_files():
    datas = []
    exclude_dirs = {'__pycache__', 'venv', 'backend', '.pytest_cache', 'tests'}

    for root, dirs, files in os.walk('app'):
        # Remove excluded directories from dirs list in-place
        dirs[:] = [d for d in dirs if d not in exclude_dirs]

        for file in files:
            if not file.endswith(('.pyc', '.pyo')):
                src = os.path.join(root, file)
                dst = root
                datas.append((src, dst))

    return datas

# Collect aiosqlite and its dependencies
aiosqlite_datas, aiosqlite_binaries, aiosqlite_hiddenimports = collect_all('aiosqlite')

# Collect file processing libraries
pil_datas, pil_binaries, pil_hiddenimports = collect_all('PIL')
openpyxl_datas, openpyxl_binaries, openpyxl_hiddenimports = collect_all('openpyxl')
ebooklib_datas, ebooklib_binaries, ebooklib_hiddenimports = collect_all('ebooklib')
lxml_datas, lxml_binaries, lxml_hiddenimports = collect_all('lxml')
pandas_datas, pandas_binaries, pandas_hiddenimports = collect_all('pandas')
mutagen_datas, mutagen_binaries, mutagen_hiddenimports = collect_all('mutagen')

a = Analysis(
    ['app\\main.py'],
    pathex=[],
    binaries=aiosqlite_binaries + pil_binaries + openpyxl_binaries + ebooklib_binaries + lxml_binaries + pandas_binaries + mutagen_binaries,
    datas=collect_app_files() + aiosqlite_datas + pil_datas + openpyxl_datas + ebooklib_datas + lxml_datas + pandas_datas + mutagen_datas,
    hiddenimports=[
        # Database
        'aiosqlite',
        'aiosqlite.core',
        'aiosqlite.cursor',
        'aiosqlite.context',
        'sqlalchemy.dialects.sqlite.aiosqlite',
        'greenlet',
        # Image processing
        'PIL',
        'PIL.Image',
        'PIL.ImageDraw',
        'PIL.ImageFont',
        'pillow_heif',
        # Document processing
        'openpyxl',
        'openpyxl.cell',
        'openpyxl.styles',
        'ebooklib',
        'ebooklib.epub',
        'lxml',
        'lxml.etree',
        'lxml.html',
        # Data processing
        'pandas',
        'numpy',
        # Audio processing
        'mutagen',
        'mutagen.mp3',
        'mutagen.mp4',
        'mutagen.flac',
        'mutagen.wave',
    ] + aiosqlite_hiddenimports + pil_hiddenimports + openpyxl_hiddenimports + ebooklib_hiddenimports + lxml_hiddenimports + pandas_hiddenimports + mutagen_hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'pandas.tests',
        'numpy.tests',
        'pytest',
        'pytest_asyncio',
        'pytest_cov',
        'black',
        'flake8',
        'mypy',
        '_pytest',
        'py._code',
    ],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='Focus',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='Focus',
)
