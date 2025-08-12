async function getFilesFromDir(url) {
  let res = await fetch(url);
  let text = await res.text();
  let div = document.createElement("div");
  div.innerHTML = text;
  let as = div.getElementsByTagName("a");
  return Array.from(as).map((a) => a.href);
}

function sanitizeFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function getsongs() {
  let songLinks = await getFilesFromDir("http://github.com/maitri1805/music-player/songs/");
  let imageLinks = await getFilesFromDir("http://127.0.0.1:5500/images/");

  let songs = songLinks.filter((href) => href.toLowerCase().endsWith(".mp3"));
  let images = imageLinks.filter(
    (href) =>
      href.toLowerCase().endsWith(".jpg") || href.toLowerCase().endsWith(".png")
  );

  return { songs, images };
}

async function main() {
  const { songs, images } = await getsongs();
  const cardContainer = document.querySelector(".cardcontainer");
  const favList = document.querySelector(".songlist ul");

  const audio = new Audio();
  document.body.appendChild(audio);

  let currentPlaying = null;
  let currentCard = null;
  let currentLi = null;
  let currentSongIndex = -1;
  let playMode = "all"; // "all" or "favorites"

  const playbarImg = document.getElementById("playbar-img");
  const playbarTitle = document.getElementById("playbar-title");
  const playPauseBtn = document.getElementById("play-pause-btn");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const seekbar = document.getElementById("seekbar");
  const currentTimeEl = document.getElementById("current-time");
  const totalDurationEl = document.getElementById("total-duration");
  const volumeSlider = document.getElementById("volume-slider");

  let songData = [];
  let favorites = new Set();

  function updateFavoritesUI() {
    favList.innerHTML = "";

    if (favorites.size === 0) {
      const msg = document.createElement("li");
      msg.style.textAlign = "center";
      msg.style.color = "#888";
      msg.style.padding = "10px";
      msg.textContent = "Make your playlist or add your favourite song";
      favList.appendChild(msg);
      return;
    }

    favorites.forEach((songIndex) => {
      const { title, img } = songData[songIndex];
      const li = document.createElement("li");
      li.classList.add("fav-item");
      li.innerHTML = `
        <img src="${img}" alt="song" width="40" height="40" onerror="this.src='music.svg'">
        <div class="info"><div>${title}</div></div>
        <img class="play-icon" src="play.svg" style="cursor:pointer;width:24px;height:24px;margin-left:auto;">
        <div class="remove-btn" style="cursor:pointer;color:red;margin-left:8px;">✖</div>
      `;

      // Play from favorites list
      li.querySelector(".play-icon").addEventListener("click", (e) => {
        e.stopPropagation();
        playSong(songIndex, null, li, "favorites");
      });

      // Remove from favorites
      li.querySelector(".remove-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        favorites.delete(songIndex);
        updateFavoritesUI();
        const favBtn = document.querySelector(
          `.card[data-index="${songIndex}"] .fav-btn`
        );
        if (favBtn) favBtn.textContent = "🤍";
      });

      favList.appendChild(li);
    });
  }

  for (let i = 0; i < songs.length; i++) {
    const songUrl = songs[i];
    const filename = decodeURIComponent(songUrl.split("/").pop());
    const nameOnly = filename.replace(/\.mp3$/i, "").trim();
    const sanitizedName = sanitizeFileName(nameOnly);

    const matchedImage = images.find((imgUrl) => {
      const imgName = decodeURIComponent(imgUrl.split("/").pop())
        .replace(/\.[^.]+$/, "")
        .trim();
      return sanitizeFileName(imgName) === sanitizedName;
    });

    let imgSrc = matchedImage
      ? `images/${decodeURIComponent(matchedImage.split("/").pop())}`
      : "music.svg";

    songData.push({ title: nameOnly, url: songUrl, img: imgSrc });

    // Card UI
    const card = document.createElement("div");
    card.classList.add("card");
    card.setAttribute("data-index", i);
    card.innerHTML = `
      <div class="playbtn">
        <svg class="card-play-icon" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="white">
          <circle cx="12" cy="12" r="10" fill="white" />
          <path d="M10 8l6 4-6 4V8z" fill="black" />
        </svg>
      </div>
      <img src="${imgSrc}" alt="${nameOnly}" onerror="this.src='music.svg'">
      <h2>${nameOnly}</h2>
      <p>${nameOnly}</p>
      <span class="fav-btn" style="cursor:pointer;font-size:20px;position:absolute;bottom:10px;right:10px;">🤍</span>
    `;

    // Make card position relative for heart position
    card.style.position = "relative";

    // Favorite button
    const favBtn = card.querySelector(".fav-btn");
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (favorites.has(i)) {
        favorites.delete(i);
        favBtn.textContent = "🤍";
      } else {
        favorites.add(i);
        favBtn.textContent = "❤️";
      }
      updateFavoritesUI();
    });

    // Play button click only
    card.querySelector(".playbtn").addEventListener("click", (e) => {
      e.stopPropagation();
      playSong(i, card, null, "all");
    });

    cardContainer.appendChild(card);
  }

  function playSong(index, card = null, li = null, mode = "all") {
    playMode = mode;
    const { url, title, img } = songData[index];

    // Reset previous card play icon
    if (currentCard && currentCard !== card) {
      const prevIcon = currentCard.querySelector(".card-play-icon path");
      if (prevIcon) prevIcon.setAttribute("d", "M10 8l6 4-6 4V8z");
    }

    if (currentLi && currentLi !== li) {
      const prevIcon = currentLi.querySelector(".play-icon");
      if (prevIcon) prevIcon.src = "play.svg";
    }

    const isSame = currentPlaying === url && !audio.paused;
    if (isSame) {
      audio.pause();
      audio.currentTime = 0;
      playPauseBtn.src = "play.svg";
      if (card) {
        card.classList.remove("playing");
        const iconPath = card.querySelector(".card-play-icon path");
        if (iconPath) iconPath.setAttribute("d", "M10 8l6 4-6 4V8z");
      }
      if (li) li.querySelector(".play-icon").src = "play.svg";
      currentPlaying = null;
      currentCard = null;
      currentLi = null;
    } else {
      audio.src = url;
      audio.play();
      playPauseBtn.src = "stop.svg";
      playbarImg.src = img;
      playbarTitle.textContent = title;
      currentPlaying = url;
      currentCard = card;
      currentLi = li;
      currentSongIndex = index;
      if (card) {
        card.classList.add("playing");
        const iconPath = card.querySelector(".card-play-icon path");
        if (iconPath) iconPath.setAttribute("d", "M8 8h3v8H8zm5 0h3v8h-3z"); // stop icon
      }
      if (li) li.querySelector(".play-icon").src = "stop.svg";
    }
  }

  playPauseBtn.addEventListener("click", () => {
    if (!audio.src) return;
    if (audio.paused) {
      audio.play();
      playPauseBtn.src = "stop.svg";
      if (currentCard) {
        currentCard.classList.add("playing");
        const iconPath = currentCard.querySelector(".card-play-icon path");
        if (iconPath) iconPath.setAttribute("d", "M8 8h3v8H8zm5 0h3v8h-3z");
      }
      if (currentLi) currentLi.querySelector(".play-icon").src = "stop.svg";
    } else {
      audio.pause();
      playPauseBtn.src = "play.svg";
      if (currentCard) {
        currentCard.classList.remove("playing");
        const iconPath = currentCard.querySelector(".card-play-icon path");
        if (iconPath) iconPath.setAttribute("d", "M10 8l6 4-6 4V8z");
      }
      if (currentLi) currentLi.querySelector(".play-icon").src = "play.svg";
    }
  });

  prevBtn.addEventListener("click", () => {
    if (playMode === "favorites") {
      const favArray = Array.from(favorites);
      const pos = favArray.indexOf(currentSongIndex);
      if (pos > 0) playSong(favArray[pos - 1], null, null, "favorites");
    } else {
      if (currentSongIndex > 0)
        playSong(currentSongIndex - 1, null, null, "all");
    }
  });

  nextBtn.addEventListener("click", () => {
    if (playMode === "favorites") {
      const favArray = Array.from(favorites);
      const pos = favArray.indexOf(currentSongIndex);
      if (pos < favArray.length - 1)
        playSong(favArray[pos + 1], null, null, "favorites");
    } else {
      if (currentSongIndex < songData.length - 1)
        playSong(currentSongIndex + 1, null, null, "all");
    }
  });

  audio.addEventListener("ended", () => {
    if (playMode === "favorites") {
      const favArray = Array.from(favorites);
      const pos = favArray.indexOf(currentSongIndex);
      if (pos < favArray.length - 1) {
        playSong(favArray[pos + 1], null, null, "favorites");
        return;
      }
    } else {
      if (currentSongIndex < songData.length - 1) {
        playSong(currentSongIndex + 1, null, null, "all");
        return;
      }
    }
    playPauseBtn.src = "play.svg";
    if (currentCard) {
      currentCard.classList.remove("playing");
      const iconPath = currentCard.querySelector(".card-play-icon path");
      if (iconPath) iconPath.setAttribute("d", "M10 8l6 4-6 4V8z");
    }
    if (currentLi) currentLi.querySelector(".play-icon").src = "play.svg";
    currentPlaying = null;
    currentCard = null;
    currentLi = null;
  });

  audio.addEventListener("timeupdate", () => {
    if (audio.duration) {
      seekbar.value = (audio.currentTime / audio.duration) * 100;
      currentTimeEl.textContent = formatTime(audio.currentTime);
      totalDurationEl.textContent = formatTime(audio.duration);
    }
  });

  seekbar.addEventListener("input", (e) => {
    if (audio.duration) {
      const seekTo = (e.target.value / 100) * audio.duration;
      audio.currentTime = seekTo;
    }
  });

  volumeSlider.addEventListener("input", (e) => {
    audio.volume = e.target.value / 100;
  });

  function formatTime(sec) {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  }

  document.querySelector(".hamburger").addEventListener("click", () => {
    document.querySelector(".left").style.left = "0";
  });

  document.querySelector(".close").addEventListener("click", () => {
    document.querySelector(".left").style.left = "-200%";
  });
}

main();
