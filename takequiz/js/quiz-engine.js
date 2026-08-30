(function () {
  const SET_SIZE = 5;

  function shuffle(array) {
    const result = array.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function isChoiceQuestion(question) {
    return Array.isArray(question.choices) && question.choices.length > 0;
  }

  // distractorPool を持つ問題は、毎回ランダムに選択肢を組み立てる
  // （正解以外の選択肢は「どれでもいい」ので、遊ぶたびに違う選択肢が出る）
  function materializeQuestion(question) {
    if (isChoiceQuestion(question)) {
      return question;
    }
    if (Array.isArray(question.distractorPool) && question.answerText) {
      const wantCount = Math.max(1, (question.choiceCount || 4) - 1);
      const distractors = shuffle(question.distractorPool).slice(0, wantCount);
      const choices = shuffle([question.answerText, ...distractors]);
      return {
        ...question,
        choices,
        answer: choices.indexOf(question.answerText),
      };
    }
    return question;
  }

  function createQuizSession(allQuestions) {
    const count = Math.min(SET_SIZE, allQuestions.length);
    const picked = shuffle(allQuestions).slice(0, count);

    return {
      items: picked.map((question) => ({
        question: materializeQuestion(question),
        selectedIndex: null,
        revealed: false,
        // 選択肢のない（自分で考えて自己採点する）問題用
        selfCorrect: null,
      })),
      index: 0,

      current() {
        return this.items[this.index];
      },
      isLast() {
        return this.index === this.items.length - 1;
      },
      total() {
        return this.items.length;
      },

      isChoiceQuestion(item) {
        return isChoiceQuestion((item || this.current()).question);
      },

      select(choiceIndex) {
        const item = this.current();
        if (item.revealed) return;
        item.selectedIndex = choiceIndex;
      },

      canReveal() {
        const item = this.current();
        if (this.isChoiceQuestion(item)) {
          return item.selectedIndex !== null;
        }
        return true;
      },

      reveal() {
        if (!this.canReveal()) return false;
        this.current().revealed = true;
        return true;
      },

      setSelfCorrect(isCorrect) {
        const item = this.current();
        if (!item.revealed || this.isChoiceQuestion(item)) return;
        item.selfCorrect = isCorrect;
      },

      canAdvance() {
        const item = this.current();
        if (!item.revealed) return false;
        if (this.isChoiceQuestion(item)) return true;
        return item.selfCorrect !== null;
      },

      goNext() {
        if (this.isLast()) return false;
        this.index += 1;
        return true;
      },

      isCorrect(item) {
        if (this.isChoiceQuestion(item)) {
          return item.selectedIndex === item.question.answer;
        }
        return item.selfCorrect === true;
      },

      score() {
        return this.items.filter(
          (item) => item.revealed && this.isCorrect(item)
        ).length;
      },
    };
  }

  window.QuizEngine = { createQuizSession };
})();
