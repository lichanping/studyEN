// JavaScript code for the button click functions
export function navigateToTiyanClass() {
    window.location.href = "class-trial.html";
}

export function navigateToFormalClass() {
    // Check if the current page is learn-words.html
    if (window.location.pathname.includes("learn-words.html")) {
        const pin = prompt("Enter PIN code to proceed:");
        // Check if the entered PIN matches the expected value
        if (pin === "111") {
            // Navigate to the formal class page
            window.location.href = "index.html";
        } else {
            // Display an error message if the PIN is incorrect
            alert("Incorrect PIN. Please try again.");
        }
    } else {
        // Navigate to the formal class page directly without asking for PIN
        window.location.href = "index.html";
    }
}

export function navigateToLearnWords() {
    window.location.href = "learn-words.html";
}

export function navigateToReadClass() {
    window.location.href = "class-read.html";
}

export function checkLoginStatus() {
    const currentDate = new Date().toDateString(); // Get today's date

    // Check if the user is logged in and if the login date is today
    const storedLoginDate = localStorage.getItem('loginDate');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    if (isLoggedIn && storedLoginDate === currentDate) {
        // If logged in and the login date is today, allow the user to stay on the page
        // No action needed, user is allowed to stay on the page
    } else {
        // If not logged in or the login date is not today, redirect to login.html
        window.location.href = 'login.html';
    }
}


export function validateLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Hardcoded credentials
    const validUsername = "jx";
    const validPassword = "jx";

    const currentDate = new Date().toDateString(); // Get today's date

    // Check if user is already logged in and if login is valid for today
    const storedLoginDate = localStorage.getItem('loginDate');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    if (isLoggedIn && storedLoginDate === currentDate) {
        // If already logged in for today, skip login process
        window.location.href = 'index.html';
        return;
    }

    // Validate credentials
    if (username === validUsername && password === validPassword) {
        // Store login state and date if credentials are correct
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('loginDate', currentDate);
        window.location.href = 'index.html';
    } else {
        document.getElementById('error-message').style.display = 'block';
    }
}


export function handleReviewLateReminderClick() {
    const userName = document.getElementById("userName").value;
    const warningMessage = `尊敬的家长，您好！

今天咱们没有特定的抗遗忘学习安排，正好利用这段时间把之前学过的内容拿出来复习复习，加深印象～ 🌟`;
    copyToClipboard(warningMessage);
    showLongText(`${warningMessage}`);
}

export function handleGroupGreetingClick() {
    const teacherNameElement = document.getElementById("teacherName");
    const teacherName = teacherNameElement.options[teacherNameElement.selectedIndex].text;
    const greetingMessage = `亲爱的家长朋友，您们好！我是${teacherName}，很⾼兴您们加⼊英语快速提升集训营🎉🎉🎉，开启一段快乐、高效的"英语提升之旅"!"<br><br>        在此过程中，我会全程陪伴孩⼦进行学新和复习，也会根据学生状态调整上课节奏🐧🕙，从短暂记忆到永久记忆，从被动接收到主动参与，逐渐提高学生的英语能力。💪💪<br><br>        让我们一起努力，⻅证孩子的学习提升和蜕变吧！😉😉😉`;

    copyToClipboard(greetingMessage);
    showLongText(`${greetingMessage}`);
}

// 通过本地存储的 lx_phone 与 lx_pw 执行登录，获取并缓存 token 与 userId
export async function loginApp() {
    let phone = localStorage.getItem('lx_phone');
    let password = localStorage.getItem('lx_pw');


    if (!phone || !password) {
        alert('缺少登录凭据(lx_phone 或 lx_pw)');
        return;
    }

    try {
        const resp = await fetch('https://api.lxll.com/request/CustomerLoginByPhoneAndPassword', {
            method: 'POST',
            headers: {
                'accept': '*/*',
                'content-type': 'application/json',
                'x-ua': 'ct=1&version=5.0.6'
                // 浏览器环境下无需也无法设置 curl 中的部分受保护头(sec-fetch-*, user-agent 等)
            },
            body: JSON.stringify({
                phone,
                password,
                loginAs: ['TEACHER'],
                inviteUserId: ''
            })
        });

        if (!resp.ok) throw new Error('登录失败: ' + resp.status);
        const data = await resp.json();

        if (!data?.success) throw new Error('登录失败: 接口返回 success=false');
        const token = data?.data?.token;
        if (!token) throw new Error('登录失败: 未获取到 token');

        localStorage.setItem('x-token-c', token);

        alert('登录成功');
        return data;
    } catch (e) {
        console.error('登录错误:', e);
        alert('登录失败，请检查账号与密码');
        throw e;
    }
}

export async function viewTotalHoursClick() {
    let token = localStorage.getItem('x-token-c');
    if (!token) {
        await loginApp().catch(() => {
        });
        token = localStorage.getItem('x-token-c');
        if (!token) {
            alert('未找到 token，登录失败或未配置。');
            return;
        }
    }

    fetch('https://api.lxll.com/request/CustomerTeacherListClient', {
        method: 'POST',
        headers: {
            'accept': 'application/json, text/plain, */*',
            'content-type': 'application/json',
            'origin': 'https://h5.lxll.com',
            'referer': 'https://h5.lxll.com/',
            'x-token-c': token,
            'x-ua': 'ct=1&version=5.0.6',
            'x-user-id': localStorage.getItem('x-user-id') || '144620'
        },
        body: JSON.stringify({
            pageNumber: 1,
            pageSize: 100,
            whereCriteria: {studentName: ''}
        })
    })
        .then(r => {
            if (!r.ok) throw new Error('网络错误 ' + r.status);
            return r.json();
        })
        .then(data => {
            console.log('教师列表数据:', data);
            displayToast('教师列表获取成功');

            const list = Array.isArray(data?.data?.data) ? data.data.data : [];
            const anomaliesDetails = [];

            // 修改点：合并固定白名单和动态获取的白名单，并去重
            const getWhiteListFromSelect = () => {
                // 固定白名单
                const fixedWhiteList = ['陈怡睿', '胡贝妮', '俞新硕', '吴瑜鑫'];

                const selectElement = document.getElementById('userName');
                let dynamicWhiteList = [];

                if (selectElement) {
                    const options = selectElement.options;
                    for (let i = 0; i < options.length; i++) {
                        const value = options[i].value;
                        if (value && value.trim()) {
                            dynamicWhiteList.push(value.trim());
                        }
                    }
                    console.log('从select获取的白名单:', dynamicWhiteList);
                } else {
                    console.warn('未找到id为userName的select元素，仅使用固定白名单');
                }

                // 合并固定白名单和动态白名单，并去重
                const mergedWhiteList = [...new Set([...fixedWhiteList, ...dynamicWhiteList])];
                console.log('合并后的白名单:', mergedWhiteList);
                return new Set(mergedWhiteList);
            };

            const whiteList = getWhiteListFromSelect();

            const isZero = (v) => {
                const s = String(v ?? '').trim();
                const n = parseFloat(s);
                return s === '0' || (Number.isFinite(n) && n === 0);
            };

            for (const item of list) {
                const userName = (item?.userName || '').trim();
                if (!whiteList.has(userName)) continue;

                const q30 = item?.quota30;
                const q60 = item?.quota60;
                const qAcc = item?.quotaAccompany;

                const zeroFields = [];
                if (isZero(q30)) zeroFields.push('quota30');
                if (isZero(q60)) zeroFields.push('quota60');
                if (isZero(qAcc)) zeroFields.push('quotaAccompany');

                // 判定异常条件：30+60 都为 0 或陪伴课为 0
                if ((isZero(q30) && isZero(q60)) || isZero(qAcc)) {
                    anomaliesDetails.push({
                        userName,
                        quota30: q30,
                        quota60: q60,
                        quotaAccompany: qAcc,
                        zeroFields
                    });
                }
            }

            console.table(anomaliesDetails);

            const summary = {
                total: data?.data?.total ?? list.length,
                anomaliesCount: anomaliesDetails.length,
                anomalies: anomaliesDetails
            };

            showLongText(JSON.stringify(summary, null, 2));

            if (anomaliesDetails.length > 0) {
                const detailLines = anomaliesDetails.map(d =>
                    `请帮忙为${d.userName}充值：当前"30分钟剩余"为 ${d.quota30 ?? '-'}、"60分钟剩余"为 ${d.quota60 ?? '-'}，"陪练服务时长剩余"为${d.quotaAccompany ?? '-'}`
                );
                const alertMsg = `发现异常学生(${anomaliesDetails.length})：\n${detailLines.join('\n')}`;
                copyToClipboard(alertMsg);
                alert(alertMsg);
            }
        })
        .catch(async (err) => {
            console.error('获取教师列表失败:', err);

            // 检查是否是 token 失效导致的错误
            if (err.message && err.message.includes('401')) {
                console.warn('检测到 token 失效，尝试重新登录...');
                try {
                    await loginApp(); // 重新获取 login token
                    const token = localStorage.getItem('x-token-c');
                    if (token) {
                        console.log('重新登录成功，重新尝试获取教师列表...');
                        return viewTotalHoursClick(); // 重新执行剩余时长检测
                    } else {
                        console.error('重新登录失败，未获取到 token');
                    }
                } catch (loginError) {
                    console.error('重新登录时发生错误:', loginError);
                }
            }
        });
}


export function handleOpeningSpeechClick() {
    const userName = document.getElementById("userName").value;
    const teacherNameElement = document.getElementById("teacherName");
    const teacherName = teacherNameElement.options[teacherNameElement.selectedIndex].text;

    const openingSpeechMessage = `${userName}同学，你那边能听到我说话吗?从现在开始需要你保持摄像头的开启，这样能我更好地关注到你的状态，跟你多互动。(已经打开可以不说)<br><br>
下面我来做一个自我介绍，我是【李校来啦】${teacherName}，以后我就是你的词汇/阅读完型/语法的专属陪练，我会陪着你一起训练和复习，那么接下来我们就开启英语学习之旅吧!`;

    copyToClipboard(openingSpeechMessage);
    showAlert(`${openingSpeechMessage}`);
}


// Define an array of 10 sentences
const sentences = [
    "亲爱的${userName}和${userName}妈妈，自体验课开始至今，${userName}的英语快速提升之旅已画下完美句号。感谢你们的陪伴和支持，让这段学习时光充满了温暖和意义。",
    "${userName}和${userName}妈妈你们好，自体验课之日起，加上连续3天的复习，这边${userName}的英语快速提升的体验课之旅已经到这里结束了，很开心能陪伴${userName}走过这一段学习时光。",
    "亲爱的${userName}和家长，感谢你们选择了我们的体验课。在这短短的时间里，${userName}展现出了惊人的学习潜力和积极态度，我们的学习旅程已经圆满结束。",
    "${userName}和${userName}妈妈，感谢你们选择了我们的英语快速提升课程。在这短暂的时间里，${userName}展现了出色的学习能力和积极的学习态度，我们为她的成长感到骄傲。",
    "亲爱的${userName}和家长，自从体验课开始以来，我们一直见证着${userName}的成长和进步。感谢你们的信任和支持，让我们一起度过了这段难忘的学习时光。",
    "${userName}和${userName}妈妈，感谢你们选择了我们的英语快速提升课程。在这段时间里，${userName}展现了出色的学习能力和优秀的学习态度，我们期待在正式课上再次见到你们！",
    "亲爱的${userName}和家长，感谢你们的支持和信任，让我们共同度过了这段美好的学习时光。${userName}已经做得非常棒了，我们期待在正式课上继续与她共同进步。",
    "${userName}和${userName}妈妈，感谢你们选择了我们的英语快速提升课程。${userName}在这段时间里展现了出色的学习能力和积极的学习态度，我们的学习之旅已圆满结束。",
    "亲爱的${userName}和家长，感谢你们的支持和信任，让我们共同度过了这段美好的学习时光。${userName}已经做得非常出色了，我们期待在正式课上继续与她共同进步。",
    "${userName}和${userName}妈妈你们好，自体验课之日起，加上连续3天的复习，这边${userName}的英语快速提升的体验课之旅已经到这里结束了，很开心能陪伴${userName}走过这一段学习时光。期待与你踏上英语学习之旅。"
];

// Function to randomly select one sentence from the array
function getRandomSentence() {
    const userName = document.getElementById("userName").value;
    const newWord = parseInt(document.getElementById("newWord").value);
    var opt = sentences[Math.floor(Math.random() * sentences.length)];
    opt = opt + `<br>👍${userName}现在已经很棒了，已经完全把上课所学习的${newWord}个单词给吸收了。<br><br>👍十分感谢家长和${userName}的高度配合，我们正式课见哦！`
    return opt;
}

export function byeClick() {
    const userName = document.getElementById("userName").value;
    const newWord = parseInt(document.getElementById("newWord").value);
    // Get a random sentence
    const randomSentence = getRandomSentence();
    // Replace placeholders with actual values
    let message = randomSentence.replace(/\${userName}/g, userName).replace(/\${newWord}/g, newWord);
    // Add line breaks
    message = message.replace(/\n/g, '<br>');
    // Copy the message to clipboard
    copyToClipboard(message);
    // Show alert with the generated message
    showLongText(`${message}`);
}

export function handleManagementGroupTemplateClick() {
    const userName = document.getElementById("userName").value;
    const reviewTime = document.getElementById("reviewTime").value; // Get the review time from the input field

    var selectedDateTime = new Date(reviewTime);
    var hour = selectedDateTime.getHours();
    var minute = selectedDateTime.getMinutes().toString().padStart(2, '0');

    // Get the current time
    const currentTime = new Date();
    const timeDifference = Math.floor((selectedDateTime - currentTime) / 1000 / 60); // Difference in minutes, rounded down

    let outputMessage;
    if (timeDifference > 0 && timeDifference <= 30) {
        outputMessage = `【抗遗忘提醒-${hour}:${minute}】<br><br>⏰我们的抗遗忘复习课还有 **${timeDifference}** 分钟开始了，请做好准备，及时进入会议室哦🔥`;
    } else {
        outputMessage = `【抗遗忘温馨提醒-${hour}:${minute}】<br><br>👍 #腾讯会议：762-3777-6304<br><br>⏰ 请准时参加会议，如有特殊情况无法参加，请提前告知！<br><br>🔔 若未按约定时间参加复习，请自主复习并打卡至学习群📱<br><br>🔒 仅在当天有收到提醒通知才需入会。<br><br>📢 请在抗遗忘时及时反馈是否需要取消下次安排的正课，以便妥善安排教学计划，老师为你骄傲🌹`;
    }

    copyToClipboard(outputMessage);
    // Display the output message
    showLongText(outputMessage);
}

export function handleAntiForgettingFeedbackClick() {
    const userName = document.getElementById("userName").value;
    // Get values from input boxes
    const antiForgettingReviewWord = Array.from(document.querySelectorAll('.antiForgettingReviewWord'))
        .reduce((sum, input) => sum + (input.value ? parseInt(input.value, 10) : 0), 0);
    let forgetWords = document.getElementById('forgetWords').value.trim();

    // Store forgetWords in IndexedDB with the key studentName_遗忘词
    storeForgetWords(userName, forgetWords);

    let pronounceWords = document.getElementById('pronounceWords').value.trim();
    let keyLanguagePoints = document.getElementById('keyLanguagePoints').value.trim();
    let practiceArea = document.getElementById('practiceArea').value.trim();
    const randomFeedback = getRandomFeedback();

    // Count the number of English words
    const numberOfEnglishWords = countEnglishWords(forgetWords);
    const numberOfWrongWords = countEnglishWords(pronounceWords);
    const correctWordsCount = parseInt(antiForgettingReviewWord) - numberOfEnglishWords;
    const correctRate = (correctWordsCount / antiForgettingReviewWord * 100).toFixed(0);
    // Get the input element to display the result
    const inputAntiForgettingForgetWord = document.getElementById("antiForgettingForgetWord");

    // Set the calculated value to the input box
    inputAntiForgettingForgetWord.value = numberOfEnglishWords;
    const antiForgettingForgetWord = document.getElementById('antiForgettingForgetWord').value;

    // Remove empty lines from forgetWords and pronounceWords
    if (forgetWords.trim().length == 0) {
        forgetWords = " 无!";
    } else {
        forgetWords = '<br>' + forgetWords.split('\n')
            .filter(word => word.trim() !== '') // Remove empty lines
            .map(word => `- ${word.trim()}`)
            .join('<br>') + '<br>';
    }

    if (pronounceWords.trim().length == 0) {
        pronounceWords = " 无!";
    } else {
        pronounceWords = '<br>' + pronounceWords.split('\n')
            .filter(word2 => word2.trim() !== '') // Remove empty lines
            .map(word2 => `- ${word2.trim()}`)
            .join('<br>') + '<br>';
    }

    let keyLanguagePointsSection = "";
    let practiceSection = "";

    if (keyLanguagePoints.length !== 0) {
        keyLanguagePointsSection = '<br><br>5️⃣重点语言点：<br>' + keyLanguagePoints.split('\n').filter(point => point.trim() !== '').map((point, index) => {
            return (index + 1) + '. ' + point.trim(); // Trim spaces within each item
        }).join('<br>') + '<br>';
    }

    if (practiceArea.length !== 0) {
        let practiceNumber = keyLanguagePoints.length !== 0 ? '6️⃣' : '5️⃣';
        practiceSection = '<br><br>' + practiceNumber + '语言闯关：<br>' + practiceArea.split('\n').filter(point => point.trim() !== '').map((point, index) => {
            return (index + 1) + '. ' + point.trim(); // Trim spaces within each item
        }).join('<br>') + '<br>';
    }

    // Combine both sections
    let combinedContent = keyLanguagePointsSection + practiceSection;
    // Generate the message
    let message = `【${userName} 今日抗遗忘复习反馈】<br>
1️⃣复习${antiForgettingReviewWord} 词，遗忘${antiForgettingForgetWord} 词，发音不标准${numberOfWrongWords} 词，正确率${correctRate}% 💯<br>
2️⃣遗忘词:${forgetWords}<br>
3️⃣发音不标准的词:${pronounceWords}<br>
4️⃣${userName} ${randomFeedback}`;

    // Add key language points if not empty
    if (combinedContent.length > 0) {
        message += combinedContent;
    }

    // Add line breaks
    message = message.replace(/\n/g, '<br>');

    // Append random motto
    if (forgetWords !== " 无!" || pronounceWords !== " 无!") {
        message += `<br><br><br>🎯重要提醒🎯<br><br>${userName}🥰，课后一定要记得练习那些你遗忘或者发音不标准的单词哦💪`;
    } else {
        message += `<br><br><br>📚知识小船📚<br><br>${getRandomMotto()}`;
    }

    // Copy the message to clipboard
    copyToClipboard(message);
    // Show alert with the generated message
    showLongText(`${message}`);

    // Store current date and correct rate in IndexedDB
    storeFeedbackInFile(userName, correctRate, antiForgettingReviewWord, correctWordsCount);
}

// 初始化 IndexedDB
const DB_NAME = 'FeedbackDB';
const STORE_NAME = 'feedbackData';
const STORE_NAME_LEARNED = 'newLearnedWords';
const DB_VERSION = 2;

async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION); // Version 2

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create feedbackData if not exists
            if (!db.objectStoreNames.contains('feedbackData')) {
                db.createObjectStore('feedbackData', {keyPath: 'userName'});
            }

            // Also create newLearnedWords if not exists
            if (!db.objectStoreNames.contains(STORE_NAME_LEARNED)) {
                db.createObjectStore(STORE_NAME_LEARNED, {keyPath: 'userName'});
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

export async function storeNewLearnedWords(studentName, newLearnedWordsText) {
    const classDateInput = document.getElementById("classDateTime").value;

    if (!classDateInput) {
        console.error('Class date not selected.');
        return;
    }

    try {
        const currentDate = classDateInput.split('T')[0];
        const db = await initDB();
        const tx = db.transaction(STORE_NAME_LEARNED, 'readwrite');
        const store = tx.objectStore(STORE_NAME_LEARNED);

        const request = store.get(studentName);
        const existingData = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        // Normalize input into one-line English+Chinese
        const normalizedLines = normalizeOneLineEntries(newLearnedWordsText);
        const finalTextToStore = normalizedLines.join('\n');

        const newWordsEntry = {
            [currentDate]: finalTextToStore
        };

        const updatedData = {
            userName: studentName,
            newLearnedWords: {
                ...(existingData?.newLearnedWords || {}),
                ...newWordsEntry  // newWordsEntry 应该是你要新增的单词
            },
            feedbackEntries: existingData?.feedbackEntries || [],
            forgetWords: existingData?.forgetWords || {}
        };

        store.put(updatedData);
        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });

        console.log('✅ New learned words stored successfully:\n', finalTextToStore);
    } catch (error) {
        console.error('❌ Error storing new learned words:', error);
    }
}

function normalizeOneLineEntries(text) {
    const lines = text.trim().split('\n').map(line => line.trim()).filter(Boolean);
    const result = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const hasChinese = /[\u4e00-\u9fa5]/.test(line);
        const hasEnglish = /[a-zA-Z]/.test(line);

        // One-line case: contains both English and Chinese
        if (hasChinese && hasEnglish) {
            result.push(line);
        }
        // Two-line case: English first, then Chinese
        else if (hasEnglish && i + 1 < lines.length && /[\u4e00-\u9fa5]/.test(lines[i + 1])) {
            result.push(lines[i] + lines[i + 1]);
            i++; // Skip the next line (Chinese explanation)
        }
        // If only English or only Chinese, keep as-is (optional)
        else {
            result.push(line);
        }
    }

    return result;
}

// 修改 storeForgetWords 函数以使用 IndexedDB
async function storeForgetWords(studentName, forgetWords) {
    const reviewTime = document.getElementById('reviewTime').value;

    if (!reviewTime) {
        console.error('Review time not selected.');
        return;
    }

    try {
        const currentDate = reviewTime.split('T')[0];
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const request = store.get(studentName);
        const existingData = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const newForgetWords = {
            [currentDate]: forgetWords
        };

        const updatedData = {
            userName: studentName,
            forgetWords: {
                ...(existingData ? existingData.forgetWords : {}),
                ...newForgetWords
            },
            feedbackEntries: existingData ? existingData.feedbackEntries : []
        };

        store.put(updatedData);
        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        console.log('Forget words stored successfully.');
    } catch (error) {
        console.error('Error storing forget words:', error);
    }
}

// 修改 storeFeedbackInFile 函数以使用 IndexedDB
async function storeFeedbackInFile(userName, correctRate, totalWordsReviewed, correctWordsCount) {
    const reviewTime = document.getElementById('reviewTime').value;

    if (!reviewTime) {
        console.error('Review time not selected.');
        return;
    }

    try {
        const currentDate = reviewTime.split('T')[0];
        const weekDay = getDayOfWeek(currentDate);
        const newContent = `${currentDate}(${weekDay}): ${correctRate}% | ${totalWordsReviewed}|${correctWordsCount}`;

        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const request = store.get(userName);
        const existingData = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        let feedbackEntries = existingData ? existingData.feedbackEntries : [];
        feedbackEntries = feedbackEntries.filter(entry => entry.trim());

        let updated = false;
        const updatedEntries = feedbackEntries.map(entry => {
            if (entry.startsWith(currentDate)) {
                updated = true;
                return newContent;
            }
            return entry;
        });

        if (!updated) {
            updatedEntries.push(newContent);
        }

        const updatedData = {
            userName,
            forgetWords: existingData ? existingData.forgetWords : {},
            feedbackEntries: updatedEntries
        };

        store.put(updatedData);
        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        console.log('Feedback stored successfully.');
    } catch (error) {
        console.error('An error occurred while storing feedback:', error);
    }
}

function getDayOfWeek(dateStr) {
    const dateObj = new Date(dateStr);
    const daysOfWeek = ["日", "一", "二", "三", "四", "五", "六"];
    return daysOfWeek[dateObj.getDay()];
}


export async function downloadFeedbackFile() {
    const userName = document.getElementById("userName").value;

    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);

        const request = store.get(userName);
        const userData = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (!userData) {
            alert("没有找到数据可供下载！");
            return;
        }

        const rawContent = userData.feedbackEntries.join('\n');
        const formattedContent = await formatFeedbackContent(userData);

        // Copy the formatted content to the clipboard
        copyToClipboard(formattedContent);
        console.log("内容已复制到剪贴板！");

        // Create a Blob with the formatted feedback data
        const blob = new Blob([formattedContent], {type: 'text/plain'});

        // Create an anchor element for downloading the file
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${userName}_抗遗忘正确率统计详情.txt`; // Use the username as the filename

        // Trigger a click event to download the file
        link.click();
    } catch (error) {
        console.error('下载反馈文件时出错:', error);
    }
}


async function formatFeedbackContent(userData) {
    const userName = document.getElementById("userName").value || "未知用户";
    const teacherNameElement = document.getElementById("teacherName");
    const coachName = teacherNameElement.options[teacherNameElement.selectedIndex].text;
    const currentDate = new Date().toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short"
    });

    // Read day range from input
    const dayRangeInput = document.getElementById("daysRangeInput");
    const dayRange = parseInt(dayRangeInput.value) || 7; // Default to 7 days if input is invalid

    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - dayRange);

    // Process forget words
    let forgetWordsContent = '';
    let forgetWordsData = '';
    const forgetWords = userData.forgetWords;
    for (const [datePart, words] of Object.entries(forgetWords)) {
        const wordDate = new Date(datePart.trim());
        if (wordDate >= startDate && wordDate <= today) {
            if (words) {
                forgetWordsData += words + '\n';
            }
        }
    }

    if (forgetWordsData) {
        const forgetWordsArray = forgetWordsData.split('\n')
            .map(word => word.trim())
            .filter(word => word.length > 0);

        const wordCounts = forgetWordsArray.reduce((acc, word) => {
            acc[word] = (acc[word] || 0) + 1;
            return acc;
        }, {});

        const sortedWordCounts = Object.entries(wordCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([word, count], index) => {
                return count === 1
                    ? `${index + 1}. ${word}`
                    : `${index + 1}. ${word} (遗忘 ${count} 次)`;
            })
            .join('\n');

        forgetWordsContent = `\n\n💡 抗遗忘复习的课后重点建议\n-------------------------------\n${sortedWordCounts}\n\n📢 以上数据仅统计${userName}在抗遗忘复习中的情况，请记得复习遗忘词，继续加油，巩固知识，进步会更加迅速！`;
    } else {
        forgetWordsContent = `\n\n遗忘词\n-------------------------------\n无数据`;
    }

    // Process feedback entries (correct rate content)
    const feedbackEntries = userData.feedbackEntries.filter(entry => entry.trim());
    let totalCorrectRate = 0;
    let validEntries = 0;
    let totalWordsReviewed = 0;

    const formattedEntries = feedbackEntries.map(entry => {
        let datePart = '未知日期';
        let ratePart = '无数据';
        let wordsReviewed = 0;

        if (entry.includes(':')) {
            const parts = entry.split(':').map(part => part.trim());
            datePart = parts[0] || '未知日期';
            ratePart = parts[1] || '无数据';
        } else {
            datePart = entry.trim();
        }

        let correctRate = NaN;
        if (ratePart && ratePart.includes('%')) {
            correctRate = parseFloat(ratePart.replace('%', '')) || NaN;
        }

        const wordsPart = entry.split('|')[1]?.trim();
        if (wordsPart) {
            wordsReviewed = parseInt(wordsPart) || 0;
        }

        let correctWords = 0;
        if (!isNaN(correctRate) && wordsReviewed > 0) {
            // 优先从记录中解析correctWords（如有），否则用correctRate计算
            const correctWordsFromEntry = entry.split('|')[2]?.trim();
            if (correctWordsFromEntry && !isNaN(parseInt(correctWordsFromEntry))) {
                correctWords = parseInt(correctWordsFromEntry);
            } else {
                correctWords = Math.round(wordsReviewed * correctRate / 100);
            }
        }

        if (!isNaN(correctRate)) {
            const entryDate = new Date(datePart);
            if (entryDate >= startDate && entryDate <= today) {
                totalCorrectRate += correctRate;
                validEntries++;
                totalWordsReviewed += wordsReviewed;
                if (wordsReviewed >= 100) {
                    // 三位数或以上
                    return {
                        date: datePart,
                        formatted: `${datePart.padEnd(12)}|${correctWords}/${wordsReviewed}(${String(correctRate).padEnd(2)}%)`
                    };
                }
                return {
                    date: datePart,
                    formatted: `${datePart.padEnd(12)} | ${correctWords}/${wordsReviewed}(${String(correctRate).padEnd(2)}%)`
                };
            }
        }
        return null;
    }).filter(entry => entry);

    formattedEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

    const sortedFormattedEntries = formattedEntries.map(entry => entry.formatted);
    const averageRate = validEntries > 0 ? (totalCorrectRate / validEntries).toFixed(0) : '无数据';

    const header = `📝 抗遗忘复习详情\n日期（星期）          | 正确率\n-------------------------------`;
    const footer = validEntries > 0
        ? `\n📌 本期学习总览\n平均正确率: ${averageRate} %\n总复习词汇: ${totalWordsReviewed} 词`
        : '';

    const metaInfo = `【抗遗忘数据统计】
学员: ${userName}
教练: ${coachName}
统计时间: ${currentDate}\n${footer}
`;

    return `${metaInfo}\n${header}\n${sortedFormattedEntries.join('\n')}${forgetWordsContent}`;
}


export function getRandomFeedback() {
    const attentionLevels = [
        '很认真', '非常专注', '表现很好', '注意力集中',
        '态度认真', '专心致志', '非常投入', '学习态度端正',
        '聚精会神', '全神贯注', '投入程度很高', '尽心尽力',
        '专注度满分', '全身心投入', '严谨认真', '一丝不苟'
    ];

    const classEfficiency = [
        '十分高效', '效果显著', '学习效率很高', '效果优秀',
        '表现卓越', '取得显著进步', '学得非常好', '表现优异',
        '事半功倍', '迅速掌握', '成绩斐然',
        '高效学习', '进步神速'
    ];

    const randomAttention = attentionLevels[Math.floor(Math.random() * attentionLevels.length)];
    const randomEfficiency = classEfficiency[Math.floor(Math.random() * classEfficiency.length)];

    return `同学${randomAttention}，整节课注意力都很在线，我们的课堂也${randomEfficiency}！要继续保持哦!`;
}

export function copyToClipboard(text) {
    const filteredText = text.replace(/<br><br>/g, '\n').replace(/<br>/g, '\n');
    const textarea = document.createElement('textarea');
    textarea.value = filteredText;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

export function handleAppointmentSchedulingClick({classType} = {}) {
    const userName = document.getElementById("userName").value;
    const classDuration = String(parseFloat(document.getElementById("classDuration").value));
    const classDateTime = document.getElementById("classDateTime").value;
    const dateObj = new Date(classDateTime);
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    const weekDay = "日一二三四五六".charAt(dateObj.getDay());
    const formattedDate = `${month}月${day}日（周${weekDay}）`;
    const appointmentMessage = `【排课申请】\n学员：【${userName}】\n时间：${formattedDate}\n课程与时长：${classType || '课程'}（${classDuration}小时），谢谢～`;
    copyToClipboard(appointmentMessage);
    showLongText(`${appointmentMessage}`);
}

export function showAlert(message) {
    Swal.fire({
        html: `<div style="height: 500px; overflow-y: auto; text-align: left;">${message}</div>`, // Adjust the height as needed
        confirmButtonText: 'OK',
        allowOutsideClick: false,
        heightAuto: false,  // Prevent auto height adjustment
    });
}

export function showLongText(longText) {
    const textElement = document.createElement('div');
    textElement.innerHTML = longText;
    textElement.classList.add('long-text');
    document.body.appendChild(textElement);
    setTimeout(() => {
        textElement.style.opacity = '0'; // Set opacity to make it invisible
        setTimeout(() => {
            textElement.remove(); // Remove the text after hiding
        }, 300); // Adjust the timing of removal as needed (300 milliseconds in this case)
    }, 2000); // Adjust the timing of visibility as needed (2000 milliseconds in this case)
}

export function getRandomMotto() {
    // Replace the following array with your own collection of mottos
    const mottos = [
        "Don't fear forgetting. Each instance of forgetting is a doorway to new memories.<br><br>别害怕遗忘，每一次遗忘都是记忆的契机！",
        "One clap: You're great! Two claps: You're awesome! Three claps: You're the best!<br><br>一个赞：你很棒！两个赞：你真棒！三个赞：你最棒！",
        "Wonderful, keep it up! Every success is built upon a foundation of consistent effort!<br><br>很棒，坚持！每个成功后面都有着厚积薄发的过程！",
        "Received the record of your efforts! Applause to the best version of you, making progress bit by bit. Great job!<br><br>收到宝贝的打卡啦，掌声送给最棒的你，正在一点一点的进步，很棒哦！",
        "Every effort and persistence from you will not be in vain!<br><br>宝贝的每一次努力和坚持都不会被辜负！",
        "You're amazing! Such effort and determination make me truly proud of you!<br><br>你真行！这么努力，这么执着，真为你感到骄傲！",
        "Your performance is outstanding; you are the best!<br><br>你的表现很出色，你就是最棒的！",
        "You're progressing so fast, I'm genuinely happy for you!<br><br>你进步的真快，太为你感到开心啦！",
        "I love seeing your hard-working spirit and look forward to seeing you take another step forward tomorrow!<br><br>我喜欢你努力的样子，期待明天的你更进一步！",
        "Your recent training has been so dedicated, I'm cheering for you!<br><br>最近训练很认真，我疯狂为你点赞！",
        "Here's a little flower for you, as a reward for all your hard work!<br><br>送你一朵小花花，奖励努力的你！",
        "Through continuous efforts, I believe you will become more and more amazing!<br><br>通过一次次努力相信你一定会越来越棒的！",
        "I hope every effort you make becomes a stroke of luck. Keep it up!<br><br>希望你的每一次努力，都是幸运的伏笔，加油！",
        "With hard work, you've perfectly completed your training goal once again!<br><br>经过努力，你又一次完美地完成了训练目标！",
        "You are always so confident; I'm so proud of you!<br><br>你永远那么自信，真为你自豪！",
        "You always bring me surprises. You're truly amazing!<br><br>你总是可以给我带来惊喜，真的太棒啦！",
        "Keep trying hard; success will definitely be yours!<br><br>你尽管努力，成功一定属于你！",
        "Believe that you are the brightest star!<br><br>相信你就是最亮的那颗星星！",
        "When you're serious, you shine!<br><br>认真起来的你闪闪发光！",
        "Dedication will lead to rewards. I look forward to seeing an even better you!<br><br>用心一定会有收获，期待看到更棒的你！",
        "Kudos to you for completing your daily tasks so diligently! You're truly the best!<br><br>表扬每天都认真完成打卡的你，收获满满，你就是最棒的！",
        "Life is a journey, and if you fall in love with the journey, you will be in love forever.<br><br>生活是一场旅程，如果你爱上了这场旅程，你将永远热爱。",
        "Uncertainty is the only certainty there is, and knowing how to live with insecurity is the only security.<br><br>不确定性是唯一确定的，知道如何与不安全感共处是唯一的安全感。",
        "In a time of drastic change it is the learners who inherit the future. The learned usually find themselves equipped to live in a world that no longer exists.<br><br>在剧烈变化的时代，是学习者继承未来。有学识的人通常发现自己准备好生活在一个不再存在的世界里。",
        "Change is the law of life. And those who look only to the past or present are certain to miss the future.<br><br>变化是生活的法则。那些只看过去或现在的人肯定会错过未来。",
        "The future belongs to those who believe in the beauty of their dreams.<br><br>未来属于那些相信他们梦想之美的人。",
        "No pains,no gains.<br><br>不劳则无获。",
        "Rome was not built in a day.<br><br>罗马不是一天建成的。/伟业非一日之功。",
        "Practice makes perfect.<br><br>熟能生巧。",
        "It's never too old to learn.<br><br>活到老，学到老。",
        "A good beginning is half done.<br><br>好的开始是成功的一半。",
        "Easier said than done.<br><br>说起来容易做起来难。",
        "Actions speak louder than words.<br><br>行胜于言。",
        "A journey of a thousand miles begins with a single step.<br><br>千里之行，始于足下。",
        "All roads lead to Rome.<br><br>条条大路通罗马。",
        "No man can do two things at once.<br><br>一心不可二用。",
        "Where there is a will,there is a way.<br><br>有志者，事竟成。",
        "God helps those who help themselves.<br><br>自助者天助之。",
        "Time and tide wait for no man.<br><br>时不我待。",
        "A friend in need is a friend indeed.<br><br>患难见真情。",
        "An apple a day keeps the doctor away.<br><br>一天一苹果，医生远离我。",
        "Laughter is the best medicine.<br><br>笑是最好的药。",
        "An hour in the morning is worth two in the evening.<br><br>一日之计在于晨。",
        "Every coin has two sides.<br><br>凡事皆有两面性。",
        "When in Rome,do as the Romans do.<br><br>入乡随俗。",
        "Every day is a new opportunity to learn and grow. Keep pushing forward!<br><br>每一天都是学习和成长的新机会。继续前进！",
        "May your kindness and positivity shine bright today and always!<br><br>愿你的善良和积极态度今天和永远闪耀光芒！",
        "Wishing you the courage to pursue your dreams and the strength to overcome any obstacles in your path.<br><br>祝你勇气去追逐梦想，力量去克服路上的任何障碍。",
        "Believe in yourself and your abilities. You have the power to achieve amazing things!<br><br>相信自己和自己的能力。你有能力实现不可思议的事情！",
        "Sending you warm wishes for a day filled with joy, laughter, and endless possibilities.<br><br>送上温暖的祝福，愿你的一天充满快乐、笑声和无限可能。",
        "Never underestimate the impact of a small act of kindness. Spread love wherever you go!<br><br>永远不要低估一次小小善举的影响力。无论何时何地，传播爱心！",
        "Embrace each moment with gratitude and appreciation. Life is a precious gift.<br><br>怀着感恩和欣赏之心拥抱每一刻。生命是一份珍贵的礼物。",
        "Challenges are opportunities in disguise. Keep a positive attitude and tackle them head-on!<br><br>挑战是伪装的机遇。保持积极态度，直面挑战！",
        "May your day be filled with moments that make your heart smile and your soul sing.<br><br>愿你的一天充满让心灵微笑、灵魂欢歌的时刻。",
        "Remember to take care of yourself today. Your well-being is important, too!<br><br>记得今天要好好照顾自己。你的健康也很重要！",
        "祝好运、健康、欢乐伴你度过一个快乐每一年。<br><br>Good luck, good health, good cheer. l wish you a happy every Year.",
        "知识改变命运<br><br>Knowledge changes destiny",
        "坚持就是胜利<br><br>Persistence is victory",
        "学无止境<br><br>Learning knows no bounds",
        "心有多大，舞台就有多大<br><br>As big as your heart is, so is the stage",
        "吹灭读书灯，一身都是月<br><br>Blow out the lamp of study, and a whole body is lit by the moon",
        "路漫漫其修远兮，吾将上下而求索<br><br>The road ahead is long and winding; I will seek my way up and down",
        "千里之行，始于足下<br><br>A journey of a thousand miles begins with a single step",
        "世间美好，皆源于心<br><br>The beauty of the world all comes from the heart",
        "宝剑锋从磨砺出，梅花香自苦寒来<br><br>The sword is sharpened from grinding, and the fragrance of the plum blossom comes from the bitter cold",
        "天行健，君子以自强不息<br><br>The sky is healthy; gentlemen should always strive for self-improvement",
        "有志者事竟成，破釜沉舟，百二秦关终属楚<br><br>Where there is a will, there is a way; burning boats and breaking cauldrons, after a hundred battles, Qin Pass belongs to Chu",
        "不经一番寒彻骨，怎得梅花扑鼻香<br><br>Without going through the cold to the bone, how can one enjoy the fragrance of plum blossoms",
        "若要人悦，莫若草木之茂<br><br>If you want people to be pleased, it's best to be as lush as grass and trees",
        "心有多大，舞台就有多大；梦有多远，路就有多远<br><br>As big as your heart is, so is the stage; as far as your dreams go, so goes the road",
        "世上无难事，只要肯攀登<br><br>There is nothing difficult in the world as long as you are willing to climb",
        "百折不挠，金石可镂<br><br>Perseverance can carve through metal and stone",
        "天行健，君子以自强不息<br><br>The sky is healthy; gentlemen should always strive for self-improvement",
        "莫问前程有多远，道路漫漫谁执鞭<br><br>Do not ask how far the future is; on the long road, who holds the reins",
        "勿以善小而不为，勿以恶小而为之<br><br>Do not fail to do good because it seems trivial; do not do evil because it seems trivial",
        "少壮不努力，老大徒伤悲<br><br>A young man who does not work hard will suffer in his old age",
        "踏遍青山人未老，风景这边独好<br><br>Travel through the mountains while young; the scenery here is unique",
        "夙愿必胜，坚持不懈<br><br>Morning wishes will surely win with persistence",
        "学海无涯，勇攀高峰<br><br>The sea of learning has no horizon; bravely climb the peaks",
        "行路漫漫，勇者无畏<br><br>The road ahead is long and winding; the brave have no fear",
        "勤奋如雨，润物无声<br><br>Diligence falls like rain, silently nurturing",
        "热爱生活，生活也会热爱你<br><br>Love life, and life will love you back",
        "每一次努力都是一次收获<br><br>Every effort is a harvest",
        "坚信自己，勇往直前<br><br>Believe in yourself and move forward bravely",
        "自律之路，一步一个脚印<br><br>The road of self-discipline, one step at a time",
        "岁月静好，唯有努力不懈<br><br>The years are peaceful, only with unremitting efforts",
        "阳光总在风雨后<br><br>The sun always shines after the storm",
        "前路漫漫，勿忘初心<br><br>The road ahead is long and winding; never forget your original intention",
        "在人生的旅程中，勇敢前行，迎接挑战，创造奇迹。<br><br>Embrace the journey of life, move forward bravely, face challenges, and create miracles.",
        "相信自己的内在力量，你拥有无限的潜能。<br><br>Believe in your inner strength, you have unlimited potential.",
        "勇敢地追求你的梦想，即使道路曲折，也要坚持不懈。<br><br>Pursue your dreams bravely, even if the road is winding, persevere.",
        "在困难面前不退缩，因为你的坚韧会迎接挑战。<br><br>Do not shrink back in the face of difficulties, because your resilience will meet the challenge.",
        "学会欣赏生活中的美好，感恩每一个来之不易的时刻。<br><br>Learn to appreciate the beauty in life, be grateful for every precious moment.",
        "用爱心和善意装饰你的日常生活，创造美好的回忆。<br><br>Adorn your daily life with love and kindness, create beautiful memories.",
        "坚持不懈，直至成功。在每一步都迈得更近。<br><br>Persist until success. Take one step closer with each step.",
        "勇敢地跨出舒适区，探索未知的领域，拥抱成长的机会。<br><br>Bravely step out of your comfort zone, explore the unknown, embrace growth opportunities.",
        "用心灵的眼睛看世界，你会发现无限的可能性。<br><br>See the world with the eyes of your heart, you will discover infinite possibilities.",
        "每一次失败都是一次学习的机会，让它们成为你成功的台阶。<br><br>Every failure is an opportunity to learn, let them become the steps to your success.",
        "热情与决心将引领你走向成功的道路，不断前行，永不放弃。<br><br>Passion and determination will lead you to the path of success, keep moving forward, never give up.",
        "用积极的态度面对生活中的挑战，你会发现自己拥有无限的力量。<br><br>Face the challenges in life with a positive attitude, you will find yourself with infinite strength.",
        "每一次努力都是一次成长，每一次挑战都是一次进步。<br><br>Every effort is a growth, every challenge is a progress.",
        "勇敢地迎接未来的挑战，因为你拥有充足的能力去应对一切。<br><br>Bravely embrace the challenges of the future, because you have the ability to deal with everything.",
        "坚持追求自己的梦想，即使前方是未知的道路，也要勇敢前行。<br><br>Persist in pursuing your dreams, even if the road ahead is unknown, keep moving forward bravely."
    ];

    const randomIndex = Math.floor(Math.random() * mottos.length);
    return mottos[randomIndex];
}


export function countEnglishWords(text) {
    const wordsArray = extractEnglishWords(text);
    return wordsArray.length;
}

function extractEnglishWords(text) {
    const lines = text.trim().split('\n').map(line => line.trim()).filter(Boolean);
    const englishWords = [];

    // 1) 纯中文行：补充了全角分号 ；
    const CHINESE_ONLY = /^[\u4e00-\u9fa5\s，。！？；、“”‘’（）【】《》·…—]+$/;

    // 2) 全英文行：补充了感叹号 !
    const FULL_EN = /^[\w\s.,;:()'"\-…\?!]+$/;

    // 3) 英文起头 + 后接中文：同样补充了感叹号 !，并保留对全角括号与全角分号的判断
    const MIXED = /^([\w\s.,;:()'"\-…\?!]+)(?:[\u4e00-\u9fa5\uFF08\uFF09]|；)/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (CHINESE_ONLY.test(line)) {
            continue;
        }

        if (FULL_EN.test(line)) {
            englishWords.push(line);
            if (i + 1 < lines.length && /[\u4e00-\u9fa5]/.test(lines[i + 1])) {
                i++; // 跳过下一行中文释义
            }
            continue;
        }

        const mixedMatch = line.match(MIXED);
        if (mixedMatch) {
            englishWords.push(mixedMatch[1].trim());
        }
    }

    return englishWords;
}


export function displayToast(message) {
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

export function selfReviewClick() {
    const feedbackMessage = `*课后复习方式：<br><br>1️⃣.教练带动进行标准 21 天抗遗忘复习（解决"两会" ：看到英文会读，看到英文知道中文意思）<br><br>2️⃣.家长和学生需将【每日单词表】打印出来，家长打印中文版，让学生书写英文；打印英文版，学生填写中文，家长及学员对应中英文版进行批改，并以拍照的方式发送到群里进行打卡（解决另外"两会" ：会拼会写），建议每天写一遍。<br><br>3️⃣.对于当日抗遗忘复习单词中遗忘的部分，也要加入"生词本"进行重点复习。`
    copyToClipboard(feedbackMessage);
    showLongText(`${feedbackMessage}`);
}

export function generateTrialReport() {
    const userName = document.getElementById("userName").value;
    const statsKey = `${userName}_classStatistics`;
    const classStats = JSON.parse(localStorage.getItem(statsKey)) || {};

    // 过滤出体验课记录
    const trialEntries = Object.entries(classStats)
        .filter(([key, stats]) => stats.type === "体验课")
        .map(([key, stats]) => {
            const [year, month, day] = key.split('-');
            const date = new Date(year, month - 1, day);
            return {
                date,
                newWord: stats.newWord,
                duration: stats.duration
            };
        });

    if (trialEntries.length === 0) {
        alert("没有找到体验课数据！");
        return;
    }

    // 修改报告标题和表头
    let reportContent = `【体验课学习数据统计】\n学员: ${userName}\n\n`;
    reportContent += "📅 体验课学习详情\n日期              | 新词  | 课时\n--------------------------------\n";

    trialEntries.sort((a, b) => a.date - b.date).forEach(entry => {
        const formattedDate = `${String(entry.date.getMonth() + 1).padStart(2, '0')}-${String(entry.date.getDate()).padStart(2, '0')} (${entry.date.toLocaleString('zh-CN', {weekday: 'short'})})`;
        reportContent += `${formattedDate} | ${entry.newWord.toString().padEnd(4)} | 1小时\n`;
    });

    // 生成下载文件
    const blob = new Blob([reportContent], {type: 'text/plain'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${userName}_体验课报告.txt`;
    link.click();
}

export function storeClassStatistics(userName, date, newWord, reviewWordCount, duration, type) {
    try {
        const statsKey = `${userName}_classStatistics`;
        let classStats = JSON.parse(localStorage.getItem(statsKey)) || {};

        // 使用纯日期作为key
        classStats[date] = {
            newWord: newWord,
            reviewWordCount: reviewWordCount,
            duration: duration,
            type: type
        };

        localStorage.setItem(statsKey, JSON.stringify(classStats));
    } catch (error) {
        console.error('存储课程统计信息出错:', error);
    }
}

export function addRightClickPasteEvent(element) {
    if (!element) return;

    element.addEventListener('contextmenu', async (event) => {
        event.preventDefault(); // 阻止默认的右键菜单

        try {
            // 读取剪贴板中的文本内容
            const clipboardText = await navigator.clipboard.readText();

            // 获取当前元素的选中位置
            const start = element.selectionStart;
            const end = element.selectionEnd;

            // 获取当前元素的原有内容
            const currentValue = element.value;

            // 将剪贴板内容插入到选中位置
            const newValue = currentValue.slice(0, start) + clipboardText + currentValue.slice(end);

            // 更新元素的值
            element.value = newValue;

            // 设置新的光标位置
            element.selectionStart = element.selectionEnd = start + clipboardText.length;
        } catch (error) {
            console.error('读取剪贴板内容时出错:', error);
        }
    });
}

export function handleNewVersionFeedbackClick() {
    const userNameInput = document.getElementById("userName");
    const userName = userNameInput ? userNameInput.value : "同学";

    const reviewInputs = Array.from(document.querySelectorAll('.antiForgettingReviewWord'));
    const hasFilled = reviewInputs.some(input => input && input.value && input.value.trim() !== '');
    if (!hasFilled) {
        alert('请先填写复习词数');
        return;
    }
    const antiForgettingReviewWord = reviewInputs.reduce((sum, input) => {
        const v = parseInt((input.value || '').trim(), 10);
        return sum + (Number.isFinite(v) ? v : 0);
    }, 0);

    // Build message
    const motto = getRandomMotto();
    const message = `1. 复习 ${antiForgettingReviewWord} 词\n2. ${userName}同学表现很好，整节课注意力都很在线，我们的课堂也进步神速！要继续保持哦！\n📚知识小船📚\n${motto}`;

    // Copy the message to clipboard
    copyToClipboard(message);
    // Show alert with the generated message
    showLongText(`${message}`);
}
