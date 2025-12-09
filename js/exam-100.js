// js/exam-100.js
// ระบบทำข้อสอบ 100 ข้อ + ตรวจคะแนน + แสดงเฉลยจากไฟล์ json/exam-100.json

const EXAM_JSON_PATH = "json/exam-100.json";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("exam-container");
  const btnSubmit = document.getElementById("btn-submit");
  const btnClear = document.getElementById("btn-clear");
  const summaryEl = document.getElementById("exam-summary");

  if (!container || !btnSubmit || !btnClear) {
    console.error("DOM exam-100 ไม่ครบ");
    return;
  }

  let questions = [];

  loadExam(container)
    .then((qs) => {
      questions = qs;
      if (summaryEl) {
        summaryEl.style.display = "none";
      }
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

  btnSubmit.addEventListener("click", () => {
    if (!questions.length) return;
    const result = evaluateExam(questions);
    showSummary(result, summaryEl);
  });

  btnClear.addEventListener("click", () => {
    clearAnswers(questions);
    if (summaryEl) {
      summaryEl.style.display = "none";
      summaryEl.innerHTML = "";
    }
  });
});

// โหลด JSON แล้วสร้าง UI
async function loadExam(container) {
  const res = await fetch(EXAM_JSON_PATH, { cache: "no-cache" });
  if (!res.ok) {
    throw new Error("โหลดไฟล์ข้อสอบไม่สำเร็จ");
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("รูปแบบ JSON ไม่ถูกต้อง: ต้องเป็น array ของข้อสอบ");
  }

  container.innerHTML = "";

  data.forEach((q, index) => {
    const card = document.createElement("article");
    card.className = "card";
    card.id = q.id || `q-${index + 1}`;
    card.dataset.questionIndex = index;

    const header = document.createElement("div");
    header.className = "card-header";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "flex-start";
    header.style.gap = ".5rem";

    const leftHeader = document.createElement("div");
    const label = document.createElement("div");
    label.className = "section-label";
    label.textContent = q.section || "ข้อสอบ";

    const title = document.createElement("h3");
    title.style.margin = ".2rem 0 .4rem";
    title.style.fontSize = "1rem";
    title.style.color = "var(--accent-strong)";
    title.textContent = `ข้อที่ ${index + 1}`;

    const questionP = document.createElement("p");
    questionP.style.margin = "0";
    questionP.textContent = q.question || "";

    leftHeader.appendChild(label);
    leftHeader.appendChild(title);
    leftHeader.appendChild(questionP);

    const rightHeader = document.createElement("div");
    rightHeader.style.display = "flex";
    rightHeader.style.flexDirection = "column";
    rightHeader.style.alignItems = "flex-end";
    rightHeader.style.fontSize = ".8rem";
    rightHeader.style.color = "var(--muted)";

    const codeSpan = document.createElement("span");
    codeSpan.className = "badge";
    codeSpan.textContent = q.code || "";
    rightHeader.appendChild(codeSpan);

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

    // พื้นที่เฉลย (ซ่อนก่อน)
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

// ตรวจคำตอบทั้งหมด
function evaluateExam(questions) {
  let correctCount = 0;
  let total = questions.length;

  questions.forEach((q, index) => {
    const card = document.querySelector(`article.card[data-question-index="${index}"]`);
    if (!card) return;

    const selectedInput = card.querySelector(`input[name="q-${index}"]:checked`);
    const selectedIndex = selectedInput ? parseInt(selectedInput.value, 10) : null;

    const isCorrect =
      selectedIndex !== null &&
      typeof q.answerIndex === "number" &&
      selectedIndex === q.answerIndex;

    if (isCorrect) correctCount += 1;

    // เคลียร์ state เดิม
    card.style.borderColor = "var(--border)";
    card.style.boxShadow = "var(--shadow-soft)";

    // answer box
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
      } else {
        card.style.borderColor = "var(--danger)";
        answerText.innerHTML = `
          ❌ ตอบยังไม่ถูก — เฉลยที่ถูกคือ <strong>${correctChoiceText}</strong>
        `;
      }
    }
  });

  return { correct: correctCount, total };
}

// แสดงสรุปคะแนนด้านบน
function showSummary(result, boxEl) {
  if (!boxEl) return;
  const { correct, total } = result;
  const percent = total ? Math.round((correct / total) * 100) : 0;

  boxEl.style.display = "block";
  boxEl.innerHTML = `
    <strong>สรุปผลการทำข้อสอบ</strong><br />
    ทำถูก <strong>${correct}</strong> จากทั้งหมด <strong>${total}</strong> ข้อ
    (<strong>${percent}%</strong>)<br/>
    <span style="font-size:.8rem;">
      แนะนำให้ย้อนกลับไปอ่านโน้ตในหัวข้อที่ทำผิดบ่อย แล้วลองทำอีกรอบจนได้มากกว่า 80–90%
    </span>
  `;
}

// ล้างคำตอบทั้งหมด + ซ่อนเฉลย
function clearAnswers(questions) {
  questions.forEach((q, index) => {
    const card = document.querySelector(`article.card[data-question-index="${index}"]`);
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
