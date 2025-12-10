// js/exam-notes.js
// โหลด json/exam-notes.json แล้วสร้าง TOC + note cards อัตโนมัติ
// เวอร์ชันนี้ **ไม่แสดง GA/GB/GC/OV** ใน TOC และ pill แล้ว

document.addEventListener("DOMContentLoaded", () => {
  const tocEl = document.getElementById("notes-toc");
  const contentEl = document.getElementById("notes-content");

  if (!tocEl || !contentEl) {
    console.error("notes-toc หรือ notes-content ไม่พบใน DOM");
    return;
  }

  loadNotes(tocEl, contentEl);
});

// ป้องกัน scroll spy แย่ง active ระหว่างที่เรากำลัง scroll จากการคลิก TOC
let notesIsClickScrolling = false;
let notesClickScrollTimer = null;

async function loadNotes(tocEl, contentEl) {
  try {
    const res = await fetch("json/exam-notes.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("โหลด exam-notes.json ไม่สำเร็จ");
    const notes = await res.json();

    renderNotes(contentEl, notes);
    renderToc(tocEl, notes);
    setupScrollSpy(notes);

    // ถ้าเปิดมาพร้อม hash (#note-id) ให้เลื่อนไปที่บล็อกนั้นเลย
    applyInitialHashState(notes);
  } catch (err) {
    console.error(err);
    contentEl.innerHTML = `
      <div class="notes-error">
        ไม่สามารถโหลดไฟล์ <code>json/exam-notes.json</code> ได้
        กรุณาตรวจสอบว่าไฟล์อยู่ในโฟลเดอร์ <strong>json/</strong> และชื่อถูกต้องหรือไม่
      </div>
    `;
  }
}

/**
 * สร้าง card เนื้อหาแต่ละหัวข้อ
 */
function renderNotes(container, notes) {
  container.innerHTML = "";

  notes.forEach((note) => {
    const article = document.createElement("article");
    article.className = "note-block";
    article.id = note.id || ""; // ใช้ id จาก json เป็น anchor

    // ----- header (ซ้าย: label+title+summary, ขวา: pill เล็ก ๆ) -----
    const header = document.createElement("div");
    header.className = "note-block-header";

    const headerMain = document.createElement("div");
    headerMain.className = "note-block-header-main";

    const sectionLabel = document.createElement("div");
    sectionLabel.className = "section-label";
    sectionLabel.textContent = note.sectionLabel || note.section || "";

    const title = document.createElement("h3");
    title.className = "note-block-title";
    title.textContent = note.title || "";

    const summary = document.createElement("p");
    summary.className = "note-summary";
    summary.textContent = note.summary || "";

    headerMain.appendChild(sectionLabel);
    headerMain.appendChild(title);
    if (summary.textContent.trim() !== "") {
      headerMain.appendChild(summary);
    }

    header.appendChild(headerMain);

    // ----- pill ด้านขวา (ไม่ใช้ GA/GB/GC/OV) -----
    // priority: note.pill -> note.badge -> note.pillText
    const pillText =
      (note.pill && String(note.pill).trim()) ||
      (note.badge && String(note.badge).trim()) ||
      (note.pillText && String(note.pillText).trim()) ||
      "";

    if (pillText) {
      const pill = document.createElement("span");
      pill.className = "note-code-pill";
      pill.textContent = pillText; // ไม่ต่อ code ด้านหน้าแล้ว
      header.appendChild(pill);
    }

    article.appendChild(header);

    // ----- Focus list -----
    if (Array.isArray(note.focus) && note.focus.length > 0) {
      const focusTitle = document.createElement("div");
      focusTitle.className = "note-focus-title";
      focusTitle.textContent = note.focusTitle || "FOCUS ที่ควรเน้นจำ";

      const ul = document.createElement("ul");
      ul.className = "note-focus-list";

      note.focus.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        ul.appendChild(li);
      });

      article.appendChild(focusTitle);
      article.appendChild(ul);
    }

    // ----- กลุ่มหัวข้อย่อย (groups) -----
    if (Array.isArray(note.groups)) {
      note.groups.forEach((group) => {
        const groupTitle = document.createElement("div");
        groupTitle.className = "note-group-title";
        groupTitle.textContent = group.title || "";

        const ul = document.createElement("ul");
        ul.className = "deep-list";

        if (Array.isArray(group.bullets)) {
          group.bullets.forEach((b) => {
            const li = document.createElement("li");
            li.textContent = b;
            ul.appendChild(li);
          });
        }

        article.appendChild(groupTitle);
        article.appendChild(ul);
      });
    }

    // ----- Mini-quiz -----
    if (Array.isArray(note.quiz) && note.quiz.length > 0) {
      const details = document.createElement("details");
      details.className = "quiz";

      const summaryEl = document.createElement("summary");
      summaryEl.textContent = note.quizTitle || "Mini-quiz หัวข้อนี้";

      const ol = document.createElement("ol");
      note.quiz.forEach((q) => {
        const li = document.createElement("li");
        li.textContent = q;
        ol.appendChild(li);
      });

      details.appendChild(summaryEl);
      details.appendChild(ol);

      if (note.quizHint) {
        const hint = document.createElement("p");
        hint.className = "answer";
        hint.textContent = note.quizHint;
        details.appendChild(hint);
      }

      article.appendChild(details);
    }

    container.appendChild(article);
  });
}

/**
 * สร้าง TOC ด้านซ้าย
 * - แบ่งตาม section (เช่น ภาพรวม, ภาค ก, ภาค ข, ภาค ค)
 * - รายการย่อยเป็น bullet ธรรมดา
 * - ไม่แสดงโค้ด OV/GA/GB/GC แล้ว ใช้ชื่อหัวข้ออ่านง่ายแทน
 */
function renderToc(tocContainer, notes) {
  // เก็บ title เดิมไว้ถ้ามี
  const titleEl = tocContainer.querySelector(".notes-toc-title");
  tocContainer.innerHTML = "";
  if (titleEl) tocContainer.appendChild(titleEl);

  // group ตาม section
  const sectionsMap = new Map();

  notes.forEach((n) => {
    const key = n.section || "หัวข้ออื่น ๆ";
    if (!sectionsMap.has(key)) sectionsMap.set(key, []);
    sectionsMap.get(key).push(n);
  });

  const allTocLinks = [];

  sectionsMap.forEach((items, sectionName) => {
    const sectionBlock = document.createElement("div");
    sectionBlock.className = "notes-toc-section";

    const h = document.createElement("div");
    h.className = "notes-toc-section-title";
    h.textContent = sectionName;
    sectionBlock.appendChild(h);

    const ul = document.createElement("ul");
    ul.className = "notes-toc-list";

    items.forEach((note) => {
      const li = document.createElement("li");
      li.className = "notes-toc-item";

      const a = document.createElement("a");
      a.className = "notes-toc-link";
      a.href = `#${note.id}`;
      a.dataset.noteId = note.id || "";

      // label ใน TOC:
      // priority: note.tocLabel -> note.title -> note.summary
      a.textContent =
        (note.tocLabel && String(note.tocLabel).trim()) ||
        (note.title && String(note.title).trim()) ||
        (note.summary && String(note.summary).trim()) ||
        "หัวข้อ";

      a.addEventListener("click", (evt) => {
        evt.preventDefault();

        const target = document.getElementById(note.id);
        if (!target) return;

        // แจ้งว่าเรากำลัง scroll จากการคลิก TOC
        notesIsClickScrolling = true;
        if (notesClickScrollTimer) {
          clearTimeout(notesClickScrollTimer);
        }
        // ปล่อยให้ scroll spy กลับมาทำงานหลังจากเลื่อนเสร็จสักพัก
        notesClickScrollTimer = setTimeout(() => {
          notesIsClickScrolling = false;
        }, 700); // ให้มากกว่าระยะเวลา scroll smooth หน่อย

        // อัปเดต hash ให้ :target ทำงาน → CSS .note-block:target จะติด
        if (location.hash !== `#${note.id}`) {
          if (history.pushState) {
            history.pushState(null, "", `#${note.id}`);
          } else {
            window.location.hash = note.id;
          }
        }

        // ใช้ scroll-margin-top ของ .note-block ช่วยกัน header บังหัวบล็อก
        target.scrollIntoView({ behavior: "smooth", block: "start" });

        // TOC ด้านซ้ายให้ active ตรงหัวข้อที่คลิก
        setActiveTocLink(a);
      });

      li.appendChild(a);
      ul.appendChild(li);
      allTocLinks.push(a);
    });

    sectionBlock.appendChild(ul);
    tocContainer.appendChild(sectionBlock);
  });

  // เก็บลิงก์ทั้งหมดไว้ให้ scroll spy ใช้
  window.__notesTocLinks = allTocLinks;
}

function setActiveTocLink(activeLink) {
  const links = window.__notesTocLinks || [];
  links.forEach((link) => {
    if (link === activeLink) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

/**
 * Scroll spy แบบง่าย ๆ:
 * ดูว่า note-block ไหนกำลังอยู่ใน viewport แล้วทำ TOC item ของอันนั้นเป็น active
 */
function setupScrollSpy(notes) {
  const noteIds = notes.map((n) => n.id).filter(Boolean);
  const noteEls = noteIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!("IntersectionObserver" in window) || noteEls.length === 0) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      // ถ้ากำลังเลื่อนจากการคลิก TOC → ไม่ต้องให้ scroll spy แทรก active
      if (notesIsClickScrolling) {
        return;
      }

      let bestEntry = null;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
          bestEntry = entry;
        }
      });

      if (bestEntry && bestEntry.target && window.__notesTocLinks) {
        const id = bestEntry.target.id;
        const targetLink = window.__notesTocLinks.find(
          (a) => a.dataset.noteId === id
        );
        if (targetLink) {
          setActiveTocLink(targetLink);
        }
      }
    },
    {
      root: null,
      rootMargin: "0px 0px -60% 0px",
      threshold: [0.2, 0.4, 0.6],
    }
  );

  noteEls.forEach((el) => observer.observe(el));
}

/**
 * ถ้ามี hash ตอนโหลดหน้า (#note-id) ให้เลื่อนไปบล็อกนั้น
 * และ sync active ให้ TOC ทันที
 */
function applyInitialHashState(notes) {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#")) return;

  const id = hash.slice(1);
  if (!id) return;

  const target = document.getElementById(id);
  if (!target) return;

  // เลื่อนให้หัวบล็อกโผล่ (ใช้ scroll-margin-top อยู่แล้ว)
  target.scrollIntoView({ behavior: "auto", block: "start" });

  if (window.__notesTocLinks) {
    const link = window.__notesTocLinks.find(
      (a) => a.dataset.noteId === id
    );
    if (link) {
      setActiveTocLink(link);
    }
  }
}
