import { describe, it, expect } from 'vitest';
import { detectFileType, getFileExtension } from '@/utils/fileTypes';

describe('fileTypes', () => {
  describe('getFileExtension', () => {
    it('extracts extension from simple filename', () => {
      expect(getFileExtension('file.txt')).toBe('txt');
    });

    it('extracts extension from path with forward slashes', () => {
      expect(getFileExtension('/path/to/file.py')).toBe('py');
    });

    it('extracts extension from path with backslashes', () => {
      expect(getFileExtension('C:\\Users\\file.cpp')).toBe('cpp');
    });

    it('returns empty string for files without extension', () => {
      expect(getFileExtension('Makefile')).toBe('');
    });

    it('handles multiple dots correctly', () => {
      expect(getFileExtension('file.test.ts')).toBe('ts');
    });
  });

  describe('detectFileType - text files', () => {
    // Plain text
    const plainTextExtensions = ['txt', 'text', 'log', 'logs'];
    plainTextExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // Markdown
    const markdownExtensions = ['md', 'markdown', 'mdx', 'rmd'];
    markdownExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // Data formats
    const dataFormatExtensions = [
      'json',
      'jsonc',
      'json5',
      'jsonl',
      'ndjson',
      'xml',
      'xsl',
      'xslt',
      'xsd',
      'dtd',
      'csv',
      'tsv',
      'yaml',
      'yml',
      'toml',
      'ini',
      'cfg',
      'conf',
      'config',
      'properties',
      'env',
      'dotenv',
    ];
    dataFormatExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // Web technologies
    const webExtensions = [
      'html',
      'htm',
      'xhtml',
      'css',
      'scss',
      'sass',
      'less',
      'styl',
      'stylus',
      'js',
      'mjs',
      'cjs',
      'cts',
      'tsx',
      'jsx',
      'vue',
      'svelte',
      'astro',
      'php',
      'phtml',
      'twig',
      'blade',
      'ejs',
      'erb',
      'hbs',
      'handlebars',
      'mustache',
      'pug',
      'jade',
      'haml',
      'slim',
    ];
    webExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // TypeScript files (.ts/.mts) - context-aware detection
    describe('TypeScript vs video detection (.ts/.mts)', () => {
      // === TypeScript by directory ===
      it('detects .ts in /src/ as text', () => {
        expect(detectFileType('/project/src/index.ts').category).toBe('text');
      });

      it('detects .mts in /src/ as text', () => {
        expect(detectFileType('/project/src/module.mts').category).toBe('text');
      });

      it('detects .ts in /components/ as text', () => {
        expect(detectFileType('C:\\app\\components\\Button.ts').category).toBe('text');
      });

      it('detects .ts in /hooks/ as text', () => {
        expect(detectFileType('/app/hooks/useAuth.ts').category).toBe('text');
      });

      it('detects .ts in /utils/ as text', () => {
        expect(detectFileType('/app/utils/helpers.ts').category).toBe('text');
      });

      it('detects .ts in /node_modules/ as text', () => {
        expect(detectFileType('/project/node_modules/pkg/index.ts').category).toBe('text');
      });

      it('detects .ts in /packages/ as text', () => {
        expect(detectFileType('/monorepo/packages/core/index.ts').category).toBe('text');
      });

      it('detects .ts in /features/ as text', () => {
        expect(detectFileType('/app/features/auth/login.ts').category).toBe('text');
      });

      // === TypeScript by filename pattern ===
      it('detects .spec.ts as text', () => {
        expect(detectFileType('component.spec.ts').category).toBe('text');
      });

      it('detects .test.ts as text', () => {
        expect(detectFileType('utils.test.ts').category).toBe('text');
      });

      it('detects .d.ts as text', () => {
        expect(detectFileType('types.d.ts').category).toBe('text');
      });

      it('detects .d.mts as text', () => {
        expect(detectFileType('module.d.mts').category).toBe('text');
      });

      it('detects .stories.ts as text', () => {
        expect(detectFileType('Button.stories.ts').category).toBe('text');
      });

      it('detects .mock.ts as text', () => {
        expect(detectFileType('api.mock.ts').category).toBe('text');
      });

      // === TypeScript by naming convention ===
      it('detects PascalCase .ts as text (Component.ts)', () => {
        expect(detectFileType('Component.ts').category).toBe('text');
      });

      it('detects PascalCase .mts as text (Module.mts)', () => {
        expect(detectFileType('Module.mts').category).toBe('text');
      });

      it('detects useHook.ts as text', () => {
        expect(detectFileType('useAuth.ts').category).toBe('text');
      });

      it('detects index.ts as text', () => {
        expect(detectFileType('index.ts').category).toBe('text');
      });

      it('detects config.ts as text', () => {
        expect(detectFileType('config.ts').category).toBe('text');
      });

      it('detects _partial.ts as text', () => {
        expect(detectFileType('_helpers.ts').category).toBe('text');
      });

      // === Video by directory ===
      it('detects .ts in /videos/ as video', () => {
        expect(detectFileType('/media/videos/recording.ts').category).toBe('video');
      });

      it('detects .mts in /movies/ as video', () => {
        expect(detectFileType('D:\\Movies\\film.mts').category).toBe('video');
      });

      it('detects .ts in /recordings/ as video', () => {
        expect(detectFileType('/home/user/recordings/capture.ts').category).toBe('video');
      });

      it('detects .mts in /DCIM/ as video (camera folder)', () => {
        expect(detectFileType('/sdcard/DCIM/Camera/video.mts').category).toBe('video');
      });

      it('detects .mts in /AVCHD/ as video', () => {
        expect(detectFileType('E:\\PRIVATE\\AVCHD\\BDMV\\STREAM\\00001.mts').category).toBe('video');
      });

      it('detects .ts in /footage/ as video', () => {
        expect(detectFileType('/projects/footage/scene1.ts').category).toBe('video');
      });

      // === Video by filename pattern ===
      it('detects VID_001.ts as video', () => {
        expect(detectFileType('VID_001.ts').category).toBe('video');
      });

      it('detects MOV_1234.mts as video', () => {
        expect(detectFileType('MOV_1234.mts').category).toBe('video');
      });

      it('detects MVI_0001.mts as video (camera naming)', () => {
        expect(detectFileType('MVI_0001.mts').category).toBe('video');
      });

      it('detects 00001.mts as video (segment file)', () => {
        expect(detectFileType('00001.mts').category).toBe('video');
      });

      it('detects numbered .ts as video (001.ts)', () => {
        expect(detectFileType('001.ts').category).toBe('video');
      });

      // === Default behavior ===
      it('defaults to text for ambiguous .ts path', () => {
        expect(detectFileType('file.ts').category).toBe('text');
      });

      it('defaults to text for ambiguous .mts path', () => {
        expect(detectFileType('module.mts').category).toBe('text');
      });
    });

    // Systems programming
    const systemsExtensions = [
      'c',
      'h',
      'cpp',
      'cxx',
      'cc',
      'c++',
      'hpp',
      'hxx',
      'hh',
      'h++',
      'ino',
      'rs',
      'go',
      'zig',
      'nim',
      'v',
      'd',
      'di',
    ];
    systemsExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // JVM languages
    const jvmExtensions = [
      'java',
      'kt',
      'kts',
      'scala',
      'sc',
      'groovy',
      'gradle',
      'clj',
      'cljs',
      'cljc',
      'edn',
    ];
    jvmExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // .NET
    const dotnetExtensions = ['cs', 'csx', 'fs', 'fsx', 'fsi', 'vb', 'vbs'];
    dotnetExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // Scripting languages
    const scriptingExtensions = [
      'py',
      'pyw',
      'pyi',
      'pyx',
      'pxd',
      'pxi',
      'rpy',
      'cython',
      'rb',
      'rbw',
      'rake',
      'gemspec',
      'podspec',
      'thor',
      'jbuilder',
      'perl',
      'pl',
      'pm',
      'pod',
      't',
      'lua',
      'tcl',
      'tk',
      'awk',
      'sed',
    ];
    scriptingExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // Shell
    const shellExtensions = [
      'sh',
      'bash',
      'zsh',
      'fish',
      'ksh',
      'csh',
      'tcsh',
      'ps1',
      'psm1',
      'psd1',
      'bat',
      'cmd',
      'btm',
    ];
    shellExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // Functional languages
    const functionalExtensions = [
      'hs',
      'lhs',
      'elm',
      'ml',
      'mli',
      'mll',
      'mly',
      'ocaml',
      'erl',
      'hrl',
      'ex',
      'exs',
      'eex',
      'heex',
      'leex',
      'sml',
      'sig',
      'fun',
      'f90',
      'f95',
      'f03',
      'f08',
      'for',
      'ftn',
      'fpp',
      'lisp',
      'lsp',
      'cl',
      'el',
      'scm',
      'ss',
      'rkt',
    ];
    functionalExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // Apple
    const appleExtensions = ['swift', 'm', 'mm'];
    appleExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // Mobile/Cross-platform
    const mobileExtensions = ['dart', 'flutter'];
    mobileExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // Database
    const databaseExtensions = ['sql', 'mysql', 'pgsql', 'plsql', 'tsql', 'psql', 'hql', 'cql'];
    databaseExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // DevOps/Infrastructure
    const devopsExtensions = [
      'dockerfile',
      'containerfile',
      'tf',
      'tfvars',
      'hcl',
      'nomad',
      'vagrantfile',
      'ansible',
    ];
    devopsExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // Build/Package
    const buildExtensions = [
      'cmake',
      'make',
      'makefile',
      'mk',
      'mak',
      'ninja',
      'gyp',
      'gypi',
      'bazel',
      'buck',
      'pants',
      'sbt',
      'maven',
      'ant',
      'cabal',
      'stack',
      'cargo',
      'mix',
      'rebar',
    ];
    buildExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // Documentation
    const docExtensions = [
      'rst',
      'rest',
      'adoc',
      'asciidoc',
      'asc',
      'org',
      'tex',
      'latex',
      'ltx',
      'sty',
      'cls',
      'bib',
      'bibtex',
      'man',
      'mdoc',
    ];
    docExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // Misc programming
    const miscProgrammingExtensions = [
      'r',
      'rdata',
      'julia',
      'jl',
      'matlab',
      'octave',
      'cobol',
      'cob',
      'cbl',
      'ada',
      'adb',
      'ads',
      'pas',
      'pp',
      'dpr',
      'lpr',
      'prolog',
      'pro',
      'p',
      'forth',
      'fth',
      '4th',
      'factor',
      'io',
      'red',
      'reds',
      'rebol',
      'reb',
      'hx',
      'hxml',
      'nix',
      'dhall',
      'jsonnet',
      'libsonnet',
      'pkl',
      'cue',
      'rego',
      'wasm',
      'wat',
    ];
    miscProgrammingExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // Game dev
    const gameDevExtensions = ['gd', 'gdscript', 'unity', 'shader', 'glsl', 'hlsl', 'cg', 'fx'];
    gameDevExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // Assembly
    const assemblyExtensions = ['asm', 's', 'S', 'nasm', 'masm', 'yasm'];
    assemblyExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // Config/RC files
    const configExtensions = [
      'rc',
      'editorconfig',
      'gitconfig',
      'gitignore',
      'gitattributes',
      'gitmodules',
      'npmrc',
      'nvmrc',
      'yarnrc',
      'babelrc',
      'eslintrc',
      'prettierrc',
      'stylelintrc',
      'browserslistrc',
      'huskyrc',
      'lintstagedrc',
    ];
    configExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });

    // Misc
    // Note: 'svg' is excluded as it's categorized as image
    const miscExtensions = [
      'graphql',
      'gql',
      'proto',
      'protobuf',
      'thrift',
      'avsc',
      'avdl',
      'fbs',
      'capnp',
      'idl',
      'webidl',
      'wsdl',
      'diff',
      'patch',
      'applescript',
      'scpt',
      'vimrc',
      'vim',
      'emacs',
      'ahk',
      'au3',
    ];
    miscExtensions.forEach((ext) => {
      it(`detects .${ext} as text`, () => {
        expect(detectFileType(`file.${ext}`).category).toBe('text');
      });
    });
  });

  describe('detectFileType - returns correct extension', () => {
    const testCases: Array<{ file: string; expectedExt: string }> = [
      { file: 'script.py', expectedExt: 'py' },
      { file: 'main.cpp', expectedExt: 'cpp' },
      { file: 'App.tsx', expectedExt: 'tsx' },
      { file: 'config.yaml', expectedExt: 'yaml' },
      { file: 'Dockerfile.dockerfile', expectedExt: 'dockerfile' },
      { file: 'query.sql', expectedExt: 'sql' },
      { file: 'Main.java', expectedExt: 'java' },
      { file: 'app.rs', expectedExt: 'rs' },
      { file: 'main.go', expectedExt: 'go' },
      { file: 'index.html', expectedExt: 'html' },
      { file: 'styles.scss', expectedExt: 'scss' },
      { file: 'Component.vue', expectedExt: 'vue' },
      { file: 'Page.svelte', expectedExt: 'svelte' },
      { file: 'shader.glsl', expectedExt: 'glsl' },
      { file: 'main.hs', expectedExt: 'hs' },
      { file: 'app.ex', expectedExt: 'ex' },
      { file: 'main.kt', expectedExt: 'kt' },
      { file: 'Program.cs', expectedExt: 'cs' },
      { file: 'script.rb', expectedExt: 'rb' },
      { file: 'main.swift', expectedExt: 'swift' },
    ];

    testCases.forEach(({ file, expectedExt }) => {
      it(`returns extension "${expectedExt}" for ${file}`, () => {
        const result = detectFileType(file);
        expect(result.extension).toBe(expectedExt);
      });
    });
  });

  describe('detectFileType - other categories', () => {
    it('detects image files', () => {
      expect(detectFileType('photo.jpg').category).toBe('image');
      expect(detectFileType('icon.png').category).toBe('image');
      expect(detectFileType('logo.svg').category).toBe('image');
    });

    it('detects audio files', () => {
      expect(detectFileType('song.mp3').category).toBe('audio');
      expect(detectFileType('audio.wav').category).toBe('audio');
      expect(detectFileType('music.flac').category).toBe('audio');
    });

    it('detects video files', () => {
      expect(detectFileType('movie.mp4').category).toBe('video');
      expect(detectFileType('clip.webm').category).toBe('video');
      expect(detectFileType('video.mkv').category).toBe('video');
    });

    it('detects PDF files', () => {
      expect(detectFileType('document.pdf').category).toBe('pdf');
    });

    it('detects document files', () => {
      expect(detectFileType('report.docx').category).toBe('document');
      expect(detectFileType('spreadsheet.xlsx').category).toBe('document');
      expect(detectFileType('presentation.pptx').category).toBe('document');
    });

    it('detects ebook files', () => {
      expect(detectFileType('book.epub').category).toBe('ebook');
      expect(detectFileType('book.mobi').category).toBe('ebook');
    });

    it('returns unknown for unrecognized extensions', () => {
      expect(detectFileType('file.xyz').category).toBe('unknown');
      expect(detectFileType('data.bin').category).toBe('unknown');
    });
  });

  describe('case insensitivity', () => {
    it('handles uppercase extensions', () => {
      expect(detectFileType('FILE.PY').category).toBe('text');
      expect(detectFileType('CODE.CPP').category).toBe('text');
      expect(detectFileType('IMAGE.JPG').category).toBe('image');
    });

    it('handles mixed case extensions', () => {
      expect(detectFileType('script.Py').category).toBe('text');
      expect(detectFileType('style.CsS').category).toBe('text');
    });
  });
});
