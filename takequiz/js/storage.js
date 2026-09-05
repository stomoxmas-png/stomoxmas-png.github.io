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

  window.QuizStorage = { getGenreStats, saveGenreResult };
})();
