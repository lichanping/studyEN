class GetWordsFromTxt {
    static async readText(fileName) {
        const filePath = `user_data/${fileName}`; // Assuming the files are in a 'user_data' directory in your web server
        const response = await fetch(filePath);
        const text = await response.text();
        const data = [];
        const pattern = /^([a-zA-Z\s\-\/.]+)\s*(.*)$/;

        text.split('\n').forEach(line => {
            const match = line.trim().match(pattern);
            if (match) {
                const [_, englishWord, translation] = match;
                data.push({"单词": englishWord, "释意": translation});
            }
        });

        return data;
    }

    static shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    static getRandomElement(array) {
        const shuffledArray = this.shuffleArray(array);
        return shuffledArray[0];
    }

    static generateOptions(globalWordsData) {
        const randomElement = this.getRandomElement(globalWordsData);
        const currentEnglishWord = randomElement["单词"];
        const correctOption = randomElement["释意"];
        const otherWords = globalWordsData.filter(word => word !== randomElement);
        const wrongOptions = [];
        for (let i = 0; i < 2; i++) {
            const randomWrongWord = this.getRandomElement(otherWords)["释意"];
            wrongOptions.push(randomWrongWord);
        }
        const options = [correctOption, ...wrongOptions];
        const shuffledOptions = this.shuffleArray(options);
        const correctIndex = shuffledOptions.indexOf(correctOption);
        return {currentEnglishWord, options: shuffledOptions, correctIndex};
    }
}

export async function renderQuestion() {
    const fileName = document.getElementById("file").value + ".txt";
    try {
        const globalWordsData = await GetWordsFromTxt.readText(fileName);
        const {currentEnglishWord, options, correctIndex} = GetWordsFromTxt.generateOptions(globalWordsData);
        let englishWordInput = document.getElementById("englishWordTextBox");
        englishWordInput.value = currentEnglishWord;
        const bannerElements = document.querySelectorAll('.banner');
        options.forEach((option, index) => {
            if (option.length > 25) {
                // Truncate the text if it exceeds 25 characters
                bannerElements[index].innerText = option.substring(0, 20) + '...';
            } else {
                // Otherwise, display the full text
                bannerElements[index].innerText = option;
            }
        });
        // Store correctIndex value in the hidden input
        document.getElementById("correctIndexValue").value = correctIndex;
        return {currentEnglishWord, options, correctIndex};
    } catch (error) {
        console.error("Error:", error);
        return null;
    }
}

export function compareOptionIndex(event) {
    const selectedOptionIndex = Array.from(event.target.parentNode.children).indexOf(event.target);
    const correctIndex = parseInt(document.getElementById('correctIndexValue').value);
    const englishWordTextBox = document.getElementById('englishWordTextBox');
    const english = englishWordTextBox.value;
    const score = parseInt(document.getElementById('score').innerText);
    const errorCount = parseInt(document.getElementById('errorCount').innerText);
    const correctOption = document.querySelectorAll('.banner')[correctIndex].innerText;
    document.querySelectorAll('.banner')[correctIndex].style.backgroundColor = 'lightgreen';
    const incorrectWordsSpan = document.getElementById('incorrectWords');

    // Compare the selected option index with the correct index
    if (selectedOptionIndex === correctIndex) {
        englishWordTextBox.value = english + " " + event.target.innerText;
        englishWordTextBox.style.backgroundColor = 'lightgreen';
        document.getElementById('score').innerText = score + 1

    } else {
        incorrectWordsSpan.innerText += `${english} ${correctOption}\n`;
        document.getElementById('errorCount').innerText = errorCount + 1;
        englishWordTextBox.style.backgroundColor = 'red';
    }

    // Automatically perform action of renderQuestion after 3 seconds
    englishWordTextBox.value = english + " " + correctOption;
    setTimeout(() => {
        renderQuestion();
        // Reset the background color of the English word text box after 3 seconds
        document.getElementById('englishWordTextBox').style.backgroundColor = '';
        document.querySelectorAll('.banner')[correctIndex].style.backgroundColor = '#f0f0f0';
    }, 3000);
}
