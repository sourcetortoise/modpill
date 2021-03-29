var modArchiveDownloadLink = "https://api.modarchive.org/downloads.php?moduleid=";
var modArchivePageLink = "https://modarchive.org/index.php?request=view_by_moduleid&query=";

window['libopenmpt'] = {};
libopenmpt.locateFile = function (filename) {
  return "//cdn.jsdelivr.net/gh/deskjet/chiptune2.js@master/" + filename;
};

libopenmpt.onRuntimeInitialized = function () {
  var player;
  var songList;
  var songIndex = 0;
  var isPlaying = false;
  var isPaused = false;
  var tempoPitchReset = false;
  var loop = true;

  function initPlayer() {
    if (player == undefined) {
      player = new ChiptuneJsPlayer(new ChiptuneJsConfig(-1));
    }
  }

  function showTrackMetadata(filename) {
    var metadata = player.metadata();
    if (metadata['title'] != '') {
      document.getElementById('title').innerHTML = metadata['title'];
    } else {
      document.getElementById('title').innerHTML = filename;
    }
    if (metadata['artist'] != '') {
      document.getElementById('artist').innerHTML = '<br />' + metadata['artist'];
    } else {
      document.getElementById('artist').innerHTML = '';
    }
  }

  function setModarchiveLink(id) {
    linkElement = document.getElementById('modarchive-track-link');
    linkElement.style = 'display: inline-block';
    linkElement.href = modArchivePageLink + id;
  }

  function afterLoad(path, buffer) {
    player.play(buffer);
    if (tempoPitchReset) {
      resetPitchAndTempo();
    } else {
      setSongToSliderValues();
    }
    showTrackMetadata(path);
    turnButtonToPause();
  }

  function loadURL(id) {
    path = modArchiveDownloadLink + id;
    initPlayer();
    player.load(path, afterLoad.bind(this, path));
    setModarchiveLink(id);
  }

  function preloadTrack(id) {
    var request = new XMLHttpRequest();
    request.open('GET', modArchiveDownloadLink + id);
    request.send();
  }

  function preloadNextTrack() {
    if ((songIndex + 1) >= songList.length) {
      preloadTrack(songList[0].id);
    } else {
      preloadTrack(songList[songIndex + 1].id);
    }
  }

  function getFavouritesList() {
    var request = new XMLHttpRequest();
    request.open('GET', 'https://www.christiandewolf.com/mods');
    request.setRequestHeader('Content-Type', 'application/json');

    request.onreadystatechange = function () {
      if (this.readyState === 4) {
        var favList = [];
        JSON.parse(this.responseText).forEach(function(fav) {
          favList.push({title: fav[0], id: fav[1]});
        });
        console.log(`${favList.length} favourites loaded.`);
        songList = shuffleArray(favList);
        preloadTrack(songList[0].id);
        preloadTrack(songList[1].id);
      }
    };
    request.send();
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // PLAY/PAUSE BUTTONS

  function pressMainButton() {
    if (isPlaying) {
      // PAUSE PLAY
      isPlaying = false;
      isPaused = true;
      player.togglePause();
      turnButtonToPlay();
      disableSliders();
    } else {
      // START PLAY
      isPlaying = true;
      if (isPaused) {
        player.togglePause();
      } else {
        loadURL(songList[songIndex].id);
      }
      turnButtonToPause();
      enableSliders();
    }
  }

  function pressNextButton() {
    isPlaying = true;
    incrementSongIndex();
    loadURL(songList[songIndex].id);
    turnButtonToPause();
    enableSliders();
    preloadNextTrack();
  }

  function pressPreviousButton() {
    isPlaying = true;
    decrementSongIndex();
    loadURL(songList[songIndex].id);
    turnButtonToPause();
    enableSliders();
  }

  function incrementSongIndex() {
    songIndex += 1;
    if (songIndex >= songList.length) {
      songIndex = 0;
    }
  }

  function decrementSongIndex() {
    songIndex -= 1;
    if (songIndex < 0) {
      songIndex = songList.length - 1;
    }
  }

  function turnButtonToPlay() {
    var button = document.getElementById('pause')
    if (button) {
      button.id = "play";
    }
  }

  function turnButtonToPause() {
    var button = document.getElementById('play')
    if (button) {
      button.id = "pause";
    }
  }

  function enableSliders() {
    document.getElementById('tempo').disabled = false;
    document.getElementById('pitch').disabled = false;
  }

  function disableSliders() {
    document.getElementById('tempo').disabled = true;
    document.getElementById('pitch').disabled = true;
  }

  function setSongToSliderValues(force = null) {
    if (force || !tempoPitchReset) {
      var tempo = document.getElementById('tempo').value.toString();
      player.module_ctl_set('play.tempo_factor', tempo);
      var pitch = document.getElementById('pitch').value.toString();
      player.module_ctl_set('play.pitch_factor', pitch);
    }
  }

  function resetPitchAndTempo() {
    document.querySelectorAll('#pitch,#tempo').forEach(e => e.value = 1);
    setSongToSliderValues(true);
  }

  // click handlers
  document.querySelector('#play').addEventListener('click', pressMainButton, false);
  document.querySelector('#next').addEventListener('click', pressNextButton, false);
  document.querySelector('#pitch').addEventListener('input', function (e) {
    player.module_ctl_set('play.pitch_factor', e.target.value.toString());
  }, false);
  document.querySelector('#tempo').addEventListener('input', function (e) {
    player.module_ctl_set('play.tempo_factor', e.target.value.toString());
  }, false);
  document.querySelector('#reset-link').addEventListener('click', resetPitchAndTempo, false);
  // document.querySelector('#volume').addEventListener('input', function (e) {
  //   player.module_ctl_set('play.opl.volume_factor', e.target.value.toString());
  // }, false);

  // key handlers for pause/next
  window.addEventListener("keydown", function(e) {
    if (e.key === " " ) {
      pressMainButton();
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      pressNextButton();
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      pressPreviousButton();
      e.preventDefault();
    }
  });

  getFavouritesList();
};