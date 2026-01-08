# -*- mode: python ; coding: utf-8 -*-


import os
from PyInstaller.utils.hooks import collect_data_files

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

a = Analysis(
    ['app\\main.py'],
    pathex=[],
    binaries=[],
    datas=collect_app_files(),
    hiddenimports=[
        'aiosqlite',
        'sqlalchemy.dialects.sqlite.aiosqlite',
        'greenlet',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
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
