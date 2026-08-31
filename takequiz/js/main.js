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
    quizProgress: document.getElementById('quiz-progress'),
    quizPassage: document.getElementById('quiz-passage'),
    quizImage: document.getElementById('quiz-image'),
    quizQuestion: document.getElementById('quiz-question'),
    quizChoices: document.getElementById('quiz-choices'),
    quizFeedback: document.getElementById('quiz-feedback'),
    quizExplanation: document.getElementById('quiz-explanation'),
    btnBack: document.getElementById('btn-back'),
    btnReveal: document.getElementById('btn-reveal'),
    btnNext: document.getElementById('btn-next'),
    resultScore: document.getElementById('result-score'),
    resultMessage: document.getElementById('result-message'),
    resultToGenresBtn: document.querySelector('#screen-result [data-action="to-genres"]'),
  };

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
  };

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

    const randomBtn = document.createElement('button');
    randomBtn.className = 'card-btn card-btn-random';
    randomBtn.textContent = 'ランダム';
    randomBtn.addEventListener('click', () => startRandomQuiz(null));
    el.subjectList.appendChild(randomBtn);
  }

  function openSubject(subject) {
    state.currentSubject = subject;
    applyTheme(subject);
    el.genreScreenTitle.textContent = `${subject}のジャンルをえらんでね`;
    renderGenres(subject);
    showScreen('genres');
  }

  function renderGenres(subject) {
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
        scoreEl.textContent = `ベスト ${stats.bestScore}/${stats.lastTotal}`;
        btn.appendChild(scoreEl);
      }

      btn.addEventListener('click', () => startQuiz(subject, genre));
      el.genreList.appendChild(btn);
    });

    const randomBtn = document.createElement('button');
    randomBtn.className = 'card-btn card-btn-random';
    randomBtn.textContent = `${subject}のランダム`;
    randomBtn.addEventListener('click', () => startRandomQuiz(subject));
    el.genreList.appendChild(randomBtn);
  }

  async function startQuiz(subject, genre) {
    state.isRandom = false;
    state.randomScope = null;
    state.currentSubject = subject;
    state.currentGenre = genre;
    applyTheme(subject);
    let questions;
    try {
      questions = await loadGenreQuestions(subject, genre);
    } catch (err) {
      alert(err.message);
      return;
    }
    state.session = window.QuizEngine.createQuizSession(questions);
    showScreen('quiz');
    renderQuizQuestion();
  }

  async function startRandomQuiz(subjectFilter) {
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
    applyTheme(subjectFilter);
    state.session = window.QuizEngine.createQuizSession(allQuestions);
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
    const revealed = state.session.reveal();
    if (revealed) {
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
    const stats = window.QuizStorage.saveGenreResult(
      state.currentSubject,
      state.currentGenre,
      score,
      total
    );

    el.resultScore.textContent = `${score} / ${total} 問正解！`;
    el.resultMessage.textContent =
      score === total
        ? 'すごい！ぜんもんせいかい！'
        : `ベストきろく：${stats.bestScore} / ${total}`;

    el.resultToGenresBtn.hidden = state.isRandom;

    showScreen('result');
  }

  function bindEvents() {
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
              startRandomQuiz(state.randomScope);
            } else {
              startQuiz(state.currentSubject, state.currentGenre);
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
