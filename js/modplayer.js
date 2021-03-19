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

  function setMetadata(filename) {
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

  function afterLoad(path, buffer) {
    player.play(buffer);
    if (tempoPitchReset) {
      resetPitchAndTempo();
    } else {
      setSongToSliderValues();
    }
    setMetadata(path);
    turnButtonToPause();
  }

  function loadURL(path) {
    initPlayer();
    player.load(path, afterLoad.bind(this, path));
  }

  // TODO get titles dynamically
  function getFavouritesList() {
    // let response = fetch('https://modarchive.org/index.php?request=view_member_favourites_text&query=93325');

    // if (response.ok) { // if HTTP-status is 200-299
    //   console.log(response);
    //   let responseString = response.toString();
    //   console.log(responseString);
    // } else {
    //   alert("HTTP-Error: " + response.status);
    // }

    return shuffleArray([
      "169695#fletch.mod", "106736#elimination.mod", "98591#electrified_tunes.mod", "76217#leftover.mod", "47305#laidback2.mod",
      "96477#laxity_remix.mod", "126874#computer_sins.mod", "77424#rise_up.mod", "44953#japanese.mod", "35151#bananasplit.mod",
      "112684#jumpin_rattle_bup.mod", "117448#engage_warp_2.mod", "117617#egotrance.mod", "164488#ramosa_-_in_the_mood.mod",
      "116190#ram_intro08.mod", "115634#ram_intro05.mod", "119465#air_hockey.mod", "104854#happy_movement.mod",
      "106144#its_so_cool.mod", "106416#_25kb_to_proxima.mod", "105206#alone_with_you.mod", "36849#chipslay.mod",
      "98053#elfmania_level_5_goblin_cave.mod", "96423#elfmania_level_1_forest.mod", "90965#wormholes.mod",
      "90278#supermarket_music.mod", "92253#sound_of_vantaa_ii.mod", "68825#soul_free.mod", "52333#molrevenge.mod",
      "118289#humania.mod", "108441#sylvias_theme.mod", "68019#melodee-laxity.mod", "65377#48tpi.mod",
      "161525#spaceman_-_emotions.mod", "48397#lk-weird_p.mod", "53111#R-VERT.S3M", "47791#kingsize2.mod",
      "80836#shining_people.mod", "76259#winners.mod", "93822#cooking_it_up.mod", "40826#f-mountn.mod", "41197#eggshell.mod",
      "57925#space_debris.mod", "113863#astral_trip.mod", "62347#swing2.mod", "43649#fruit.mod", "106227#wild_impressions.mod",
      "105709#trans_atlantic.mod", "106400#desert_dawn.mod", "103193#nordic_report_3.mod", "86068#sledgehammer2.mod",
      "81185#broken_hearted.mod", "42560#GSLINGER.MOD", "61086#4-mat_backfb.mod", "35277#DAWN.MOD",
      "110845#dawn_of_the_beavers.mod", "38382#diginnov.mod", "66037#aces-high.mod", "111234#88_funky_avenue.mod",
      "56098#seaoflov.mod", "128132#mint.mod", "125058#gold_return.mod", "159181#hein_-_sloom.mod", "40475#ELYSIUM.MOD",
      "66036#4mats-madness.mod", "77565#anarchymenu_03.mod", "158468#zing_-_true.mod", "34592#BUD.MOD",
      "105136#hallucinations.mod", "41349#fantvoy2.mod",
    ]);
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getRandomSong() {
    return songList[Math.floor(Math.random() * songList.length)];
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
        loadURL("https://api.modarchive.org/downloads.php?moduleid=" + songList[songIndex]);
      }
      turnButtonToPause();
      enableSliders();
    }
  }

  function pressNextButton() {
    player.stop();
    isPlaying = true;
    incrementSongIndex();
    loadURL("https://api.modarchive.org/downloads.php?moduleid=" + songList[songIndex]);
    turnButtonToPause();
  }

  function incrementSongIndex() {
    songIndex += 1;
    if (songIndex >= songList.length) {
      songIndex = 0;
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
  // document.querySelector('#volume').addEventListener('input', function (e) {
  //   player.module_ctl_set('play.opl.volume_factor', e.target.value.toString());
  // }, false);
  document.querySelector('#reset-link').addEventListener('click', resetPitchAndTempo, false);


  songList = getFavouritesList();
};