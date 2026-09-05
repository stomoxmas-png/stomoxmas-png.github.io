(function () {
  const screens = {
    subjects: document.getElementById('screen-subjects'),
    genres: document.getElementById('screen-genres'),
    quiz: document.getElementById('screen-quiz'),
    result: document.getElementById('screen-result'),
  };

  const SUBJECT_THEME = {
    国語: 'kokugo',
    算数: 'sansu',
    理科: 'rika',
    社会: 'shakai',
    英語: 'eigo',
  };

  function applyTheme(subject) {
    const slug = SUBJECT_THEME[subject];
    if (slug) {
      document.body.dataset.theme = slug;
    } else {
      delete document.body.dataset.theme;
    }
  }

  const el = {
    appHeader: document.querySelector('.app-header'),
    subjectList: document.getElementById('subject-list'),
    genreScreenTitle: document.getElementById('genre-screen-title'),
    genreList: document.getElementById('genre-list'),
    countSelector: document.getElementById('count-selector'),
    quizProgress: document.getElementById('quiz-progress'),
    quizPassage: document.getElementById('quiz-passage'),
    quizImage: document.getElementById('quiz-image'),
    quizSymbol: document.getElementById('quiz-symbol'),
    quizQuestion: document.getElementById('quiz-question'),
    quizChoices: document.getElementById('quiz-choices'),
    quizFeedback: document.getElementById('quiz-feedback'),
    quizExplanation: document.getElementById('quiz-explanation'),
    btnBack: document.getElementById('btn-back'),
    btnReveal: document.getElementById('btn-reveal'),
    btnNext: document.getElementById('btn-next'),
    resultScore: document.getElementById('result-score'),
    resultTime: document.getElementById('result-time'),
    resultMessage: document.getElementById('result-message'),
    resultToGenresBtn: document.querySelector('#screen-result [data-action="to-genres"]'),
    confettiLayer: document.getElementById('confetti-layer'),
  };

  const CONFETTI_COLORS = ['#ff8a3d', '#e5484d', '#3b82f6', '#22a55e', '#f2a900', '#ec4899'];

  function spawnConfetti() {
    el.confettiLayer.innerHTML = '';
    const pieceCount = 60;
    for (let i = 0; i < pieceCount; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      piece.style.animationDuration = `${1.8 + Math.random() * 1.2}s`;
      piece.style.animationDelay = `${Math.random() * 0.6}s`;
      el.confettiLayer.appendChild(piece);
    }
  }

  let feedbackTimer = null;

  function showFeedbackToast() {
    clearTimeout(feedbackTimer);
    el.quizFeedback.classList.add('show');
    feedbackTimer = setTimeout(() => {
      el.quizFeedback.classList.remove('show');
    }, 1400);
  }

  function hideFeedbackToast() {
    clearTimeout(feedbackTimer);
    el.quizFeedback.classList.remove('show');
  }

  const state = {
    subjects: null, // { 国語: [ジャンル...], ... }
    currentSubject: null,
    currentGenre: null,
    session: null,
    isRandom: false,
    randomScope: null, // ランダムの対象を科目内に絞る場合はその科目名、全科目対象なら null
    questionCount: 5, // ジャンル選択画面で選ぶ出題数（3・5・10）
    quizQuestionCount: 5, // 今回のセッション開始時に使われた出題数タイア（ベストタイムの記録単位）
    quizStartedAt: null, // 今回のセッションの開始時刻（Date.now()）
  };

  function formatTime(ms) {
    const totalSeconds = Math.round(ms / 1000);
    if (totalSeconds < 60) {
      return `${totalSeconds}秒`;
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}分${seconds}秒`;
  }

  function showScreen(name) {
    Object.entries(screens).forEach(([key, node]) => {
      node.hidden = key !== name;
    });
    el.appHeader.hidden = name !== 'subjects';
    if (name === 'subjects') {
      applyTheme(null);
    }
  }

  async function loadSubjects() {
    if (state.subjects) return state.subjects;
    const res = await fetch('data/subjects.json');
    state.subjects = await res.json();
    return state.subjects;
  }

  async function loadGenreQuestions(subject, genre) {
    const url = `data/${encodeURIComponent(subject)}/${encodeURIComponent(genre)}.json`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`問題データの読み込みに失敗しました: ${url}`);
    }
    return res.json();
  }

  function renderSubjects() {
    el.subjectList.innerHTML = '';
    Object.keys(state.subjects).forEach((subject) => {
      const btn = document.createElement('button');
      btn.className = 'card-btn';
      const slug = SUBJECT_THEME[subject];
      if (slug) {
        btn.classList.add(`card-btn--${slug}`);
      }
      btn.textContent = subject;
      btn.addEventListener('click', () => openSubject(subject));
      el.subjectList.appendChild(btn);
    });

    const omakaseBtn = document.createElement('button');
    omakaseBtn.className = 'card-btn card-btn-random';
    omakaseBtn.textContent = '科目おまかせ';
    omakaseBtn.addEventListener('click', () => {
      const subjectNames = Object.keys(state.subjects);
      const pick = subjectNames[Math.floor(Math.random() * subjectNames.length)];
      openSubject(pick);
    });
    el.subjectList.appendChild(omakaseBtn);

    const randomBtn = document.createElement('button');
    randomBtn.className = 'card-btn card-btn-random';
    randomBtn.textContent = 'ランダム';
    randomBtn.addEventListener('click', () => startRandomQuiz(null));
    el.subjectList.appendChild(randomBtn);
  }

  function updateCountSelectorUI() {
    el.countSelector.querySelectorAll('.count-btn').forEach((btn) => {
      btn.classList.toggle('selected', Number(btn.dataset.count) === state.questionCount);
    });
  }

  function openSubject(subject) {
    state.currentSubject = subject;
    applyTheme(subject);
    el.genreScreenTitle.textContent = `${subject}のジャンルをえらんでね`;
    renderGenres(subject);
    showScreen('genres');
  }

  function renderGenres(subject) {
    updateCountSelectorUI();
    el.genreList.innerHTML = '';
    state.subjects[subject].forEach((genre) => {
      const stats = window.QuizStorage.getGenreStats(subject, genre);
      const btn = document.createElement('button');
      btn.className = 'card-btn';

      const label = document.createElement('span');
      label.textContent = genre;
      btn.appendChild(label);

      if (stats.plays > 0) {
        const scoreEl = document.createElement('span');
        scoreEl.className = 'high-score';
        scoreEl.textContent = `ベスト ${stats.bestScore}点`;
        btn.appendChild(scoreEl);

        const timeParts = [3, 5, 10]
          .filter((n) => stats.bestTimes[n] != null)
          .map((n) => `${n}問 ${formatTime(stats.bestTimes[n])}`);
        if (timeParts.length > 0) {
          const timesEl = document.createElement('span');
          timesEl.className = 'best-times';
          timesEl.textContent = timeParts.join(' / ');
          btn.appendChild(timesEl);
        }
      }

      btn.addEventListener('click', () => startQuiz(subject, genre, state.questionCount));
      el.genreList.appendChild(btn);
    });

    const genreOmakaseBtn = document.createElement('button');
    genreOmakaseBtn.className = 'card-btn card-btn-random';
    genreOmakaseBtn.textContent = 'ジャンルおまかせ';
    genreOmakaseBtn.addEventListener('click', () => {
      const genres = state.subjects[subject];
      const pick = genres[Math.floor(Math.random() * genres.length)];
      startQuiz(subject, pick, state.questionCount);
    });
    el.genreList.appendChild(genreOmakaseBtn);

    const randomBtn = document.createElement('button');
    randomBtn.className = 'card-btn card-btn-random';
    randomBtn.textContent = `${subject}のランダム`;
    randomBtn.addEventListener('click', () => startRandomQuiz(subject, state.questionCount));
    el.genreList.appendChild(randomBtn);
  }

  async function startQuiz(subject, genre, count) {
    state.isRandom = false;
    state.randomScope = null;
    state.currentSubject = subject;
    state.currentGenre = genre;
    state.quizQuestionCount = count || 5;
    applyTheme(subject);
    let questions;
    try {
      questions = await loadGenreQuestions(subject, genre);
    } catch (err) {
      alert(err.message);
      return;
    }
    state.session = window.QuizEngine.createQuizSession(questions, count);
    state.quizStartedAt = Date.now();
    showScreen('quiz');
    renderQuizQuestion();
  }

  async function startRandomQuiz(subjectFilter, count) {
    const pairs = [];
    Object.entries(state.subjects).forEach(([subject, genres]) => {
      if (subjectFilter && subject !== subjectFilter) return;
      genres.forEach((genre) => pairs.push([subject, genre]));
    });

    let allQuestions;
    try {
      const lists = await Promise.all(
        pairs.map(([subject, genre]) => loadGenreQuestions(subject, genre))
      );
      allQuestions = lists.flat();
    } catch (err) {
      alert('問題データの読み込みに失敗しました');
      return;
    }

    state.isRandom = true;
    state.randomScope = subjectFilter || null;
    state.currentSubject = subjectFilter || 'ランダム';
    state.currentGenre = 'ランダム';
    state.quizQuestionCount = count || 5;
    applyTheme(subjectFilter);
    state.session = window.QuizEngine.createQuizSession(allQuestions, count);
    state.quizStartedAt = Date.now();
    showScreen('quiz');
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    const session = state.session;
    const item = session.current();
    const q = item.question;
    const isChoice = session.isChoiceQuestion(item);

    el.quizProgress.textContent = `${session.index + 1} / ${session.total()}問`;

    if (q.passage) {
      el.quizPassage.textContent = q.passage;
      el.quizPassage.hidden = false;
    } else {
      el.quizPassage.hidden = true;
    }

    if (q.image) {
      el.quizImage.src = q.image;
      el.quizImage.alt = '問題の画像';
      el.quizImage.hidden = false;
    } else {
      el.quizImage.hidden = true;
      el.quizImage.removeAttribute('src');
    }

    if (q.symbol) {
      el.quizSymbol.textContent = q.symbol;
      el.quizSymbol.hidden = false;
    } else {
      el.quizSymbol.hidden = true;
    }

    el.quizQuestion.textContent = q.question;

    el.quizChoices.innerHTML = '';

    if (isChoice) {
      q.choices.forEach((choiceText, choiceIndex) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';

        if (item.selectedIndex === choiceIndex) {
          btn.classList.add('selected');
        }

        if (item.revealed) {
          btn.disabled = true;
          if (choiceIndex === q.answer) {
            btn.classList.add('correct');
            btn.textContent = `○ ${choiceText}`;
          } else {
            if (choiceIndex === item.selectedIndex) {
              btn.classList.add('wrong');
            }
            btn.textContent = `× ${choiceText}`;
          }
        } else {
          btn.textContent = choiceText;
          btn.addEventListener('click', () => {
            window.QuizSound.playSelect();
            session.select(choiceIndex);
            renderQuizQuestion();
          });
        }

        el.quizChoices.appendChild(btn);
      });
    } else if (!item.revealed) {
      const hint = document.createElement('p');
      hint.className = 'recall-hint';
      hint.textContent = '頭の中で（またはノートに）答えを考えてから「答えを見る」を押してね';
      el.quizChoices.appendChild(hint);
    } else {
      [
        { label: '○ せいかいできた', isCorrectOption: true },
        { label: '× おしい、まちがえた', isCorrectOption: false },
      ].forEach(({ label, isCorrectOption }) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = label;

        if (item.selfCorrect === isCorrectOption) {
          btn.classList.add('selected');
        }

        if (item.selfCorrect !== null) {
          btn.disabled = true;
        } else {
          btn.addEventListener('click', () => {
            isCorrectOption ? window.QuizSound.playCorrect() : window.QuizSound.playWrong();
            session.setSelfCorrect(isCorrectOption);
            renderQuizQuestion();
          });
        }

        el.quizChoices.appendChild(btn);
      });
    }

    if (item.revealed && isChoice) {
      const correct = session.isCorrect(item);
      el.quizFeedback.textContent = correct ? '正解！' : 'まちがい！';
      el.quizFeedback.classList.toggle('correct', correct);
      el.quizFeedback.classList.toggle('wrong', !correct);
      showFeedbackToast();
    } else {
      hideFeedbackToast();
    }

    if (item.revealed) {
      let explanationText = '';
      if (!isChoice && Array.isArray(q.answers)) {
        explanationText += `正解：${q.answers.join('、')}\n`;
      }
      explanationText += q.explanation || '';
      explanationText = explanationText.trim();
      el.quizExplanation.textContent = explanationText;
      el.quizExplanation.hidden = explanationText === '';

      el.btnReveal.hidden = true;
      if (session.canAdvance()) {
        el.btnNext.hidden = false;
        el.btnNext.textContent = session.isLast() ? 'けっかを見る' : '次へ';
      } else {
        el.btnNext.hidden = true;
      }
    } else {
      el.quizExplanation.hidden = true;
      el.btnReveal.hidden = false;
      el.btnReveal.disabled = !session.canReveal();
      el.btnNext.hidden = true;
    }

    el.btnBack.disabled = false;
    el.btnBack.textContent = 'ジャンル選びに戻る';
  }

  function handleReveal() {
    const session = state.session;
    const item = session.current();
    const revealed = session.reveal();
    if (revealed) {
      if (session.isChoiceQuestion(item)) {
        session.isCorrect(item) ? window.QuizSound.playCorrect() : window.QuizSound.playWrong();
      }
      renderQuizQuestion();
    }
  }

  function handleNext() {
    const session = state.session;
    if (session.isLast()) {
      finishQuiz();
      return;
    }
    session.goNext();
    renderQuizQuestion();
  }

  function handlePrev() {
    if (state.isRandom) {
      if (state.randomScope) {
        renderGenres(state.randomScope);
        showScreen('genres');
      } else {
        showScreen('subjects');
      }
    } else {
      renderGenres(state.currentSubject);
      showScreen('genres');
    }
  }

  function finishQuiz() {
    const session = state.session;
    const score = session.score();
    const total = session.total();
    const points = total > 0 ? Math.floor((score / total) * 100) : 0;
    const elapsedMs = Date.now() - state.quizStartedAt;
    const stats = window.QuizStorage.saveGenreResult(
      state.currentSubject,
      state.currentGenre,
      points,
      state.quizQuestionCount,
      elapsedMs
    );

    el.resultScore.textContent = `${points}点！`;
    el.resultTime.textContent = `タイム：${formatTime(elapsedMs)}`;
    el.confettiLayer.innerHTML = '';
    if (points === 100) {
      el.resultMessage.textContent = 'すごい！ぜんもんせいかい！';
      window.QuizSound.playPerfect();
      spawnConfetti();
    } else {
      el.resultMessage.textContent = `ベストきろく：${stats.bestScore}点`;
      window.QuizSound.playFinish();
    }

    el.resultToGenresBtn.hidden = state.isRandom;

    showScreen('result');
  }

  function bindEvents() {
    el.countSelector.querySelectorAll('.count-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.questionCount = Number(btn.dataset.count);
        updateCountSelectorUI();
      });
    });

    el.btnReveal.addEventListener('click', handleReveal);
    el.btnNext.addEventListener('click', handleNext);
    el.btnBack.addEventListener('click', handlePrev);

    document.getElementById('screen-genres')
      .querySelector('[data-action="to-subjects"]')
      .addEventListener('click', () => showScreen('subjects'));

    document.getElementById('screen-result')
      .querySelectorAll('[data-action]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          if (action === 'retry') {
            if (state.isRandom) {
              startRandomQuiz(state.randomScope, state.randomScope ? state.questionCount : undefined);
            } else {
              startQuiz(state.currentSubject, state.currentGenre, state.questionCount);
            }
          } else if (action === 'to-genres') {
            renderGenres(state.currentSubject);
            showScreen('genres');
          } else if (action === 'to-subjects') {
            showScreen('subjects');
          }
        });
      });
  }

  async function init() {
    bindEvents();
    await loadSubjects();
    renderSubjects();
    showScreen('subjects');
  }

  init();
})();
