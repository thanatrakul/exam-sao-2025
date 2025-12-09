// exam-notes.js
// โหลดเนื้อหาจาก json/exam-notes.json แล้ว render เป็นสรุปเนื้อหา + TOC ด้านขวา

let NOTES = [];

document.addEventListener("DOMContentLoaded", () => {
  const notesContainer = document.getElementById("notes-container");
  const tocContainer = document.getElementById("toc-container");
  const badge = document.getElementById("notes-count-badge");

  async function loadNotes() {
    try {
      const res = await fetch("json/exam-notes.json", {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error("โหลดไฟล์ json/exam-notes.json ไม่สำเร็จ");
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        throw new Error("โครงสร้าง exam-notes.json ต้องเป็น Array ของหัวข้อ");
      }

      NOTES = data;
      renderNotes();
      renderTOC();
    } catch (err) {
      console.error(err);
      if (badge) {
        badge.textContent = "โหลดเนื้อหาไม่สำเร็จ";
      }
      if (notesContainer) {
        notesContainer.innerHTML = `
          <div class="error-box">
            ไม่สามารถโหลดเนื้อหาจาก <code>json/exam-notes.json</code> ได้<br>
            ตรวจสอบว่าไฟล์อยู่ในโฟลเดอร์ <code>json/</code>
            และเปิดผ่าน server (ไม่ใช่ <code>file://</code>)
          </div>
        `;
      }
      if (tocContainer) {
        tocContainer.innerHTML = `
          <p class="hint">
            ยังไม่สามารถแสดงสารบัญได้ เนื่องจากโหลดไฟล์
            <code>json/exam-notes.json</code> ไม่สำเร็จ
          </p>
        `;
      }
    }
  }

  function renderNotes() {
    if (!notesContainer) return;

    notesContainer.innerHTML = "";

    if (!NOTES.length) {
      if (badge) badge.textContent = "ยังไม่มีเนื้อหาใน JSON";
      notesContainer.innerHTML = `
        <p class="hint">
          ยังไม่มีข้อมูลใน <code>json/exam-notes.json</code><br>
          สามารถเพิ่มหัวข้อได้เองตามโครงตัวอย่างในคอมเมนต์ของไฟล์
          <code>exam-notes.js</code>
        </p>
      `;
      return;
    }

    if (badge) {
      badge.textContent = `จำนวนหัวข้อ: ${NOTES.length} หัวข้อ`;
    }

    // group ตาม section: ภาพรวม / ภาค ก / ภาค ข / ภาค ค
    const bySection = {};
    NOTES.forEach((block) => {
      const sec = block.section || "อื่น ๆ";
      if (!bySection[sec]) bySection[sec] = [];
      bySection[sec].push(block);
    });

    const sectionOrder = ["ภาพรวม", "ภาค ก", "ภาค ข", "ภาค ค"];
    const sections = [];

    sectionOrder.forEach((sec) => {
      if (bySection[sec]) sections.push(sec);
    });
    Object.keys(bySection).forEach((sec) => {
      if (!sectionOrder.includes(sec)) sections.push(sec);
    });

    sections.forEach((sec) => {
      const groupDiv = document.createElement("div");
      groupDiv.className = "note-section-group";

      const secTitle = document.createElement("h2");
      secTitle.className = "note-section-title";
      secTitle.textContent = sec;
      groupDiv.appendChild(secTitle);

      bySection[sec].forEach((block) => {
        const article = document.createElement("article");
        article.className = "note-block";
        if (block.id) {
          article.id = block.id;
        }

        // header
        const header = document.createElement("div");
        header.className = "note-block-header";

        const left = document.createElement("div");
        left.className = "note-block-header-main";

        if (block.code || block.sectionLabel) {
          const metaRow = document.createElement("div");
          metaRow.className = "note-block-meta";

          if (block.sectionLabel) {
            const secLabel = document.createElement("span");
            secLabel.className = "section-label";
            secLabel.textContent = block.sectionLabel;
            metaRow.appendChild(secLabel);
          }

          if (block.code) {
            const codePill = document.createElement("span");
            codePill.className = "note-code-pill";
            codePill.textContent = block.code;
            metaRow.appendChild(codePill);
          }

          left.appendChild(metaRow);
        }

        const titleEl = document.createElement("h3");
        titleEl.className = "note-block-title";
        titleEl.textContent = block.title || "";
        left.appendChild(titleEl);

        header.appendChild(left);

        if (block.badge) {
          const badgeEl = document.createElement("span");
          badgeEl.className = "pill";
          badgeEl.textContent = block.badge;
          header.appendChild(badgeEl);
        }

        article.appendChild(header);

        // summary (ย่อสั้น ๆ)
        if (block.summary) {
          const p = document.createElement("p");
          p.className = "note-summary";
          p.textContent = block.summary;
          article.appendChild(p);
        }

        // focus / keypoints หัวข้อหลัก
        if (Array.isArray(block.focus) && block.focus.length) {
          const title = document.createElement("div");
          title.className = "keypoints-title";
          title.textContent = "Key points ที่ควรโฟกัส";
          article.appendChild(title);

          const ul = document.createElement("ul");
          ul.className = "keypoints";
          block.focus.forEach((txt) => {
            const li = document.createElement("li");
            li.textContent = txt;
            ul.appendChild(li);
          });
          article.appendChild(ul);
        }

        // รายละเอียดลึก (groups)
        // group = { title: "...", bullets: ["...", "..."] }
        if (Array.isArray(block.groups) && block.groups.length) {
          const masterList = document.createElement("ul");
          masterList.className = "deep-list";

          block.groups.forEach((group) => {
            const li = document.createElement("li");

            if (group.title) {
              const b = document.createElement("b");
              b.textContent = group.title;
              li.appendChild(b);
            }

            if (Array.isArray(group.bullets) && group.bullets.length) {
              const sub = document.createElement("ul");
              sub.className = "deep-sub";
              group.bullets.forEach((text) => {
                const subLi = document.createElement("li");
                subLi.textContent = text;
                sub.appendChild(subLi);
              });
              li.appendChild(sub);
            }

            masterList.appendChild(li);
          });

          article.appendChild(masterList);
        }

        // Quiz
        if (Array.isArray(block.quiz) && block.quiz.length) {
          const details = document.createElement("details");
          details.className = "quiz";

          const summary = document.createElement("summary");
          summary.textContent =
            block.quizTitle || "Mini-quiz หัวข้อนี้ (ลองตอบเองก่อนเปิดเฉลย)";
          details.appendChild(summary);

          const ol = document.createElement("ol");
          block.quiz.forEach((q) => {
            const li = document.createElement("li");
            li.textContent = q;
            ol.appendChild(li);
          });
          details.appendChild(ol);

          if (block.quizHint) {
            const hintP = document.createElement("p");
            hintP.className = "answer";
            hintP.textContent = block.quizHint;
            details.appendChild(hintP);
          }

          article.appendChild(details);
        }

        groupDiv.appendChild(article);
      });

      notesContainer.appendChild(groupDiv);
    });
  }

  function renderTOC() {
    if (!tocContainer) return;

    tocContainer.innerHTML = "";

    if (!NOTES.length) {
      tocContainer.innerHTML = `
        <p class="hint">
          ยังไม่มีหัวข้อในสารบัญ เนื่องจากไม่มีข้อมูลใน
          <code>json/exam-notes.json</code>
        </p>
      `;
      return;
    }

    const bySection = {};
    NOTES.forEach((block) => {
      const sec = block.section || "อื่น ๆ";
      if (!bySection[sec]) bySection[sec] = [];
      bySection[sec].push(block);
    });

    const sectionOrder = ["ภาพรวม", "ภาค ก", "ภาค ข", "ภาค ค"];
    const sections = [];

    sectionOrder.forEach((sec) => {
      if (bySection[sec]) sections.push(sec);
    });
    Object.keys(bySection).forEach((sec) => {
      if (!sectionOrder.includes(sec)) sections.push(sec);
    });

    const intro = document.createElement("p");
    intro.className = "toc-intro";
    intro.textContent = "คลิกหัวข้อเพื่อเลื่อนไปยังเนื้อหาด้านซ้าย";
    tocContainer.appendChild(intro);

    sections.forEach((sec) => {
      const secBox = document.createElement("div");
      secBox.className = "toc-section";

      const title = document.createElement("div");
      title.className = "toc-section-title";
      title.textContent = sec;
      secBox.appendChild(title);

      const ul = document.createElement("ul");
      ul.className = "toc-list";

      bySection[sec].forEach((block) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = block.id ? `#${block.id}` : "#";
        a.textContent = block.code
          ? `${block.code} — ${block.title || ""}`
          : block.title || "";
        li.appendChild(a);
        ul.appendChild(li);
      });

      secBox.appendChild(ul);
      tocContainer.appendChild(secBox);
    });
  }

  loadNotes();
});
