const fs = require('fs-extra');
const archiver = require('archiver');
const path = require('path');

// Configuration
const DIST_DIR = path.join(__dirname, 'dist');
const ZIP_FILE = path.join(__dirname, 'extension.zip');

// Files to include (Allowlist approach is safer than blocklist)
const FILES_TO_COPY = [
    'manifest.json',
    'popup.html',
    'popup.js',
    'background.js',
    'content.js',
    'content.css',
    'icon.png'
    // Add any other icon files here (e.g., 'icon16.png', 'icon48.png')
];

async function build() {
    try {
        console.log('🧹 Cleaning up...');
        await fs.remove(DIST_DIR);
        await fs.remove(ZIP_FILE);
        await fs.ensureDir(DIST_DIR);

        console.log('Tb Copying files...');
        for (const file of FILES_TO_COPY) {
            if (await fs.pathExists(path.join('src',file))) {
                await fs.copy(path.join('src',file), path.join(DIST_DIR, file));
            } else {
                console.warn(`⚠️ Warning: ${file} not found! Skipping.`);
            }
        }

        console.log('📦 Zipping...');
        await zipDirectory(DIST_DIR, ZIP_FILE);

        console.log('✅ Build Complete!');
        console.log(`   📁 Unpacked: ${DIST_DIR}`);
        console.log(`   🤐 Zipped:   ${ZIP_FILE}`);

    } catch (err) {
        console.error('❌ Build Failed:', err);
    }
}

function zipDirectory(source, out) {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = fs.createWriteStream(out);

    return new Promise((resolve, reject) => {
        archive
            .directory(source, false)
            .on('error', err => reject(err))
            .pipe(stream);

        stream.on('close', () => resolve());
        archive.finalize();
    });
}

build();