// js/exam-notes.js
// โหลด json/exam-notes.json แล้วสร้าง TOC + note cards อัตโนมัติ

document.addEventListener("DOMContentLoaded", () => {
  const tocEl = document.getElementById("notes-toc");
  const contentEl = document.getElementById("notes-content");

  if (!tocEl || !contentEl) {
    console.error("notes-toc หรือ notes-content ไม่พบใน DOM");
    return;
  }

  loadNotes(tocEl, contentEl);
});

async function loadNotes(tocEl, contentEl) {
  try {
    const res = await fetch("json/exam-notes.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("โหลด exam-notes.json ไม่สำเร็จ");
    const notes = await res.json();

    renderNotes(contentEl, notes);
    renderToc(tocEl, notes);
    setupScrollSpy(notes);
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

function renderNotes(container, notes) {
  container.innerHTML = "";

  notes.forEach((note) => {
    const article = document.createElement("article");
    article.className = "note-block";
    article.id = note.id || "";

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
    headerMain.appendChild(summary);

    const codePill = document.createElement("span");
    codePill.className = "note-code-pill";
    codePill.textContent = note.code
      ? `${note.code}${note.badge ? " · " + note.badge : ""}`
      : note.badge || "";

    header.appendChild(headerMain);
    header.appendChild(codePill);

    article.appendChild(header);

    // Focus list
    if (Array.isArray(note.focus) && note.focus.length > 0) {
      const focusTitle = document.createElement("div");
      focusTitle.className = "note-focus-title";
      focusTitle.textContent = "FOCUS ที่ควรเน้นจำ";

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

    // Groups (หัวข้อย่อย)
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

    // Quiz
    if (Array.isArray(note.quiz) && note.quiz.length > 0) {
      const details = document.createElement("details");
      details.className = "quiz";

      const summary = document.createElement("summary");
      summary.textContent = note.quizTitle || "Mini-quiz หัวข้อนี้";

      const ol = document.createElement("ol");
      note.quiz.forEach((q) => {
        const li = document.createElement("li");
        li.textContent = q;
        ol.appendChild(li);
      });

      details.appendChild(summary);
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

function renderToc(tocContainer, notes) {
  // เคลียร์ของเก่า ยกเว้น title แรก
  const titleEl = tocContainer.querySelector(".notes-toc-title");
  tocContainer.innerHTML = "";
  if (titleEl) tocContainer.appendChild(titleEl);

  // group ตาม section
  const sectionsMap = new Map();

  notes.forEach((n) => {
    const key = n.section || "อื่น ๆ";
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
      a.textContent = note.code ? `${note.code} — ${note.title}` : note.title;

      a.addEventListener("click", (evt) => {
        evt.preventDefault();
        const target = document.getElementById(note.id);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          setActiveTocLink(a);
        }
      });

      li.appendChild(a);
      ul.appendChild(li);
      allTocLinks.push(a);
    });

    sectionBlock.appendChild(ul);
    tocContainer.appendChild(sectionBlock);
  });

  // helper for scroll spy
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
 * Scroll spy แบบง่าย ๆ: ดูว่า note-block ไหนกำลังอยู่ใน viewport
 * แล้วทำให้ TOC item ของอันนั้นเป็น active
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
      // หาอันที่มองเห็นมากที่สุดในจังหวะนั้น
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
      threshold: [0.2, 0.4, 0.6]
    }
  );

  noteEls.forEach((el) => observer.observe(el));
}
