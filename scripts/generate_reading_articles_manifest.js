const fs = require("fs/promises");
const path = require("path");
const {
    ALBUM_CONFIG,
    buildArticleEntries,
} = require("../reading-articles/library.js");

async function walkFiles(dirPath) {
    const stack = [dirPath];
    const files = [];

    while (stack.length > 0) {
        const current = stack.pop();
        const dirents = await fs.readdir(current, { withFileTypes: true });
        for (const dirent of dirents) {
            if (dirent.name.startsWith(".")) continue;
            const nextPath = path.join(current, dirent.name);
            if (dirent.isDirectory()) {
                stack.push(nextPath);
            } else {
                files.push(nextPath.replace(/\\/g, "/"));
            }
        }
    }

    return files;
}

async function generateManifest() {
    const albums = [];

    for (const album of ALBUM_CONFIG) {
        const fullFolderPath = path.resolve(process.cwd(), album.folder);
        const allFiles = await walkFiles(fullFolderPath);

        const textFiles = allFiles.filter((filePath) => filePath.toLowerCase().endsWith(".txt"));
        const audioFiles = allFiles.filter((filePath) => filePath.toLowerCase().endsWith(".mp3"));

        const normalizedText = textFiles.map((filePath) => path.relative(process.cwd(), filePath).replace(/\\/g, "/"));
        const normalizedAudio = audioFiles.map((filePath) => path.relative(process.cwd(), filePath).replace(/\\/g, "/"));

        const articles = buildArticleEntries(album, {
            textFiles: normalizedText,
            audioFiles: normalizedAudio,
        });

        albums.push({
            id: album.id,
            title: album.title,
            abbr: album.abbr,
            folder: album.folder,
            count: articles.length,
            articles,
        });
    }

    const manifest = {
        generatedAt: new Date().toISOString(),
        albums,
    };

    const outputPath = path.resolve(process.cwd(), "reading-articles/manifest.json");
    await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2), "utf8");

    return manifest;
}

generateManifest()
    .then((manifest) => {
        const total = manifest.albums.reduce((acc, album) => acc + album.count, 0);
        console.log(`reading_articles_manifest generated: ${total} articles`);
    })
    .catch((error) => {
        console.error("Failed to generate reading_articles_manifest:", error);
        process.exit(1);
    });
