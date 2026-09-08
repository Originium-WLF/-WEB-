(function () {
  "use strict";

  const STORAGE_KEYS = {
    nickname: "simulator_nickname",
    theme: "simulator_theme",
    progress: "simulator_progress_",
  };

  const CATEGORY_LABELS = {
    html: "HTML",
    css: "CSS",
    doc: "Документооборот",
  };

  let state = {
    nickname: null,
    progress: {}, // { [levelId]: { bestScore: number, completed: boolean, unlocked: boolean } }
    currentLevelId: null,
    currentQuestionIndex: 0,
    currentLevelScore: 0,
    answered: false,
  };

  const welcomeOverlay = document.getElementById("welcome-overlay");
  const welcomeForm = document.getElementById("welcome-form");
  const nicknameInput = document.getElementById("nickname-input");
  const appEl = document.getElementById("app");
  const userNameEl = document.getElementById("user-name");
  const themeToggleBtn = document.getElementById("theme-toggle");
  const resetUserBtn = document.getElementById("reset-user");
  const levelsListEl = document.getElementById("levels-list");
  const contentPanel = document.getElementById("content-panel");
  const totalScoreValueEl = document.getElementById("total-score-value");

  /* ===================== Инициализация ===================== */

  function init() {
    initTheme();
    const savedNickname = localStorage.getItem(STORAGE_KEYS.nickname);
    if (savedNickname) {
      startApp(savedNickname);
    } else {
      welcomeOverlay.classList.remove("hidden");
      appEl.classList.add("hidden");
    }

    welcomeForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const value = nicknameInput.value.trim();
      if (!value) return;
      localStorage.setItem(STORAGE_KEYS.nickname, value);
      startApp(value);
    });

    themeToggleBtn.addEventListener("click", toggleTheme);
    resetUserBtn.addEventListener("click", function () {
      if (confirm("Сменить пользователя? Прогресс текущего пользователя сохранится в браузере.")) {
        localStorage.removeItem(STORAGE_KEYS.nickname);
        location.reload();
      }
    });
  }

  function startApp(nickname) {
    state.nickname = nickname;
    userNameEl.textContent = nickname;
    welcomeOverlay.classList.add("hidden");
    appEl.classList.remove("hidden");
    loadProgress();
    renderLevelsList();
    renderWelcomeContent();
  }

  /* ===================== Тема ===================== */

  function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.theme) || "dark";
    applyTheme(saved);
  }

  function applyTheme(theme) {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
      themeToggleBtn.querySelector(".theme-toggle-icon").textContent = "☀️";
    } else {
      document.documentElement.removeAttribute("data-theme");
      themeToggleBtn.querySelector(".theme-toggle-icon").textContent = "🌙";
    }
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    applyTheme(current === "light" ? "dark" : "light");
  }

  /* ===================== Прогресс ===================== */

  function progressKey() {
    return STORAGE_KEYS.progress + state.nickname;
  }

  function loadProgress() {
    const raw = localStorage.getItem(progressKey());
    let saved = {};
    try {
      saved = raw ? JSON.parse(raw) : {};
    } catch (e) {
      saved = {};
    }
    const progress = {};
    LEVELS.forEach(function (level, idx) {
      const existing = saved[level.id] || {};
      progress[level.id] = {
        bestScore: existing.bestScore || 0,
        completed: !!existing.completed,
        unlocked: idx === 0 ? true : !!existing.unlocked,
      };
    });
    // Пересчитать разблокировку на основе завершённых уровней (на случай ручного редактирования порядка)
    for (let i = 1; i < LEVELS.length; i++) {
      const prev = progress[LEVELS[i - 1].id];
      if (prev.completed) {
        progress[LEVELS[i].id].unlocked = true;
      }
    }
    state.progress = progress;
    saveProgress();
  }

  function saveProgress() {
    localStorage.setItem(progressKey(), JSON.stringify(state.progress));
  }

  function getTotalScore() {
    return LEVELS.reduce(function (sum, level) {
      return sum + (state.progress[level.id] ? state.progress[level.id].bestScore : 0);
    }, 0);
  }

  /* ===================== Рендер сайдбара ===================== */

  function renderLevelsList() {
    levelsListEl.innerHTML = "";
    LEVELS.forEach(function (level) {
      const p = state.progress[level.id];
      const item = document.createElement("div");
      item.className = "level-item";
      if (level.id === state.currentLevelId) item.classList.add("active");
      if (p.completed) item.classList.add("completed");
      if (!p.unlocked) item.classList.add("locked");

      const badge = document.createElement("div");
      badge.className = "level-badge";
      badge.textContent = p.unlocked ? (p.completed ? "✓" : level.id) : "🔒";

      const info = document.createElement("div");
      info.className = "level-info";
      const name = document.createElement("div");
      name.className = "level-name";
      name.textContent = level.title;
      const meta = document.createElement("div");
      meta.className = "level-meta";
      meta.textContent = p.unlocked
        ? "Сложность: " + level.difficulty + (p.bestScore ? " · Лучший результат: " + p.bestScore + "%" : "")
        : "Пройдите предыдущий уровень";

      info.appendChild(name);
      info.appendChild(meta);
      item.appendChild(badge);
      item.appendChild(info);

      if (p.unlocked) {
        item.addEventListener("click", function () {
          openLevelIntro(level.id);
        });
      }

      levelsListEl.appendChild(item);
    });

    totalScoreValueEl.textContent = getTotalScore();
  }

  /* ===================== Экран приветствия / выбора ===================== */

  function renderWelcomeContent() {
    state.currentLevelId = null;
    contentPanel.innerHTML =
      '<div class="empty-state">' +
      '<h2>Выберите уровень слева, чтобы начать</h2>' +
      "<p>Каждый уровень содержит вопросы по HTML/CSS и документообороту РФ.<br/>Наберите проходной балл, чтобы открыть следующий уровень.</p>" +
      "</div>";
    renderLevelsList();
  }

  /* ===================== Экран описания уровня ===================== */

  function openLevelIntro(levelId) {
    const level = LEVELS.find(function (l) {
      return l.id === levelId;
    });
    if (!level) return;
    state.currentLevelId = levelId;
    renderLevelsList();

    const p = state.progress[levelId];

    contentPanel.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "level-intro";

    wrap.innerHTML =
      '<div class="difficulty-pill">' + level.difficulty + "</div>" +
      "<h2>" + level.title + "</h2>" +
      "<p>" + level.description + "</p>" +
      '<div class="level-intro-stats">' +
        '<div class="stat-box"><span>Вопросов</span><strong>' + level.questions.length + "</strong></div>" +
        '<div class="stat-box"><span>Проходной балл</span><strong>' + level.passScore + "%</strong></div>" +
        '<div class="stat-box"><span>Лучший результат</span><strong>' + (p.bestScore || 0) + "%</strong></div>" +
      "</div>";

    const startBtn = document.createElement("button");
    startBtn.className = "btn btn-primary";
    startBtn.textContent = p.completed ? "Пройти ещё раз" : "Начать уровень";
    startBtn.addEventListener("click", function () {
      startLevel(levelId);
    });

    wrap.appendChild(startBtn);
    contentPanel.appendChild(wrap);
  }

  /* ===================== Прохождение уровня ===================== */

  function startLevel(levelId) {
    state.currentLevelId = levelId;
    state.currentQuestionIndex = 0;
    state.currentLevelScore = 0;
    state.answered = false;
    renderQuestion();
  }

  function getCurrentLevel() {
    return LEVELS.find(function (l) {
      return l.id === state.currentLevelId;
    });
  }

  function renderQuestion() {
    const level = getCurrentLevel();
    const question = level.questions[state.currentQuestionIndex];
    state.answered = false;

    contentPanel.innerHTML = "";

    const progressPct = Math.round((state.currentQuestionIndex / level.questions.length) * 100);
    const progressTrack = document.createElement("div");
    progressTrack.className = "progress-track";
    const progressFill = document.createElement("div");
    progressFill.className = "progress-fill";
    progressFill.style.width = progressPct + "%";
    progressTrack.appendChild(progressFill);
    contentPanel.appendChild(progressTrack);

    const header = document.createElement("div");
    header.className = "question-header";
    header.innerHTML =
      '<span class="question-progress-text">Вопрос ' + (state.currentQuestionIndex + 1) + " из " + level.questions.length + "</span>" +
      '<span class="category-tag ' + question.category + '">' + CATEGORY_LABELS[question.category] + "</span>";
    contentPanel.appendChild(header);

    const qText = document.createElement("p");
    qText.className = "question-text";
    qText.textContent = question.question;
    contentPanel.appendChild(qText);

    const answerArea = document.createElement("div");
    answerArea.id = "answer-area";
    contentPanel.appendChild(answerArea);

    const feedbackBox = document.createElement("div");
    feedbackBox.id = "feedback-box";
    contentPanel.appendChild(feedbackBox);

    const actions = document.createElement("div");
    actions.className = "question-actions";
    const submitBtn = document.createElement("button");
    submitBtn.id = "submit-btn";
    submitBtn.className = "btn btn-primary";
    submitBtn.textContent = "Ответить";
    submitBtn.disabled = true;
    actions.appendChild(submitBtn);
    contentPanel.appendChild(actions);

    if (question.type === "choice") {
      renderChoiceAnswer(question, answerArea, submitBtn);
    } else {
      renderInputAnswer(question, answerArea, submitBtn);
    }

    submitBtn.addEventListener("click", function () {
      if (state.answered) {
        nextStep();
      } else {
        checkAnswer(question);
      }
    });
  }

  function renderChoiceAnswer(question, container, submitBtn) {
    const list = document.createElement("div");
    list.className = "options-list";
    question.options.forEach(function (option, idx) {
      const label = document.createElement("label");
      label.className = "option-item";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "option";
      radio.value = option;
      radio.addEventListener("change", function () {
        submitBtn.disabled = false;
      });
      const text = document.createElement("span");
      text.textContent = option;
      label.appendChild(radio);
      label.appendChild(text);
      label.dataset.value = option;
      list.appendChild(label);
    });
    container.appendChild(list);
  }

  function renderInputAnswer(question, container, submitBtn) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "text-answer-input";
    input.placeholder = "Впишите ответ...";
    input.autocomplete = "off";
    input.addEventListener("input", function () {
      submitBtn.disabled = input.value.trim().length === 0;
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !submitBtn.disabled && !state.answered) {
        e.preventDefault();
        submitBtn.click();
      }
    });
    container.appendChild(input);
  }

  function normalize(str) {
    return str
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[ёë]/g, "е")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ");
  }

  function checkAnswer(question) {
    state.answered = true;
    let isCorrect = false;

    if (question.type === "choice") {
      const options = document.querySelectorAll(".option-item");
      const selected = document.querySelector('input[name="option"]:checked');
      const selectedValue = selected ? selected.value : null;
      isCorrect = selectedValue === question.answer;

      options.forEach(function (optEl) {
        optEl.querySelector("input").disabled = true;
        if (optEl.dataset.value === question.answer) {
          optEl.classList.add("correct");
        } else if (optEl.dataset.value === selectedValue && !isCorrect) {
          optEl.classList.add("incorrect");
        }
      });
    } else {
      const input = document.querySelector(".text-answer-input");
      const userValue = normalize(input.value);
      const accepted = question.answer.map(normalize);
      isCorrect = accepted.indexOf(userValue) !== -1;
      input.disabled = true;
      input.classList.add(isCorrect ? "correct" : "incorrect");
    }

    if (isCorrect) {
      state.currentLevelScore++;
    }

    const feedbackBox = document.getElementById("feedback-box");
    feedbackBox.className = "feedback-box " + (isCorrect ? "correct" : "incorrect");
    let html = isCorrect ? "✅ Верно!" : "❌ Неверно.";
    if (!isCorrect && question.type === "input") {
      html += " Правильный ответ: " + question.answer[0] + ".";
    } else if (!isCorrect && question.type === "choice") {
      html += " Правильный ответ: " + question.answer + ".";
    }
    if (question.explanation) {
      html += '<span class="explanation">' + question.explanation + "</span>";
    }
    feedbackBox.innerHTML = html;

    const submitBtn = document.getElementById("submit-btn");
    const level = getCurrentLevel();
    const isLast = state.currentQuestionIndex === level.questions.length - 1;
    submitBtn.textContent = isLast ? "Завершить уровень" : "Следующий вопрос";
    submitBtn.disabled = false;
  }

  function nextStep() {
    const level = getCurrentLevel();
    if (state.currentQuestionIndex < level.questions.length - 1) {
      state.currentQuestionIndex++;
      renderQuestion();
    } else {
      finishLevel();
    }
  }

  function finishLevel() {
    const level = getCurrentLevel();
    const scorePct = Math.round((state.currentLevelScore / level.questions.length) * 100);
    const passed = scorePct >= level.passScore;

    const p = state.progress[level.id];
    p.bestScore = Math.max(p.bestScore, scorePct);
    if (passed) {
      p.completed = true;
      const idx = LEVELS.findIndex(function (l) {
        return l.id === level.id;
      });
      if (idx !== -1 && idx + 1 < LEVELS.length) {
        state.progress[LEVELS[idx + 1].id].unlocked = true;
      }
    }
    saveProgress();
    renderLevelsList();
    renderResults(level, scorePct, passed);
  }

  function renderResults(level, scorePct, passed) {
    contentPanel.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "results-card";

    const circle = document.createElement("div");
    circle.className = "results-score-circle " + (passed ? "passed" : "failed");
    circle.innerHTML = "<strong>" + scorePct + "%</strong><span>" + state.currentLevelScore + " из " + level.questions.length + "</span>";
    wrap.appendChild(circle);

    const heading = document.createElement("h2");
    heading.textContent = passed ? "Уровень пройден!" : "Уровень не пройден";
    wrap.appendChild(heading);

    const desc = document.createElement("p");
    desc.textContent = passed
      ? "Отличная работа! Нужный балл (" + level.passScore + "%) достигнут" +
        (getNextLevel(level) ? ", следующий уровень открыт." : ". Это был последний уровень — поздравляем!")
      : "Нужно набрать минимум " + level.passScore + "%. Попробуйте ещё раз, чтобы закрепить материал.";
    wrap.appendChild(desc);

    const actions = document.createElement("div");
    actions.className = "results-actions";

    const retryBtn = document.createElement("button");
    retryBtn.className = "btn btn-secondary";
    retryBtn.textContent = "Пройти ещё раз";
    retryBtn.addEventListener("click", function () {
      startLevel(level.id);
    });
    actions.appendChild(retryBtn);

    const next = getNextLevel(level);
    if (passed && next) {
      const nextBtn = document.createElement("button");
      nextBtn.className = "btn btn-primary";
      nextBtn.textContent = "Следующий уровень →";
      nextBtn.addEventListener("click", function () {
        openLevelIntro(next.id);
      });
      actions.appendChild(nextBtn);
    } else {
      const backBtn = document.createElement("button");
      backBtn.className = "btn btn-primary";
      backBtn.textContent = "К списку уровней";
      backBtn.addEventListener("click", renderWelcomeContent);
      actions.appendChild(backBtn);
    }

    wrap.appendChild(actions);
    contentPanel.appendChild(wrap);
  }

  function getNextLevel(level) {
    const idx = LEVELS.findIndex(function (l) {
      return l.id === level.id;
    });
    return idx !== -1 && idx + 1 < LEVELS.length ? LEVELS[idx + 1] : null;
  }

  init();
})();
