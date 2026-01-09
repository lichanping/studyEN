// 等待DOM完全加载
document.addEventListener('DOMContentLoaded', function () {
    // 计算基路径
    const basePath = window.location.pathname.includes('songPlayer')
        ? window.location.pathname.split('/songPlayer')[0] + '/songPlayer/'
        : './';

    const songsDir = `${basePath}songs/`;
    const imagesDir = `${basePath}images/`;

    console.log('初始化播放器...');
    console.log('Base path:', basePath);
    console.log('Songs dir:', songsDir);
    console.log('Images dir:', imagesDir);

    // 获取DOM元素
    const getEl = (id) => {
        const el = document.getElementById(id);
        if (!el) {
            console.error(`错误: 未找到ID为"${id}"的元素`);
        }
        return el;
    };

    const els = {
        playerView: getEl('player-view'),
        bg: getEl('bg'),
        songIndex: getEl('song-index'),
        switchSong: getEl('switch-song'),
        totalCount: getEl('total-count'),
        cover: getEl('current-cover'),
        title: getEl('song-title'),
        singer: getEl('song-singer'),
        playPause: getEl('play-pause'),
        prev: getEl('prev'),
        next: getEl('next'),
        mode: getEl('mode'),
        progress: getEl('progress'),
        volume: getEl('volume'),
        currentTime: getEl('current-time'),
        totalTime: getEl('total-time'),
    };

    // 检查关键元素是否存在
    console.log('检查DOM元素:');
    console.log('cover元素:', els.cover);
    console.log('bg元素:', els.bg);
    console.log('title元素:', els.title);

    // 如果cover元素不存在，创建一个
    if (!els.cover) {
        console.log('cover元素不存在，正在创建...');
        const coverWrap = document.querySelector('.cover-wrap');
        if (coverWrap) {
            const img = document.createElement('img');
            img.id = 'current-cover';
            img.alt = '专辑封面';
            coverWrap.appendChild(img);
            els.cover = img;
            console.log('已创建cover元素:', els.cover);
        } else {
            console.error('错误: 未找到.cover-wrap容器');
        }
    }

    const audio = new Audio();
    const state = {
        playlist: [],
        index: 0,
        mode: 'loop', // loop | shuffle | single
    };

    // 初始化
    init();

    async function init() {
        await loadSongs();
        bindEvents();

        // 设置音量初始值
        audio.volume = 0.5;
        if (els.volume) els.volume.value = 0.5;

        // 默认加载第一首歌
        if (state.playlist.length > 0) {
            loadSong(0);
            updateIndexControls();
        } else {
            console.error('播放列表为空，请检查songs文件夹和songs.json文件');
        }
    }

    function bindEvents() {
        if (els.switchSong) els.switchSong.addEventListener('click', switchSongByIndex);
        if (els.songIndex) els.songIndex.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') switchSongByIndex();
        });

        if (els.playPause) els.playPause.addEventListener('click', togglePlay);
        if (els.prev) els.prev.addEventListener('click', () => playPrev());
        if (els.next) els.next.addEventListener('click', () => playNext());
        if (els.mode) els.mode.addEventListener('click', switchMode);
        if (els.progress) els.progress.addEventListener('input', onSeek);
        if (els.volume) els.volume.addEventListener('input', () => {
            audio.volume = parseFloat(els.volume.value);
        });

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateTime);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('play', () => {
            if (els.cover) els.cover.classList.add('cover-rotating');
            if (els.playPause) els.playPause.textContent = '⏸';
        });
        audio.addEventListener('pause', () => {
            if (els.cover) els.cover.classList.remove('cover-rotating');
            if (els.playPause) els.playPause.textContent = '▶';
        });

        audio.addEventListener('error', (e) => {
            console.error('音频加载错误:', e);
        });
    }

    async function loadSongs() {
        try {
            console.log('正在加载歌曲列表...');
            const res = await fetch(`${songsDir}songs.json`);
            if (!res.ok) throw new Error(`无法加载 songs.json: ${res.status}`);

            const files = await res.json();
            console.log('从 songs.json 读取到的文件列表:', files);

            // 构建播放列表
            state.playlist = files
                .filter(f => /\.(mp3|wav|ogg|m4a)$/i.test(f))
                .map(file => {
                    const base = file.replace(/\.[^/.]+$/, ""); // 去掉扩展名
                    const lastUnderscore = base.lastIndexOf('_');
                    const title = lastUnderscore > 0 ? base.slice(0, lastUnderscore) : base;
                    const singer = lastUnderscore > 0 ? base.slice(lastUnderscore + 1) : '';

                    return {
                        file,
                        base,
                        title: title || base,
                        singer: singer || '未知歌手',
                        audioUrl: `${songsDir}${file}`,
                    };
                });

            console.log('构建的播放列表:', state.playlist);

        } catch (error) {
            console.error('加载歌曲列表失败:', error);
            // 如果 songs.json 不存在，尝试手动指定
            try {
                console.log('尝试从 songs 文件夹自动检测音频文件...');
                const manualFiles = ['song1.mp3', 'song2.mp3', 'Faded.wav'];
                state.playlist = manualFiles.map(file => {
                    const base = file.replace(/\.[^/.]+$/, "");
                    const lastUnderscore = base.lastIndexOf('_');
                    const title = lastUnderscore > 0 ? base.slice(0, lastUnderscore) : base;
                    const singer = lastUnderscore > 0 ? base.slice(lastUnderscore + 1) : '';

                    return {
                        file,
                        base,
                        title: title || base,
                        singer: singer || '未知歌手',
                        audioUrl: `${songsDir}${file}`,
                    };
                });
                console.log('手动构建的播放列表:', state.playlist);
            } catch (e) {
                console.error('手动构建播放列表失败:', e);
                state.playlist = [];
            }
        }
    }

    function updateIndexControls() {
        if (els.totalCount) els.totalCount.textContent = `/ ${state.playlist.length}`;
        if (els.songIndex) {
            els.songIndex.max = state.playlist.length;
            els.songIndex.value = state.index + 1;
        }
    }

    function switchSongByIndex() {
        if (!els.songIndex) return;
        const index = parseInt(els.songIndex.value) - 1;
        if (index >= 0 && index < state.playlist.length) {
            state.index = index;
            loadSong(index);
            play();
        } else {
            alert(`请输入 1-${state.playlist.length} 之间的数字`);
        }
    }

    async function loadSong(i) {
        if (i < 0 || i >= state.playlist.length) {
            console.error('索引超出范围');
            return;
        }

        const item = state.playlist[i];
        console.log(`加载歌曲 ${i + 1}/${state.playlist.length}:`, item.title);

        try {
            // 暂停当前音频
            audio.pause();

            // 加载新音频
            audio.src = item.audioUrl;
            audio.load();

            // 更新UI
            if (els.title) els.title.textContent = item.title;
            if (els.singer) els.singer.textContent = item.singer;

            // 加载封面图片
            await loadCoverImage(item);

            // 更新索引显示
            updateIndexControls();

            console.log('歌曲加载完成:', item.audioUrl);

        } catch (error) {
            console.error('加载歌曲失败:', error);
        }
    }

    async function loadCoverImage(item) {
        if (!item) {
            console.error('loadCoverImage: item为空');
            return;
        }

        const songName = item.base; // 例如 "song1" 或 "Faded"
        console.log(`正在查找歌曲"${songName}"的封面图片...`);

        // 尝试加载同名图片
        const imageUrl = `${imagesDir}${songName}.png`;
        console.log(`尝试加载图片: ${imageUrl}`);

        // 使用Image对象预加载
        return new Promise((resolve) => {
            const img = new Image();

            img.onload = function () {
                console.log(`图片加载成功: ${imageUrl}`);
                // 检查元素是否存在
                if (els.cover) {
                    console.log('设置封面图片到els.cover');
                    els.cover.src = imageUrl;
                } else {
                    console.error('错误: els.cover为null，无法设置图片');
                }

                // 更新背景
                if (els.bg) {
                    console.log('设置背景图片');
                    els.bg.style.backgroundImage = `url("${imageUrl}")`;
                }
                resolve(true);
            };

            img.onerror = function () {
                console.warn(`图片加载失败: ${imageUrl}，尝试使用默认图片`);
                // 使用默认图片
                const defaultUrl = `${imagesDir}default.png`;
                console.log(`尝试加载默认图片: ${defaultUrl}`);

                const defaultImg = new Image();
                defaultImg.onload = function () {
                    console.log(`使用默认图片: ${defaultUrl}`);
                    if (els.cover) {
                        els.cover.src = defaultUrl;
                    }
                    if (els.bg) {
                        els.bg.style.backgroundImage = `url("${defaultUrl}")`;
                    }
                    resolve(false);
                };

                defaultImg.onerror = function () {
                    console.error(`默认图片也加载失败: ${defaultUrl}`);
                    // 清空图片
                    if (els.cover) {
                        els.cover.src = '';
                    }
                    if (els.bg) {
                        els.bg.style.backgroundImage = '';
                    }
                    resolve(false);
                };

                defaultImg.src = defaultUrl;
            };

            img.src = imageUrl;
        });
    }

    function togglePlay() {
        if (audio.paused) {
            play();
        } else {
            pause();
        }
    }

    function play() {
        audio.play().catch(error => {
            console.error('播放失败:', error);
        });
    }

    function pause() {
        audio.pause();
    }

    function playPrev() {
        if (state.playlist.length === 0) return;

        if (state.mode === 'shuffle') {
            state.index = randIndex();
        } else if (state.mode === 'single') {
            // 单曲模式保持不变
        } else {
            state.index = (state.index - 1 + state.playlist.length) % state.playlist.length;
        }
        loadSong(state.index);
        play();
    }

    function playNext() {
        if (state.playlist.length === 0) return;

        if (state.mode === 'shuffle') {
            state.index = randIndex();
        } else if (state.mode === 'single') {
            // 单曲模式保持不变
        } else {
            state.index = (state.index + 1) % state.playlist.length;
        }
        loadSong(state.index);
        play();
    }

    function randIndex() {
        const n = state.playlist.length;
        if (n <= 1) return 0;
        let r;
        do {
            r = Math.floor(Math.random() * n);
        } while (r === state.index);
        return r;
    }

    function switchMode() {
        if (!els.mode) return;

        const modes = [
            {key: 'loop', label: '循环'},
            {key: 'shuffle', label: '随机'},
            {key: 'single', label: '单曲'}
        ];

        const currentIndex = modes.findIndex(mode => mode.key === state.mode);
        const nextIndex = (currentIndex + 1) % modes.length;
        state.mode = modes[nextIndex].key;
        els.mode.textContent = modes[nextIndex].label;

        console.log(`切换播放模式为: ${state.mode}`);
    }

    function onSeek() {
        if (!audio.duration) return;
        const pct = parseFloat(els.progress.value) / 100;
        audio.currentTime = audio.duration * pct;
    }

    function updateTime() {
        const cur = audio.currentTime || 0;
        const dur = audio.duration || 0;
        if (els.currentTime) els.currentTime.textContent = fmt(cur);
        if (els.totalTime) els.totalTime.textContent = dur ? fmt(dur) : '00:00';
        if (els.progress) els.progress.value = dur ? Math.floor((cur / dur) * 100) : 0;
    }

    function onEnded() {
        if (state.mode === 'single') {
            audio.currentTime = 0;
            play();
        } else {
            playNext();
        }
    }

    function fmt(sec) {
        if (isNaN(sec)) return '00:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
});