document.addEventListener("DOMContentLoaded", () => {
    const songsDir = "./songs/";
    const imagesDir = "./images/";

    const player = {
        audio: new Audio(),
        playlist: [],
        currentIndex: 0,
        isPlaying: false,
        mode: "sequential", // Modes: sequential, random, repeat
    };

    const elements = {
        currentCover: document.getElementById("current-cover"),
        songTitle: document.getElementById("song-title"),
        songTime: document.getElementById("song-time"),
        playPause: document.getElementById("play-pause"),
        prev: document.getElementById("prev"),
        next: document.getElementById("next"),
        mode: document.getElementById("mode"),
        volume: document.getElementById("volume"),
        progress: document.getElementById("progress"),
        playlist: document.getElementById("playlist"),
    };

    // Automatically read files from a manifest in songsDir
    function scanSongsAndImages() {
        fetch(`${songsDir}songs.json`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load songs.json. Status: ${response.status}`);
                }
                return response.json();
            })
            .then((files) => {
                if (!Array.isArray(files)) {
                    throw new Error("songs.json must be a JSON array of filenames");
                }

                const audioFiles = files.filter(file => /\.(mp3|wav)$/i.test(file));
                if (audioFiles.length === 0) {
                    console.warn("No audio files listed in songs.json.");
                    return;
                }

                player.playlist = audioFiles.map(file => {
                    const songName = file.replace(/\.(mp3|wav)$/i, "");
                    const imagePng = `${imagesDir}${songName}.png`;
                    const imageJpg = `${imagesDir}${songName}.jpg`;
                    return {
                        title: songName,
                        audio: `${songsDir}${file}`,
                        image: imagePng,
                        imageJpg,
                    };
                });

                generatePlaylist();
                loadSong(0);
            })
            .catch(error => {
                console.error("Error loading songs:", error);
                elements.playlist.innerHTML = `<p>Error: ${error.message}</p>`;
            });
    }

    function generatePlaylist() {
        elements.playlist.innerHTML = "";
        player.playlist.forEach((song, index) => {
            const songElement = document.createElement("div");
            const img = document.createElement("img");
            img.alt = "Album Cover";
            img.src = song.image;
            img.onerror = () => {
                if (!img.dataset.triedJpg && song.imageJpg && img.src.endsWith('.png')) {
                    img.dataset.triedJpg = '1';
                    img.src = song.imageJpg;
                } else {
                    img.src = `${imagesDir}default.png`;
                }
            };
            const span = document.createElement("span");
            span.textContent = song.title;

            songElement.appendChild(img);
            songElement.appendChild(span);
            songElement.addEventListener("click", () => loadSong(index));
            elements.playlist.appendChild(songElement);
        });
    }

    // Ensure loadSong handles edge cases
    function loadSong(index) {
        if (!player.playlist || player.playlist.length === 0) {
            console.error("Playlist is empty. Cannot load song.");
            return;
        }

        if (index < 0 || index >= player.playlist.length) {
            console.error("Invalid song index:", index);
            return;
        }

        player.currentIndex = index;
        const song = player.playlist[index];
        player.audio.src = song.audio;
        elements.currentCover.onerror = null; // reset previous handler to avoid loops
        elements.currentCover.src = song.image;
        // graceful fallback: try jpg then default
        elements.currentCover.onerror = () => {
            if (elements.currentCover.src.endsWith('.png')) {
                elements.currentCover.src = song.imageJpg;
            } else {
                elements.currentCover.src = `${imagesDir}default.png`;
            }
        };
        elements.songTitle.textContent = song.title;
        elements.songTime.textContent = "00:00 / 00:00";
        highlightCurrentSong();
    }

    function highlightCurrentSong() {
        Array.from(elements.playlist.children).forEach((child, index) => {
            child.style.backgroundColor = index === player.currentIndex ? "#e0e0e0" : "transparent";
        });
    }

    function togglePlayPause() {
        if (player.isPlaying) {
            player.audio.pause();
            elements.playPause.textContent = "Play";
        } else {
            player.audio.play();
            elements.playPause.textContent = "Pause";
        }
        player.isPlaying = !player.isPlaying;
    }

    function playNext() {
        let nextIndex;
        if (player.mode === "random") {
            nextIndex = Math.floor(Math.random() * player.playlist.length);
        } else if (player.mode === "repeat") {
            nextIndex = player.currentIndex;
        } else {
            nextIndex = (player.currentIndex + 1) % player.playlist.length;
        }
        loadSong(nextIndex);
        player.audio.play();
        player.isPlaying = true;
        elements.playPause.textContent = "Pause";
    }

    function playPrev() {
        const prevIndex = (player.currentIndex - 1 + player.playlist.length) % player.playlist.length;
        loadSong(prevIndex);
        player.audio.play();
        player.isPlaying = true;
        elements.playPause.textContent = "Pause";
    }

    function updateProgress() {
        const { currentTime, duration } = player.audio;
        elements.progress.value = (currentTime / duration) * 100 || 0;
        elements.songTime.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }

    function toggleMode() {
        const modes = ["sequential", "random", "repeat"];
        const currentModeIndex = modes.indexOf(player.mode);
        player.mode = modes[(currentModeIndex + 1) % modes.length];
        elements.mode.textContent = player.mode;
    }

    elements.playPause.addEventListener("click", togglePlayPause);
    elements.next.addEventListener("click", playNext);
    elements.prev.addEventListener("click", playPrev);
    elements.mode.addEventListener("click", toggleMode);
    elements.volume.addEventListener("input", (e) => {
        player.audio.volume = e.target.value;
    });
    elements.progress.addEventListener("input", (e) => {
        player.audio.currentTime = (e.target.value / 100) * player.audio.duration;
    });
    player.audio.addEventListener("timeupdate", updateProgress);
    player.audio.addEventListener("ended", playNext);

    scanSongsAndImages();
});
