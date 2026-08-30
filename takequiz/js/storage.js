(function () {
  const PREFIX = 'takequiz';

  function keyFor(subject, genre) {
    return `${PREFIX}:${subject}:${genre}`;
  }

  function getGenreStats(subject, genre) {
    const raw = localStorage.getItem(keyFor(subject, genre));
    if (!raw) {
      return { plays: 0, bestScore: 0, lastTotal: 0 };
    }
    try {
      const parsed = JSON.parse(raw);
      return {
        plays: parsed.plays || 0,
        bestScore: parsed.bestScore || 0,
        lastTotal: parsed.lastTotal || 0,
      };
    } catch (e) {
      return { plays: 0, bestScore: 0, lastTotal: 0 };
    }
  }

  function saveGenreResult(subject, genre, score, total) {
    const stats = getGenreStats(subject, genre);
    stats.plays += 1;
    stats.bestScore = Math.max(stats.bestScore, score);
    stats.lastTotal = total;
    localStorage.setItem(keyFor(subject, genre), JSON.stringify(stats));
    return stats;
  }

  window.QuizStorage = { getGenreStats, saveGenreResult };
})();
