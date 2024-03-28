const fs = require('fs');
const path = require('path');
const readline = require('readline');

class GetWordsFromTxt {
    static getSubFolderPath(subDirName = 'user_data') {
        // Function to create the destination folder if it does not exist
        const absPath = path.resolve(__dirname, subDirName);
        if (!fs.existsSync(absPath)) {
            fs.mkdirSync(absPath, {recursive: true});
        }
        return absPath;
    }

    static readText(fileName) {
        // Function to read text file and extract words and translations
        const dataFolder = GetWordsFromTxt.getSubFolderPath();
        const filePath = path.join(dataFolder, fileName);
        const data = [];
        const pattern = /^([a-zA-Z\s\-\/.]+)\s*(.*)$/;

        return new Promise((resolve, reject) => {
            const rl = readline.createInterface({
                input: fs.createReadStream(filePath),
                crlfDelay: Infinity
            });

            rl.on('line', (line) => {
                const match = line.trim().match(pattern);
                if (match) {
                    const [_, englishWord, translation] = match;
                    data.push({"单词": englishWord, "释意": translation});
                }
            });

            rl.on('close', () => {
                resolve(data);
            });

            rl.on('error', (err) => {
                reject(err);
            });
        });
    }
}

// Usage example:
const subFolderPath = GetWordsFromTxt.getSubFolderPath('user_data');
console.log('Subfolder path:', subFolderPath);
let globalWordsData; // Declare a global variable to store wordsData

GetWordsFromTxt.readText('蔡青青.txt')
    .then((wordsData) => {
        let globalWordsData = wordsData[0]; // Assign wordsData to the global variable

    })
    .catch((err) => {
        console.error('Error:', err);
    });

console.log('Words data:', globalWordsData);
