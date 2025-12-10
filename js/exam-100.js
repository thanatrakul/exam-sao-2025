// js/exam-100.js
// ระบบทำข้อสอบ 100 ข้อ + ตรวจคะแนน + แสดงเฉลยจากไฟล์ JSON (สุ่มชุด)
// รองรับไฟล์: json/exam-100-1.json, json/exam-100-2.json, json/exam-100-3.json

"use strict";

const EXAM_FILES = [
  "json/exam-100-1.json",
  "json/exam-100-2.json",
  "json/exam-100-3.json",
];

let EXAM_JSON_PATH = null;

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("exam-container");
  const btnSubmit = document.getElementById("btn-submit");
  const btnClear = document.getElementById("btn-clear");
  const summaryEl = document.getElementById("exam-summary");

  const progressFillMain = document.getElementById("exam-progress-fill");
  const progressTextMain = document.getElementById("exam-progress-text");

  const progressFillSidebar = document.getElementById(
    "exam-progress-fill-sidebar",
  );
  const progressCountSidebar = document.getElementById(
    "exam-progress-count",
  );

  const navGrid = document.getElementById("exam-result-grid");

  // ปุ่มใน sticky bar (ล่างจอ)
  const btnSubmitSticky = document.getElementById("btn-submit-sticky");
  const btnClearSticky = document.getElementById("btn-clear-sticky");

  // ปุ่ม back-to-top
  const btnScrollTop = document.getElementById("btn-scroll-top");

  if (!container || !btnSubmit || !btnClear) {
    console.error("DOM ของหน้า exam-100 ยังไม่ครบ");
    return;
  }

  // ===== เชื่อมปุ่ม sticky กับปุ่มหลัก =====
  if (btnSubmitSticky) {
    btnSubmitSticky.addEventListener("click", () => {
      btnSubmit.click();
    });
  }
  if (btnClearSticky) {
    btnClearSticky.addEventListener("click", () => {
      btnClear.click();
    });
  }

  // ===== ปุ่ม back-to-top: แสดงเมื่อเลื่อนลง + เด้งขึ้นด้านบน =====
  if (btnScrollTop) {
    window.addEventListener("scroll", () => {
      const y = window.scrollY || window.pageYOffset || 0;
      if (y > 260) {
        btnScrollTop.style.display = "inline-flex";
      } else {
        btnScrollTop.style.display = "none";
      }
    });

    btnScrollTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ===== สุ่มชุดข้อสอบ =====
  EXAM_JSON_PATH = pickRandomExamPath();
  updateExamJsonLabels(EXAM_JSON_PATH);

  let questions = [];
  const answeredMap = new Map(); // index -> choiceIndex
  let submitted = false;
  let navButtons = [];

  loadExam(container, EXAM_JSON_PATH)
    .then((qs) => {
      questions = qs;
      answeredMap.clear();
      submitted = false;

      buildNavigator(navGrid, questions.length, (index) => {
        scrollToQuestionCard(index);
      });

      navButtons = Array.from(navGrid.querySelectorAll(".exam-nav-btn"));

      if (summaryEl) {
        summaryEl.style.display = "none";
        summaryEl.innerHTML = "";
      }

      updateProgressUI({
        answered: 0,
        total: questions.length,
        progressFillMain,
        progressTextMain,
        progressFillSidebar,
        progressCountSidebar,
      });

      attachChoiceListeners(questions, answeredMap, () => {
        if (!submitted) {
          const answered = countAnswered(answeredMap, questions.length);
          updateProgressUI({
            answered,
            total: questions.length,
            progressFillMain,
            progressTextMain,
            progressFillSidebar,
            progressCountSidebar,
          });
          updateNavigatorStatesBeforeSubmit(
            navButtons,
            answeredMap,
            questions.length,
          );
        }
      });
    })
    .catch((err) => {
      console.error(err);
      container.innerHTML = `
        <div class="notes-error">
          ไม่สามารถโหลดไฟล์ <code>${EXAM_JSON_PATH}</code> ได้<br/>
          กรุณาตรวจสอบว่าไฟล์อยู่ในโฟลเดอร์ <strong>json/</strong> และชื่อถูกต้องหรือไม่
        </div>
      `;
    });

  // ===== เมื่อกด "ส่งข้อสอบ & ดูเฉลย" =====
  btnSubmit.addEventListener("click", () => {
    if (!questions.length) return;

    submitted = true;

    const result = evaluateExam({
      questions,
      answeredMap,
    });

    showSummary(result, summaryEl);
    updateNavigatorStatesAfterSubmit(navButtons, questions, answeredMap);

    const answered = countAnswered(answeredMap, questions.length);
    updateProgressUI({
      answered,
      total: questions.length,
      progressFillMain,
      progressTextMain,
      progressFillSidebar,
      progressCountSidebar,
    });
  });

  // ===== เมื่อกด "ล้างคำตอบทั้งหมด" =====
  btnClear.addEventListener("click", () => {
    clearAnswers(questions);
    answeredMap.clear();
    submitted = false;

    if (summaryEl) {
      summaryEl.style.display = "none";
      summaryEl.innerHTML = "";
    }

    updateProgressUI({
      answered: 0,
      total: questions.length,
      progressFillMain,
      progressTextMain,
      progressFillSidebar,
      progressCountSidebar,
    });

    resetNavigator(navButtons);
  });

  // ===== helper เฉพาะ scope นี้ =====
  function scrollToQuestionCard(index) {
    const card = document.querySelector(
      `article.exam-question-card[data-question-index="${index}"]`,
    );
    if (!card) return;

    card.scrollIntoView({ behavior: "smooth", block: "start" });

    card.animate(
      [
        { boxShadow: "0 0 0 0 rgba(66,153,225,0)" },
        { boxShadow: "0 0 0 4px rgba(66,153,225,0.35)" },
        { boxShadow: "0 0 0 0 rgba(66,153,225,0)" },
      ],
      { duration: 600 },
    );
  }
});

// ==================== Random & label helpers ====================

function pickRandomExamPath() {
  if (!Array.isArray(EXAM_FILES) || !EXAM_FILES.length) {
    throw new Error("ไม่มีรายการ EXAM_FILES ให้สุ่ม");
  }
  const idx = Math.floor(Math.random() * EXAM_FILES.length);
  return EXAM_FILES[idx];
}

function updateExamJsonLabels(path) {
  const selectors = [
    "#exam-controls code",
    "#exam-loading code",
    '[data-role="exam-json-name"]',
  ];
  const nodes = document.querySelectorAll(selectors.join(","));
  nodes.forEach((node) => {
    node.textContent = path;
  });
}

// ==================== Load & build UI ====================

async function loadExam(container, jsonPath) {
  const res = await fetch(jsonPath, { cache: "no-cache" });
  if (!res.ok) {
    throw new Error(`โหลดไฟล์ข้อสอบไม่สำเร็จจาก ${jsonPath}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("รูปแบบ JSON ไม่ถูกต้อง: ต้องเป็น array ของข้อสอบ");
  }

  container.innerHTML = "";

  data.forEach((q, index) => {
    const card = document.createElement("article");
    card.className = "card exam-question-card";
    card.id = q.id || `q-${index + 1}`;
    card.dataset.questionIndex = index;

    // header
    const header = document.createElement("div");
    header.className = "exam-question-card-header";

    const leftHeader = document.createElement("div");

    const label = document.createElement("div");
    label.className = "section-label";
    label.textContent = q.section || "ข้อสอบ";

    const title = document.createElement("h3");
    title.className = "exam-question-title";
    title.textContent = `ข้อที่ ${index + 1}`;

    const questionP = document.createElement("p");
    questionP.style.margin = "0";
    questionP.textContent = q.question || "";

    leftHeader.appendChild(label);
    leftHeader.appendChild(title);
    leftHeader.appendChild(questionP);

    const rightHeader = document.createElement("div");
    rightHeader.className = "exam-question-meta";

    if (q.code) {
      const codeSpan = document.createElement("span");
      codeSpan.className = "badge";
      codeSpan.textContent = q.code;
      rightHeader.appendChild(codeSpan);
    }

    header.appendChild(leftHeader);
    header.appendChild(rightHeader);
    card.appendChild(header);

    // ตัวเลือก
    if (Array.isArray(q.choices)) {
      const ul = document.createElement("ul");
      ul.className = "deep-list";

      q.choices.forEach((choiceText, cIndex) => {
        const li = document.createElement("li");

        const labelChoice = document.createElement("label");
        labelChoice.style.display = "flex";
        labelChoice.style.alignItems = "flex-start";
        labelChoice.style.gap = ".4rem";
        labelChoice.style.cursor = "pointer";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = `q-${index}`;
        input.value = String(cIndex);

        const spanText = document.createElement("span");
        spanText.textContent = choiceText;

        labelChoice.appendChild(input);
        labelChoice.appendChild(spanText);
        li.appendChild(labelChoice);
        ul.appendChild(li);
      });

      card.appendChild(ul);
    }

    // กล่องเฉลย (ซ่อนก่อน)
    const answerBox = document.createElement("div");
    answerBox.className = "tip";
    answerBox.style.marginTop = ".5rem";
    answerBox.style.display = "none";
    answerBox.dataset.role = "answer-box";

    const answerText = document.createElement("div");
    answerText.dataset.role = "answer-text";
    answerText.style.fontSize = ".86rem";
    answerBox.appendChild(answerText);

    if (q.explanation) {
      const explainP = document.createElement("p");
      explainP.style.fontSize = ".82rem";
      explainP.style.margin = ".3rem 0 0";
      explainP.style.color = "var(--muted)";
      explainP.textContent = q.explanation;
      answerBox.appendChild(explainP);
    }

    card.appendChild(answerBox);
    container.appendChild(card);
  });

  return data;
}

// ==================== Navigator & choice listeners ====================

function buildNavigator(navGrid, total, onClickIndex) {
  if (!navGrid) return;
  navGrid.innerHTML = "";

  for (let i = 0; i < total; i += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "exam-nav-btn state-empty";
    btn.dataset.questionIndex = String(i);
    btn.textContent = String(i + 1);

    btn.addEventListener("click", () => {
      onClickIndex(i);
    });

    navGrid.appendChild(btn);
  }
}

function attachChoiceListeners(questions, answeredMap, onChange) {
  questions.forEach((_, index) => {
    const card = document.querySelector(
      `article.exam-question-card[data-question-index="${index}"]`,
    );
    if (!card) return;

    const inputs = card.querySelectorAll(`input[name="q-${index}"]`);
    inputs.forEach((input) => {
      input.addEventListener("change", () => {
        const val = parseInt(input.value, 10);
        if (!Number.isNaN(val)) {
          answeredMap.set(index, val);
        }

        card.style.borderColor = "var(--border)";
        onChange();
      });
    });
  });
}

// ==================== Evaluation & summary ====================

function evaluateExam({ questions, answeredMap }) {
  const overall = {
    correct: 0,
    wrong: 0,
    unanswered: 0,
    answered: 0,
    total: questions.length,
    percent: 0,
  };

  const bySection = new Map(); // key => { label, correct, wrong, unanswered, answered, total, percent }

  function getSectionLabel(sectionRaw) {
    if (!sectionRaw || typeof sectionRaw !== "string") {
      return "รวมทุกภาค";
    }
    const trimmed = sectionRaw.trim();

    const match = trimmed.match(/^ภาค\s*([ก-ฮ])/);
    if (match) {
      return `ภาค ${match[1]}`;
    }

    return trimmed;
  }

  function ensureSectionStats(sectionLabel) {
    if (!bySection.has(sectionLabel)) {
      bySection.set(sectionLabel, {
        label: sectionLabel,
        correct: 0,
        wrong: 0,
        unanswered: 0,
        answered: 0,
        total: 0,
        percent: 0,
      });
    }
    return bySection.get(sectionLabel);
  }

  questions.forEach((q, index) => {
    const sectionLabel = getSectionLabel(q.section);
    const sectionStats = ensureSectionStats(sectionLabel);

    const card = document.querySelector(
      `article.exam-question-card[data-question-index="${index}"]`,
    );
    if (!card) return;

    const selectedIndex =
      answeredMap.has(index) && typeof answeredMap.get(index) === "number"
        ? answeredMap.get(index)
        : (() => {
            const selectedInput = card.querySelector(
              `input[name="q-${index}"]:checked`,
            );
            return selectedInput ? parseInt(selectedInput.value, 10) : null;
          })();

    const isCorrect =
      selectedIndex !== null &&
      typeof q.answerIndex === "number" &&
      selectedIndex === q.answerIndex;

    sectionStats.total += 1;

    if (selectedIndex === null) {
      overall.unanswered += 1;
      sectionStats.unanswered += 1;
    } else {
      overall.answered += 1;
      sectionStats.answered += 1;

      if (isCorrect) {
        overall.correct += 1;
        sectionStats.correct += 1;
      } else {
        overall.wrong += 1;
        sectionStats.wrong += 1;
      }
    }

    card.style.borderColor = "var(--border)";
    card.style.boxShadow = "var(--shadow-soft)";

    const answerBox = card.querySelector('[data-role="answer-box"]');
    const answerText = card.querySelector('[data-role="answer-text"]');

    if (answerBox && answerText) {
      answerBox.style.display = "block";

      const correctChoiceText =
        Array.isArray(q.choices) && typeof q.answerIndex === "number"
          ? q.choices[q.answerIndex] ?? ""
          : "";

      if (isCorrect) {
        card.style.borderColor = "var(--success)";
        answerText.innerHTML = `
          ✅ ตอบถูกต้อง — เฉลย: <strong>${correctChoiceText}</strong>
        `;
      } else if (selectedIndex === null) {
        card.style.borderColor = "var(--danger)";
        answerText.innerHTML = `
          ⚠️ ยังไม่ได้เลือกคำตอบ — เฉลยที่ถูกคือ <strong>${correctChoiceText}</strong>
        `;
      } else {
        card.style.borderColor = "var(--danger)";
        answerText.innerHTML = `
          ❌ ตอบยังไม่ถูก — เฉลยที่ถูกคือ <strong>${correctChoiceText}</strong>
        `;
      }
    }
  });

  overall.percent = overall.total
    ? Math.round((overall.correct / overall.total) * 100)
    : 0;

  bySection.forEach((s) => {
    s.percent = s.total ? Math.round((s.correct / s.total) * 100) : 0;
  });

  return {
    overall,
    sections: Array.from(bySection.values()),
  };
}

// แสดงสรุปคะแนนด้านบน (รวมทั้งตามภาค ก / ข / ค)
function showSummary(result, boxEl) {
  if (!boxEl) return;
  const { overall, sections } = result;
  const { correct, wrong, unanswered, total, percent } = overall;

  let hint = "ดีมาก! พยายามรักษาระดับนี้ไว้ แล้วลองทำซ้ำให้ได้ใกล้ 100%";
  if (percent < 80 && percent >= 60) {
    hint = "เริ่มใกล้แล้ว ลองทบทวนหัวข้อที่ผิดบ่อย แล้วทำอีกรอบให้เกิน 80%";
  } else if (percent < 60) {
    hint =
      "ยังมีโอกาสพัฒนาอีกเยอะ ลองอ่านโน้ตให้ครบก่อน แล้วทำใหม่อีกครั้ง";
  }

  const sectionRows =
    sections && sections.length
      ? sections
          .map(
            (s) => `
        <div class="exam-summary-section-item">
          <div class="exam-summary-section-label">${s.label}</div>
          <div class="exam-summary-section-score">
            <span class="exam-summary-section-main">
              <strong>${s.correct}</strong>/<span>${s.total}</span>
            </span>
            <span class="exam-summary-section-percent">${s.percent}%</span>
          </div>
        </div>
      `,
          )
          .join("")
      : "";

  boxEl.style.display = "block";
  boxEl.innerHTML = `
    <div class="exam-summary-box">
      <div class="exam-summary-main">
        <div class="exam-summary-score">
          ${percent}<span>%</span>
        </div>
        <div class="exam-summary-text">
          <div>ทำถูก <strong>${correct}</strong> จากทั้งหมด <strong>${total}</strong> ข้อ</div>
          <div class="exam-summary-hint">${hint}</div>
        </div>
      </div>

      <div class="exam-summary-stats">
        <div class="exam-summary-pill exam-summary-pill-correct">
          <span>ตอบถูก</span>
          <strong>${correct}</strong>
        </div>
        <div class="exam-summary-pill exam-summary-pill-wrong">
          <span>ตอบผิด</span>
          <strong>${wrong}</strong>
        </div>
        <div class="exam-summary-pill exam-summary-pill-empty">
          <span>ยังไม่ได้ตอบ</span>
          <strong>${unanswered}</strong>
        </div>
      </div>

      ${
        sectionRows
          ? `
      <div class="exam-summary-sections">
        ${sectionRows}
      </div>
      `
          : ""
      }
    </div>
  `;
}

// ล้างคำตอบทั้งหมด + ซ่อนเฉลย
function clearAnswers(questions) {
  questions.forEach((_, index) => {
    const card = document.querySelector(
      `article.exam-question-card[data-question-index="${index}"]`,
    );
    if (!card) return;

    const inputs = card.querySelectorAll(`input[name="q-${index}"]`);
    inputs.forEach((input) => {
      input.checked = false;
    });

    card.style.borderColor = "var(--border)";
    card.style.boxShadow = "var(--shadow-soft)";

    const answerBox = card.querySelector('[data-role="answer-box"]');
    if (answerBox) {
      answerBox.style.display = "none";
    }
  });
}

// ==================== Progress & navigator helpers ====================

function countAnswered(answeredMap, total) {
  let count = 0;
  for (let i = 0; i < total; i += 1) {
    if (answeredMap.has(i)) count += 1;
  }
  return count;
}

function updateProgressUI({
  answered,
  total,
  progressFillMain,
  progressTextMain,
  progressFillSidebar,
  progressCountSidebar,
}) {
  const ratio = total ? answered / total : 0;
  const percent = total ? Math.round(ratio * 100) : 0;

  if (progressFillMain) {
    progressFillMain.style.transform = `scaleX(${ratio})`;
  }
  if (progressFillSidebar) {
    progressFillSidebar.style.transform = `scaleX(${ratio})`;
  }
  if (progressTextMain) {
    progressTextMain.textContent = `ตอบแล้ว ${answered} / ${total} ข้อ (${percent}%)`;
  }
  if (progressCountSidebar) {
    progressCountSidebar.textContent = `ตอบแล้ว ${answered} / ${total} ข้อ (${percent}%)`;
  }
}

function resetNavigator(navButtons) {
  if (!navButtons) return;
  navButtons.forEach((btn) => {
    btn.classList.remove(
      "state-empty",
      "state-answered",
      "state-correct",
      "state-wrong",
    );
    btn.classList.add("state-empty");
  });
}

function updateNavigatorStatesBeforeSubmit(navButtons, answeredMap, total) {
  if (!navButtons) return;

  for (let i = 0; i < total; i += 1) {
    const btn = navButtons[i];
    if (!btn) continue;

    btn.classList.remove(
      "state-empty",
      "state-answered",
      "state-correct",
      "state-wrong",
    );
    if (answeredMap.has(i)) {
      btn.classList.add("state-answered");
    } else {
      btn.classList.add("state-empty");
    }
  }
}

function updateNavigatorStatesAfterSubmit(navButtons, questions, answeredMap) {
  if (!navButtons) return;

  questions.forEach((q, index) => {
    const btn = navButtons[index];
    if (!btn) return;

    const selectedIndex =
      answeredMap.has(index) && typeof answeredMap.get(index) === "number"
        ? answeredMap.get(index)
        : null;

    const isCorrect =
      selectedIndex !== null &&
      typeof q.answerIndex === "number" &&
      selectedIndex === q.answerIndex;

    btn.classList.remove(
      "state-empty",
      "state-answered",
      "state-correct",
      "state-wrong",
    );

    if (selectedIndex === null) {
      btn.classList.add("state-empty");
    } else if (isCorrect) {
      btn.classList.add("state-correct");
    } else {
      btn.classList.add("state-wrong");
    }
  });
}
