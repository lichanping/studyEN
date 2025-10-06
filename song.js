let workbookData = null;
let selectedSongs = [];

document.getElementById('excelFile').addEventListener('change', handleFile);
document.getElementById('getSongsBtn').addEventListener('click', getRandomSongs);
document.getElementById('generateSentenceBtn').addEventListener('click', generateSentence);

function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    workbookData = XLSX.read(data, { type: 'array' });

    const sheetSelect = document.getElementById('sheetSelect');
    sheetSelect.innerHTML = '<option value="">请选择工作表</option>';
    workbookData.SheetNames.forEach((name, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${index}: ${name}`;
      sheetSelect.appendChild(option);
    });

    alert("✅ Excel 文件加载成功，共 " + workbookData.SheetNames.length + " 个工作表。");
  };
  reader.readAsArrayBuffer(file);
}

function getRandomSongs() {
  const count = parseInt(document.getElementById('songCount').value);
  const sheetIndex = parseInt(document.getElementById('sheetSelect').value);
  const songList = document.getElementById('songList');
  const sheetInfo = document.getElementById('sheetInfo');
  songList.innerHTML = "";
  selectedSongs = [];

  if (!workbookData) {
    sheetInfo.textContent = "⚠️ 请先上传 Excel 文件！";
    return;
  }
  if (isNaN(sheetIndex)) {
    sheetInfo.textContent = "⚠️ 请选择一个工作表！";
    return;
  }
  if (isNaN(count) || count <= 0) {
    sheetInfo.textContent = "⚠️ 请输入有效的歌曲数量！";
    return;
  }

  const sheetName = workbookData.SheetNames[sheetIndex];
  const sheet = workbookData.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  // ⚙️ 扁平化并过滤空值
  const allSongs = jsonData.flat().filter(v => v && v.toString().trim() !== "");

  if (allSongs.length === 0) {
    sheetInfo.textContent = `⚠️ 工作表《${sheetName}》为空！`;
    return;
  }

  // 🎵 显示总歌曲数（不弹窗）
  sheetInfo.textContent = `🎵 当前工作表《${sheetName}》共有 ${allSongs.length} 首歌`;

  // 随机抽取
  const shuffled = allSongs.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  selected.forEach((name) => {
    selectedSongs.push(name);
  });

  renderSongList();
  document.getElementById('generateSentenceBtn').disabled = false;
}

function renderSongList() {
  const songList = document.getElementById('songList');
  songList.innerHTML = "";

  selectedSongs.forEach((name, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="song-name">${i + 1}. ${name}</span>
    <button class="delete-btn" onclick="deleteSong(${i})">删</button>`;

    songList.appendChild(li);
  });
}

function deleteSong(index) {
  selectedSongs.splice(index, 1);
  renderSongList();
}

function generateSentence() {
  if (selectedSongs.length === 0) {
    showTemporaryMessage("请先抽取或保留至少一首歌！");
    return;
  }

  const templates = [
    "在这里，音符和旋律将为您织起一幅美丽的画卷。💖 今日推荐：",
    "让旋律轻轻流淌，带你穿越时光的河流。🎶 今日推荐：",
    "音乐是心灵的语言，愿这几首歌温暖你的一天。🌈 今日推荐：",
    "每一首歌，都是一段心情的故事。✨ 今日推荐：",
    "用旋律点亮此刻的心情。💫 今日推荐："
  ];

  const intro = templates[Math.floor(Math.random() * templates.length)];
  const songText = selectedSongs.map(name => `《${name}》`).join("、");
  const sentence = `${intro}${songText}`;

  navigator.clipboard.writeText(sentence).then(() => {
    showTemporaryMessage(`📋 文案已复制到剪贴板！\n\n${sentence}`);
  }).catch(err => {
    console.error("复制失败: ", err);
    showTemporaryMessage("复制到剪贴板失败，请手动复制文案。");
  });
}

// 添加临时消息显示函数
function showTemporaryMessage(message) {
  // 创建消息元素
  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  messageElement.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 20px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    max-width: 80%;
    word-wrap: break-word;
    opacity: 1;
    transition: opacity 0.3s ease;
  `;

  // 添加到页面
  document.body.appendChild(messageElement);

  // 2秒后开始隐藏并移除
  setTimeout(() => {
    messageElement.style.opacity = '0';
    setTimeout(() => {
      messageElement.remove();
    }, 300); // 与过渡时间匹配
  }, 2000);
}
