(function () {
  const PREFIX = 'takequiz';
  const COUNT_TIERS = [3, 5, 10];

  function keyFor(subject, genre) {
    return `${PREFIX}:${subject}:${genre}`;
  }

  function emptyStats() {
    const bestTimes = {};
    COUNT_TIERS.forEach((n) => {
      bestTimes[n] = null;
    });
    return { plays: 0, bestScore: 0, bestTimes };
  }

  function getGenreStats(subject, genre) {
    const raw = localStorage.getItem(keyFor(subject, genre));
    const stats = emptyStats();
    if (!raw) {
      return stats;
    }
    try {
      const parsed = JSON.parse(raw);
      stats.plays = parsed.plays || 0;
      stats.bestScore = parsed.bestScore || 0;
      COUNT_TIERS.forEach((n) => {
        const saved = parsed.bestTimes && parsed.bestTimes[n];
        stats.bestTimes[n] = typeof saved === 'number' ? saved : null;
      });
      return stats;
    } catch (e) {
      return emptyStats();
    }
  }

  // points は0〜100点の得点（出題数が可変のため正解数ではなく点数で保存・比較する）
  // questionCount は出題数のタイア（3・5・10）、elapsedMs は解答にかかった時間（ミリ秒）
  function saveGenreResult(subject, genre, points, questionCount, elapsedMs) {
    const stats = getGenreStats(subject, genre);
    stats.plays += 1;
    stats.bestScore = Math.max(stats.bestScore, points);
    const currentBest = stats.bestTimes[questionCount];
    if (currentBest === null || currentBest === undefined || elapsedMs < currentBest) {
      stats.bestTimes[questionCount] = elapsedMs;
    }
    localStorage.setItem(keyFor(subject, genre), JSON.stringify(stats));
    return stats;
  }

  const PERFECT_KEY = `${PREFIX}:perfect:cleared`;
  const PERFECT_WRONG_KEY = `${PREFIX}:perfect:wrong`;

  function getIdSet(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  // 「全問正解を目指せ」で正解済みの問題ID一覧
  function getPerfectCleared() {
    return getIdSet(PERFECT_KEY);
  }

  // 「全問正解を目指せ」で前回不正解だった問題ID一覧
  function getPerfectWrong() {
    return getIdSet(PERFECT_WRONG_KEY);
  }

  function markPerfectCleared(id) {
    const cleared = new Set(getPerfectCleared());
    cleared.add(id);
    localStorage.setItem(PERFECT_KEY, JSON.stringify([...cleared]));

    const wrong = new Set(getPerfectWrong());
    if (wrong.delete(id)) {
      localStorage.setItem(PERFECT_WRONG_KEY, JSON.stringify([...wrong]));
    }
  }

  function markPerfectWrong(id) {
    const wrong = new Set(getPerfectWrong());
    wrong.add(id);
    localStorage.setItem(PERFECT_WRONG_KEY, JSON.stringify([...wrong]));
  }

  function resetPerfectCleared() {
    localStorage.removeItem(PERFECT_KEY);
    localStorage.removeItem(PERFECT_WRONG_KEY);
  }

  window.QuizStorage = {
    getGenreStats,
    saveGenreResult,
    getPerfectCleared,
    getPerfectWrong,
    markPerfectCleared,
    markPerfectWrong,
    resetPerfectCleared,
  };
})();
