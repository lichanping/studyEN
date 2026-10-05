import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { WORD_REVIEW_SOURCES } from '../yang-kaidi-word-review-core.mjs';

const root = path.resolve(process.argv[2] || '.');
const bookDates = Object.fromEntries(await Promise.all(WORD_REVIEW_SOURCES.map(async (source) => {
    const files = await readdir(path.join(root, source.directory), { withFileTypes: true });
    const dates = files
        .filter((file) => file.isFile() && /^\d{4}-\d{2}-\d{2}\.txt$/.test(file.name))
        .map((file) => file.name.slice(0, -4))
        .sort();
    return [source.sourceId, dates];
})));

await writeFile(
    path.join(root, 'yang-kaidi-word-review-books.mjs'),
    `export const WORD_REVIEW_BOOK_DATES = ${JSON.stringify(bookDates, null, 2)};\n`,
    'utf8'
);
console.log(`Yang Kaidi word manifest generated: ${Object.values(bookDates).reduce((total, dates) => total + dates.length, 0)} books`);
