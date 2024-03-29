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
                // Filter out if either "单词" or "释意" is null or empty string
                if (englishWord && translation) {
                    data.push({"单词": englishWord, "释意": translation});
                } else {
                    console.log("Translation missing or empty for English word:", englishWord);
                }
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
        for (let i = 0; i < 4; i++) {
            let randomWrongWord;
            do {
                randomWrongWord = this.getRandomElement(otherWords)["释意"];
            } while (wrongOptions.includes(randomWrongWord));

            wrongOptions.push(randomWrongWord);
        }
        // Combine correct and wrong options
        const options = [correctOption, ...wrongOptions];
        const shuffledOptions = this.shuffleArray(options);
        const correctIndex = shuffledOptions.indexOf(correctOption);
        return {currentEnglishWord, options: shuffledOptions, correctIndex};
    }
}

export function play_audio() {
    const englishWordTextBox = document.getElementById('englishWordTextBox')
    const audioIcon = document.getElementById("playWord")
    englishWordTextBox.classList.add('playing-animation');
    // Remove the shake animation class after the animation ends
    setTimeout(function () {
        englishWordTextBox.classList.remove('playing-animation');
    }, 500);
    // Add playing animation class to the audio icon
    audioIcon.classList.add('playing-animation');
    // Remove playing animation class after a delay (adjust as needed)
    setTimeout(function () {
        audioIcon.classList.remove('playing-animation');
    }, 2000); // Remove the class after 2 seconds (adjust as needed)
    // Play corresponding sound if available
    const soundFileName = englishWordTextBox.value.trim().toLowerCase() + '.mp3';
    const soundFilePath = `sounds/${soundFileName}`;
    const audio = new Audio(soundFilePath);
    audio.onerror = () => {
        const msg = `Sound of '${englishWordTextBox.value.trim()}' failed to load!`;
        console.error(msg);
        displayToast(msg);
    };
    audio.play();
}

export async function renderQuestion() {
    const fileName = document.getElementById("file").value + ".txt";
    const optionsLine = document.getElementById("options-line");
    try {
        const globalWordsData = await GetWordsFromTxt.readText(fileName);
        const {currentEnglishWord, options, correctIndex} = GetWordsFromTxt.generateOptions(globalWordsData);
        let englishWordInput = document.getElementById("englishWordTextBox");
        englishWordInput.value = currentEnglishWord;
        // Clear previous options
        optionsLine.innerHTML = '';

        for (let i = 0; i < options.length; i++) {
            const banner = document.createElement("div");
            banner.classList.add("banner");
            banner.id = `banner${i + 1}`;
            // Truncate the option text if it exceeds 30 characters
            const truncatedOption = options[i].length > 30 ? options[i].substring(0, 28) + '..' : options[i];
            banner.innerText = truncatedOption;
            optionsLine.appendChild(banner);
        }
        // Store correctIndex value in the hidden input
        document.getElementById("correctIndexValue").value = correctIndex;
        play_audio();
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

function displayToast(message) {
    // Create a toast element
    const toast = document.createElement('div');
    toast.classList.add('toast');
    toast.textContent = message;

    // Append toast to the document body
    document.body.appendChild(toast);

    // Automatically remove toast after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}