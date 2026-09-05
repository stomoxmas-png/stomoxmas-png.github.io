(function () {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      ctx = new AudioContextClass();
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  // notes: [{ freq, start, duration }] を順に鳴らす（単位は秒）
  function playNotes(notes, type) {
    const audioCtx = getCtx();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    notes.forEach(({ freq, start, duration }) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;

      const t0 = now + start;
      const t1 = t0 + duration;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t1);

      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t1 + 0.02);
    });
  }

  function playSelect() {
    playNotes([{ freq: 880, start: 0, duration: 0.08 }], 'square');
  }

  function playCorrect() {
    playNotes(
      [
        // ド→ミ→ソ→ド（高）と駆け上がる
        { freq: 523.25, start: 0, duration: 0.09 },
        { freq: 659.25, start: 0.08, duration: 0.09 },
        { freq: 783.99, start: 0.16, duration: 0.09 },
        { freq: 1046.5, start: 0.24, duration: 0.12 },
        // 仕上げにきらびやかな和音（ド・ミ・ソの高音を同時に伸ばす）
        { freq: 1046.5, start: 0.34, duration: 0.4 },
        { freq: 1318.51, start: 0.34, duration: 0.4 },
        { freq: 1567.98, start: 0.34, duration: 0.4 },
      ],
      'sine'
    );
  }

  function playWrong() {
    playNotes(
      [
        { freq: 220, start: 0, duration: 0.16 },
        { freq: 174.61, start: 0.15, duration: 0.22 },
      ],
      'sawtooth'
    );
  }

  // 結果画面：100点（全問正解）のときの華やかなファンファーレ
  function playPerfect() {
    playNotes(
      [
        { freq: 523.25, start: 0, duration: 0.1 },
        { freq: 659.25, start: 0.1, duration: 0.1 },
        { freq: 783.99, start: 0.2, duration: 0.1 },
        { freq: 1046.5, start: 0.3, duration: 0.35 },
      ],
      'square'
    );
  }

  // 結果画面：100点以外のときの、控えめな終了チャイム
  function playFinish() {
    playNotes(
      [
        { freq: 659.25, start: 0, duration: 0.14 },
        { freq: 523.25, start: 0.13, duration: 0.28 },
      ],
      'sine'
    );
  }

  window.QuizSound = { playSelect, playCorrect, playWrong, playPerfect, playFinish };
})();
