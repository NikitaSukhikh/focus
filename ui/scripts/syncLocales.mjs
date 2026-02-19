import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = resolve(__dirname, '../src/i18n/locales');

const LOCALES = ['es', 'fr', 'de', 'zh-CN', 'ru'];
const mirrorEnglish = process.argv.includes('--mirror-en');

const en = JSON.parse(readFileSync(`${localesDir}/en.json`, 'utf-8'));

for (const locale of LOCALES) {
  const path = `${localesDir}/${locale}.json`;
  const existing = JSON.parse(readFileSync(path, 'utf-8'));

  // Keep locale files structurally aligned to en.json. Preserve existing translations by default.
  const updated = Object.fromEntries(
    Object.keys(en).map((key) => [key, mirrorEnglish ? en[key] : (existing[key] ?? en[key])])
  );

  writeFileSync(path, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
  console.log(`synced ${locale}.json${mirrorEnglish ? ' (mirror-en)' : ''}`);
}
