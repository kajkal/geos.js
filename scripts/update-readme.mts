import { basename, join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';


/**
 * Updates README.md:
 * - bundle size table based on generated files from ./dist
 */
void function main() {
    const ROOT_DIR = join(import.meta.dirname, '..');
    const README_FILE_PATH = join(ROOT_DIR, 'README.md');

    let readme = readFileSync(README_FILE_PATH, 'utf8');

    function updateSize(filePath: string) {
        const fileName = basename(filePath);

        const data = readFileSync(filePath);
        const gzip = gzipSync(data);

        const size = `${(data.byteLength / 1024).toFixed()} KB`;
        const gzipped = `${(gzip.byteLength / 1024).toFixed()} KB`;

        console.log(`${fileName.padEnd(17)} | ${size.padStart(7)} | ${gzipped.padStart(7)} |`);

        // update file size in README.md
        const re = new RegExp(`^\\| \`${fileName.replaceAll('.', '\\.')}\`.*$`, 'm');
        readme = readme.replace(re, `| \`${fileName}\` | ${size} | ${gzipped} |`);
    }

    updateSize(join(ROOT_DIR, './dist/umd/index.min.js'));
    updateSize(join(ROOT_DIR, './dist/geos_js.wasm'));
    updateSize(join(ROOT_DIR, './dist/umd/index-slim.min.js'));

    writeFileSync(README_FILE_PATH, readme, 'utf8');
}();
