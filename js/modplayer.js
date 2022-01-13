var dev = document.location.host == "localhost";

var shareLink = `http${dev ? '://localhost' : 's://christiancodes.github.io'}/mirthturtle-modplayer/`;

var modArchiveDownloadLink = "https://api.modarchive.org/downloads.php?moduleid=";
var modArchivePageLink = "https://modarchive.org/index.php?request=view_by_moduleid&query=";

window['libopenmpt'] = {};
libopenmpt.locateFile = function (filename) {
  return "js/" + filename;
};

libopenmpt.onRuntimeInitialized = function () {
  var player;
  var songList = [];
  var songIndex = 0;
  var currentMetadata = {'title': 'loading...'};

  var isPlaying = false;
  var isPaused = false;
  var isLooping = false;

  var gain = 1;

  var currentConfig = new ChiptuneJsConfig(0);
  var nightMode = false;

  // create player with config and set default loop behaviour
  function initPlayer() {
    if (player == undefined) {
      player = new ChiptuneJsPlayer(currentConfig);
      setLoopBehaviour();
    }
  }

  function setLoopBehaviour() {
    if (isLooping) {
      player.onEnded(function () {
        // TODO make this better. does not loop cleanly
        loadTrackById(songList[songIndex].id)
      });
    } else {
      player.onEnded(function () {
        pressNextButton();
      });
    }
  }

  function showTrackMetadata(filename) {
    currentMetadata = player.metadata();
    if (!currentMetadata['title']) {
      currentMetadata['title'] = filename;
    }
    document.title = currentMetadata['title'] + " – Mirth Turtle's MOD Player";
    printInfo( currentMetadata['title'] );
  }

  function printInfo(info) {
    document.getElementById('title').innerHTML = info;
  }

  function setModarchiveLinkAndShow(id) {
    linkElement = document.getElementById('modarchive-track-link');
    linkElement.style = 'display: inline-block';
    linkElement.href = modArchivePageLink + id;

    clipboardElement = document.getElementById('clipboard-button');
    clipboardElement.style = 'display: inline-block';
  }

  function playAfterLoad(options, buffer) {
    player.play(buffer);
    if (!options.autoplay) {
      player.togglePause();
    }
    showTrackMetadata(options.filename);

    // volume hack
    gain = player.context.createGain();  // create a GainNode
    gain.connect(player.context.destination); // wire gain to speaker output
    player.currentPlayingNode.disconnect();  // disconnect internal ScriptProcessorNode from speakers
    player.currentPlayingNode.connect(gain); // wire script processor to gain

    setSongToSliderValues();
  }

  function loadTrackById(id, autoplay = true) {
    path = modArchiveDownloadLink + id;

    initPlayer();
    player.load(path, playAfterLoad.bind(this, {'autoplay': autoplay, 'filename': path}));

    setModarchiveLinkAndShow(id);
    if (autoplay) {
      turnButtonToPause();
    }
  }

  function trackShareLink(id) {
    return `${shareLink}#${id}`;
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

  function preloadIcons() {
    var img = new Image();
    var img2 = new Image();
    var img3 = new Image();
    var img4 = new Image();
    img.src = "img/pause.svg";
    img2.src = "img/loop-active.svg";
    img3.src = "img/file.png";
    img4.src = "img/link.png";
  }

  function getFavouritesList() {
    var request = new XMLHttpRequest();
    request.open('GET', 'https://www.myshimari.com/mods');  // call /testmods for shorter songs
    request.setRequestHeader('Content-Type', 'application/json');

    request.onreadystatechange = function () {
      var favList = [];
      if (this.readyState === 4) {
        try {
          JSON.parse(this.responseText).forEach(function(fav) {
            favList.push({title: fav[0], id: fav[1]});
          });
        } catch (error) {
          console.error("API error", error);
          // bad API return – use local playlist
          favList = getOfflineList();
        }

        currentMetadata['title'] = `Press play to start • ${favList.length} tracks loaded`;
        printInfo( currentMetadata['title'] );

        songList = shuffleArray(favList);
        findSongFromUrlHash();

        // preload first 2 tracks
        preloadTrack(songList[songIndex].id);
        if (songIndex == songList.length - 1) {
          preloadTrack(songList[0].id);
        } else {
          preloadTrack(songList[songIndex + 1].id);
        }
      }
    };
    request.send();
  }

  function getOfflineList() {
    var list = [];
    offlineFavList.forEach(function(fav) {
      list.push({title: fav[0], id: fav[1]})
    });
    return list;
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function findSongFromUrlHash() {
    var hashId = window.location.hash.slice(1);
    if (hashId) {
      var song = songList.find(function(songHash) {
        return songHash.id == hashId;
      })
      if (song) {
        // set the cursor for the current song
        songIndex = songList.indexOf(song);

        // light up controls and title, but don't autoplay
        loadTrackById(song.id, false);
      }
    }
    window.location.hash = "";
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
      // START PLAY (if loaded)
      if (songList.length > 0) {
        isPlaying = true;
        if (isPaused) {
          player.togglePause();
        } else {
          loadTrackById(songList[songIndex].id);
        }
        turnButtonToPause();
        enableSliders();
        enableNextButton();
        enableAndUpdateLoopButton();
      }
    }
  }

  function pressNextButton() {
    if (!document.getElementById('next').classList.contains('disabled-button')) {
      isPlaying = true;
      incrementSongIndex();
      loadTrackById(songList[songIndex].id);
      turnButtonToPause();
      enableSliders();
      preloadNextTrack();
    }
  }

  function pressPreviousButton() {
    isPlaying = true;
    decrementSongIndex();
    loadTrackById(songList[songIndex].id);
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
    var button = document.getElementById('pause');
    if (button) {
      button.id = "play";
    }
  }

  function turnButtonToPause() {
    var button = document.getElementById('play');
    if (button) {
      button.id = "pause";
    }
  }

  function enableSliders() {
    document.getElementById('tempo').disabled = false;
    document.getElementById('pitch').disabled = false;
    document.getElementById('volume').disabled = false;
  }

  function enableNextButton()  { document.getElementById('next').classList.remove("disabled-button"); }
  function disableNextButton() { document.getElementById('next').classList.add("disabled-button"); }
  function disableLoopButton() { document.getElementById('loop').classList.add("disabled-button"); }


  function disableSliders() {
    document.getElementById('tempo').disabled = true;
    document.getElementById('pitch').disabled = true;
    document.getElementById('volume').disabled = true;
  }

  function setSongToSliderValues() {
    var tempo = document.getElementById('tempo').value.toString();
    player.module_ctl_set('play.tempo_factor', tempo);
    var pitch = document.getElementById('pitch').value.toString();
    player.module_ctl_set('play.pitch_factor', pitch);
    var volume = document.getElementById('volume').value.toString();
    gain.gain.value = volume;
  }

  function resetPitchAndTempo() {
    document.querySelectorAll('#pitch,#tempo').forEach(e => e.value = 1);
    setSongToSliderValues();
  }

  function toggleLoop() {
    // only works when it's enabled / playing
    if (!document.getElementById('loop').classList.contains('disabled-button')) {
      isLooping = !isLooping;
      setLoopBehaviour();
      enableAndUpdateLoopButton();
    }
  }

  function enableAndUpdateLoopButton() {
    document.getElementById('loop').classList.remove("disabled-button");
    if (isLooping) {
      document.getElementById('loop').classList.add("loop-active");
    } else {
      document.getElementById('loop').classList.remove("loop-active");
    }
  }

  function clipboardClick() {
    var theShareLink = trackShareLink(songList[songIndex].id);
    var sampleText = document.getElementById("sharelink-box");
    sampleText.value = theShareLink;
    sampleText.select();
    sampleText.setSelectionRange(0, 99999)
    document.execCommand("copy");

    printInfo("copied!");
  }

  // HOVERS
  function hoverModarchiveLink()  { printInfo("view on modarchive.org"); }
  function hoverClipboardButton() { printInfo("copy link to clipboard"); }
  function hoverTurtle()   { printInfo("visit mirthturtle.com"); }
  function hoverReset()    { printInfo("reset tempo and pitch"); }
  function hoverSource()   { printInfo("view source code"); }
  function hoverPlaylist() { printInfo("browse playlist");  }

  function hoverDayNight() {
    if (nightMode) {
      printInfo("work mode");
    } else {
      printInfo("party mode");
    }
  }

  function hoverLockIcon() {
    if (isPlaying) {
      if (locked) {
        printInfo("unlock controls");
      } else {
        printInfo("lock controls for mobile");
      }
    } else {
      printInfo("lock controls when playing");
    }
  }

  function showTrackInfo() {
    printInfo( currentMetadata['title'] );
  }

  // PARTY MODE

  function toggleDayAndNight() {
    var toggleLink = document.getElementById('day-night-link');
    var stylesheet = document.getElementById('nightmode-css');
    var fileIcon = document.getElementById('track-file-image');
    var shareIcon = document.getElementById('track-share-image');
    var turtle = document.getElementById('mirthturtle-logo');

    nightMode = !nightMode;
    if (nightMode) {
      toggleLink.text = "☀"
      stylesheet.disabled = '';
      fileIcon.src = "img/file-white.png";
      shareIcon.src = "img/link-white.png";
      turtle.src = "img/mirthturtle-party.png";
    } else {
      toggleLink.text = "☾"
      stylesheet.disabled = 'disabled';
      fileIcon.src = "img/file.png";
      shareIcon.src = "img/link.png";
      turtle.src = "img/mirthturtle.png";
    }
  }

  // CLICK HANDLERS //

  // main buttons
  document.querySelector('#play').addEventListener('click', pressMainButton, false);
  document.querySelector('#next').addEventListener('click', pressNextButton, false);
  document.querySelector('#loop').addEventListener('click', toggleLoop, false);

  // sliders
  document.querySelector('#pitch').addEventListener('input', function (e) {
    setSongToSliderValues();
    printInfo(`pitch: ${Math.round(document.getElementById('pitch').value*100).toString()}%`);
  }, false);
  document.querySelector('#tempo').addEventListener('input', function (e) {
    setSongToSliderValues();
    printInfo(`tempo: ${Math.round(document.getElementById('tempo').value*100).toString()}%`);
  }, false);
  document.querySelector('#volume').addEventListener('input', function (e) {
    setSongToSliderValues();
    printInfo(`volume: ${Math.round(document.getElementById('volume').value*100).toString()}%`);
  }, false);


  // links and buttons
  document.querySelector('#reset-link').addEventListener('click', resetPitchAndTempo, false);
  document.querySelector('#clipboard-button').addEventListener('click', clipboardClick, false);
  document.querySelector('#day-night-link').addEventListener('click', toggleDayAndNight, false);

  // hover
  document.querySelector('#modarchive-track-link').addEventListener('mouseover', hoverModarchiveLink, false);
  document.querySelector('#modarchive-track-link').addEventListener('mouseout', showTrackInfo, false);

  document.querySelector('#clipboard-button').addEventListener('mouseover', hoverClipboardButton, false);
  document.querySelector('#clipboard-button').addEventListener('mouseout', showTrackInfo, false);

  document.querySelector('#mirthturtle-logo').addEventListener('mouseover', hoverTurtle, false);
  document.querySelector('#mirthturtle-logo').addEventListener('mouseout', showTrackInfo, false);

  document.querySelector('#reset-link').addEventListener('mouseover', hoverReset, false);
  document.querySelector('#reset-link').addEventListener('mouseout', showTrackInfo, false);

  document.querySelector('#source-link').addEventListener('mouseover', hoverSource, false);
  document.querySelector('#source-link').addEventListener('mouseout', showTrackInfo, false);

  document.querySelector('#playlist-link').addEventListener('mouseover', hoverPlaylist, false);
  document.querySelector('#playlist-link').addEventListener('mouseout', showTrackInfo, false);

  document.querySelector('#day-night-link').addEventListener('mouseover', hoverDayNight, false);
  document.querySelector('#day-night-link').addEventListener('mouseout', showTrackInfo, false);

  document.querySelector('#volume').addEventListener('mouseout', showTrackInfo, false);
  document.querySelector('#pitch').addEventListener('mouseout', showTrackInfo, false);
  document.querySelector('#tempo').addEventListener('mouseout', showTrackInfo, false);
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
    } else if (e.key === "l") {
      toggleLoop();
      e.preventDefault();
    }
  });

  // ON START
  getFavouritesList();
  preloadIcons();
};
