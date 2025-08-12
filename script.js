async function getsongs() {
  let res = await fetch("song.json"); // songs.json is in your repo
  let songList = await res.json();

  let songs = songList.filter(item => item.file.toLowerCase().endsWith(".mp3"));
  let images = songList.filter(
    item =>
      item.file.toLowerCase().endsWith(".jpg") || item.file.toLowerCase().endsWith(".png")
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
  let playMode = "all";
  let songData = [];
  let favorites = new Set();

  // Build cards from JSON
  for (let i = 0; i < songs.length; i++) {
    const songUrl = songs[i].file;
    const nameOnly = songs[i].title || decodeURIComponent(songUrl.split("/").pop()).replace(/\.mp3$/i, "").trim();
    const sanitizedName = nameOnly.toLowerCase().replace(/[^a-z0-9]/g, "");

    const matchedImage = images.find(img =>
      img.title && img.title.toLowerCase().replace(/[^a-z0-9]/g, "") === sanitizedName
    );

    let imgSrc = matchedImage ? matchedImage.file : "music.svg";

    songData.push({ title: nameOnly, url: songUrl, img: imgSrc });

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

    // Play click
    card.querySelector(".playbtn").addEventListener("click", () => {
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
