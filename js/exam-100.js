// js/exam-100.js
// โหลดข้อสอบจาก exam-100.json แล้ว render + ตรวจข้อสอบ

let QUESTIONS = [];

const letterMap = ["A", "B", "C", "D"];
const thaiLabel = ["ก.", "ข.", "ค.", "ง."];

document.addEventListener("DOMContentLoaded", () => {
  const questionsContainer = document.getElementById("questions-container");
  const badge = document.getElementById("question-count-badge");
  const submitBtn = document.getElementById("submit-btn");
  const resetBtn = document.getElementById("reset-btn");
  const scoreSummary = document.getElementById("score-summary");
  const answerTable = document.getElementById("answer-table");

  async function loadQuestions() {
    try {
      const res = await fetch("json/exam-100.json", {
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) {
        throw new Error("โหลดไฟล์ exam-100.json ไม่สำเร็จ");
      }

      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("โครงสร้าง JSON ต้องเป็น Array");
      }
      QUESTIONS = data;
      renderQuestions();
      renderAnswerTable();
    } catch (err) {
      console.error(err);
      badge.textContent = "โหลดข้อสอบไม่สำเร็จ";
      questionsContainer.innerHTML = `
        <div class="error-box">
          ไม่สามารถโหลดข้อสอบจาก <code>exam-100.json</code> ได้<br>
          ตรวจสอบว่าไฟล์อยู่ในโฟลเดอร์เดียวกัน และเปิดผ่าน server (ไม่ใช่ file://)
        </div>
      `;
    }
  }

  function renderQuestions() {
    questionsContainer.innerHTML = "";

    if (!QUESTIONS.length) {
      badge.textContent = "ยังไม่มีข้อสอบใน JSON";
      return;
    }

    badge.textContent = `จำนวนข้อสอบ: ${QUESTIONS.length} ข้อ`;

    const byPart = {};
    QUESTIONS.forEach((q) => {
      if (!byPart[q.part]) byPart[q.part] = [];
      byPart[q.part].push(q);
    });

    const partOrder = ["ภาค ก", "ภาค ข", "ภาค ค"];

    partOrder.forEach((part) => {
      if (!byPart[part]) return;

      const partBlock = document.createElement("div");

      const label = document.createElement("div");
      label.className = "part-label";
      const span = document.createElement("span");
      span.textContent = part;
      const small = document.createElement("small");
      if (part === "ภาค ก") small.textContent = " กฎหมาย / ท้องถิ่น / การคลัง";
      if (part === "ภาค ข") small.textContent = " วิชาชีพพยาบาล / สุขภาพ / ระบบสุขภาพ";
      if (part === "ภาค ค") small.textContent = " ทัศนคติ / บุคลิกภาพ / สถานการณ์สมมติ";
      label.appendChild(span);
      label.appendChild(small);
      partBlock.appendChild(label);

      byPart[part].forEach((q) => {
        const qDiv = document.createElement("div");
        qDiv.className = "question";
        qDiv.dataset.qid = q.id;

        const header = document.createElement("div");
        header.className = "question-header";

        const number = document.createElement("div");
        number.className = "q-number";
        number.textContent = `ข้อ ${q.id}`;
        header.appendChild(number);

        const meta = document.createElement("div");
        meta.className = "q-meta";
        meta.textContent = q.topic || q.cluster || "";
        header.appendChild(meta);

        qDiv.appendChild(header);

        const text = document.createElement("div");
        text.className = "q-text";
        text.textContent = q.stem;
        qDiv.appendChild(text);

        const optionsDiv = document.createElement("div");
        optionsDiv.className = "options";

        (q.choices || []).forEach((choice, idx) => {
          const optLabel = document.createElement("label");
          optLabel.className = "option";

          const input = document.createElement("input");
          input.type = "radio";
          input.name = `q-${q.id}`;
          input.value = letterMap[idx];

          const labelSpan = document.createElement("span");
          labelSpan.className = "opt-label";
          labelSpan.textContent = thaiLabel[idx];

          const textSpan = document.createElement("span");
          textSpan.textContent = choice;

          optLabel.appendChild(input);
          optLabel.appendChild(labelSpan);
          optLabel.appendChild(textSpan);
          optionsDiv.appendChild(optLabel);
        });

        qDiv.appendChild(optionsDiv);

        const result = document.createElement("div");
        result.className = "q-result";
        result.id = `q-result-${q.id}`;
        qDiv.appendChild(result);

        partBlock.appendChild(qDiv);
      });

      questionsContainer.appendChild(partBlock);
    });
  }

  function renderAnswerTable() {
    answerTable.innerHTML = "";

    if (!QUESTIONS.length) return;

    QUESTIONS.forEach((q) => {
      const row = document.createElement("div");
      row.className = "answer-row";

      const qSpan = document.createElement("span");
      qSpan.className = "q";
      qSpan.textContent = q.id;

      const aSpan = document.createElement("span");
      aSpan.className = "a";

      const idx = letterMap.indexOf(q.correct);
      const label = idx >= 0 ? thaiLabel[idx].replace(".", "") : q.correct;
      aSpan.textContent = label;

      row.appendChild(qSpan);
      row.appendChild(aSpan);
      answerTable.appendChild(row);
    });
  }

  function gradeExam() {
    if (!QUESTIONS.length) return;

    let correctCount = 0;
    let wrongCount = 0;
    let unanswered = 0;

    const partStats = {};

    QUESTIONS.forEach((q) => {
      if (!partStats[q.part]) partStats[q.part] = { total: 0, correct: 0 };
      partStats[q.part].total += 1;

      const qDiv = document.querySelector(`.question[data-qid="${q.id}"]`);
      const resultDiv = document.getElementById(`q-result-${q.id}`);
      qDiv.classList.remove("correct", "incorrect", "unanswered");

      const checked = document.querySelector(`input[name="q-${q.id}"]:checked`);
      if (!checked) {
        unanswered += 1;
        qDiv.classList.add("unanswered");
        resultDiv.style.display = "block";
        const idxCorrect = letterMap.indexOf(q.correct);
        const correctThai =
          idxCorrect >= 0 ? thaiLabel[idxCorrect].replace(".", "") : q.correct;
        resultDiv.className = "q-result incorrect";
        resultDiv.innerHTML = `ยังไม่เลือกคำตอบ • <span class="key">เฉลย: ${correctThai}</span>`;
        return;
      }

      const chosen = checked.value;
      const idxChosen = letterMap.indexOf(chosen);
      const idxCorrect = letterMap.indexOf(q.correct);
      const chosenThai =
        idxChosen >= 0 ? thaiLabel[idxChosen].replace(".", "") : chosen;
      const correctThai =
        idxCorrect >= 0 ? thaiLabel[idxCorrect].replace(".", "") : q.correct;

      if (chosen === q.correct) {
        correctCount += 1;
        partStats[q.part].correct += 1;
        qDiv.classList.add("correct");
        resultDiv.style.display = "block";
        resultDiv.className = "q-result correct";
        resultDiv.innerHTML = `ตอบถูก • <span class="key">${correctThai}</span>`;
      } else {
        wrongCount += 1;
        qDiv.classList.add("incorrect");
        resultDiv.style.display = "block";
        resultDiv.className = "q-result incorrect";
        resultDiv.innerHTML = `ตอบผิด (ตอบ ${chosenThai}) • <span class="key">เฉลย: ${correctThai}</span>`;
      }
    });

    const total = QUESTIONS.length;
    const scorePercent = total ? Math.round((correctCount / total) * 100) : 0;
    const levelClass = scorePercent >= 80 ? "good" : "bad";

    const scoreHtml = [];
    scoreHtml.push(`
      <div class="score-main">
        ทำถูก <strong>${correctCount}</strong> ข้อ จากทั้งหมด <strong>${total}</strong> ข้อ
        (<span class="${levelClass}">${scorePercent}%</span>)<br>
        <small style="color:var(--muted);">
          ผิด ${wrongCount} ข้อ · ยังไม่ได้ตอบ ${unanswered} ข้อ
        </small>
      </div>
    `);

    scoreHtml.push('<div class="score-parts">');
    Object.keys(partStats).forEach((part) => {
      const st = partStats[part];
      const p = st.total ? Math.round((st.correct / st.total) * 100) : 0;
      const cls = p >= 80 ? "ok" : "low";
      scoreHtml.push(`
        <div class="score-chip">
          <span class="label">${part}</span>
          <span class="value ${cls}">${st.correct}/${st.total} (${p}%)</span>
        </div>
      `);
    });
    scoreHtml.push("</div>");

    scoreSummary.innerHTML = scoreHtml.join("");
  }

  function resetExam() {
    const inputs = questionsContainer.querySelectorAll("input[type=radio]");
    inputs.forEach((i) => {
      i.checked = false;
    });
    const qDivs = questionsContainer.querySelectorAll(".question");
    qDivs.forEach((div) => {
      div.classList.remove("correct", "incorrect", "unanswered");
    });
    const results = questionsContainer.querySelectorAll(".q-result");
    results.forEach((r) => {
      r.style.display = "none";
      r.textContent = "";
    });
    scoreSummary.innerHTML = `
      <div class="score-main">
        รีเซ็ตคำตอบแล้ว
        <br><small style="color:var(--muted);">
          ลองทำใหม่อีกรอบโดยไม่ดูเฉลย เพื่อเช็กว่าจำได้จริงแค่ไหน
        </small>
      </div>
    `;
  }

  submitBtn.addEventListener("click", gradeExam);
  resetBtn.addEventListener("click", resetExam);

  loadQuestions();
});
