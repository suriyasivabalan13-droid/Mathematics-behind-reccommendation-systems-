// ===========================
// main.js — matches your HTML IDs
// ===========================

const THEME_KEY = "nm_theme";
const html = document.documentElement;

// ---------- Theme ----------
function setTheme(theme) {
  html.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return setTheme(saved);

  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  setTheme(prefersDark ? "dark" : "light");
}

// ---------- Progress bar ----------
function updateProgressBar() {
  const bar = document.getElementById("progressBar");
  if (!bar) return;

  const doc = document.documentElement;
  const scrollTop = doc.scrollTop || document.body.scrollTop;
  const height = doc.scrollHeight - doc.clientHeight;
  const progress = height > 0 ? (scrollTop / height) * 100 : 0;

  bar.style.width = `${progress}%`;
}

// ---------- Back to top ----------
function updateBackToTop() {
  const btn = document.getElementById("backToTop");
  if (!btn) return;
  btn.style.display = window.scrollY > 600 ? "block" : "none";
}

// ---------- TOC ----------
function slugify(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function buildTOC() {
  const toc = document.getElementById("toc");
  const content = document.getElementById("content");
  if (!toc || !content) return;

  const headings = content.querySelectorAll("h2");
  toc.innerHTML = "";

  headings.forEach((h2) => {
    let id = h2.closest("section")?.id || h2.id;
    if (!id) {
      id = slugify(h2.textContent);
      h2.id = id;
    }

    const a = document.createElement("a");
    a.href = `#${id}`;
    a.textContent = h2.textContent || "Section";
    a.dataset.target = id;
    toc.appendChild(a);
  });
}

function updateActiveTOC() {
  const links = document.querySelectorAll("#toc a");
  if (!links.length) return;

  const targets = [...links]
    .map((a) => document.getElementById(a.dataset.target))
    .filter(Boolean);

  let current = null;
  const offset = 130;

  for (const sec of targets) {
    const rect = sec.getBoundingClientRect();
    if (rect.top <= offset) current = sec;
  }

  links.forEach((a) => a.classList.remove("active"));
  if (current) {
    const active = document.querySelector(`#toc a[data-target="${current.id}"]`);
    active?.classList.add("active");
  }
}

// ---------- Search ----------
function initSearch() {
  const input = document.getElementById("searchInput");
  const sections = document.querySelectorAll("main.content section");
  if (!input) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      sections.forEach((sec) => (sec.style.display = ""));
      return;
    }

    sections.forEach((sec) => {
      const txt = sec.textContent.toLowerCase();
      sec.style.display = txt.includes(q) ? "" : "none";
    });
  });
}

// ---------- Accordions ----------
function openCloseAll(open) {
  document.querySelectorAll("details.accordion").forEach((d) => (d.open = open));
}

function initAccordionButtons() {
  document.querySelector("[data-open-all]")?.addEventListener("click", () => openCloseAll(true));
  document.querySelector("[data-close-all]")?.addEventListener("click", () => openCloseAll(false));
}

// ---------- Reading mode ----------
function initReadingMode() {
  document.querySelector("[data-reading]")?.addEventListener("click", () => {
    document.body.classList.toggle("readingMode");
  });
}

// ===========================
// Helpers
// ===========================
function parseNumberList(text) {
  const parts = (text || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  const nums = parts.map(Number);
  if (!nums.length) return null;
  if (nums.some((n) => Number.isNaN(n))) return null;
  return nums;
}

function parseStringList(text) {
  return (text || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function norm(a) {
  let s = 0;
  for (const x of a) s += x * x;
  return Math.sqrt(s);
}

// ===========================
// Widget: Cosine Similarity
// ===========================
function cosineSim(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return null;
  return dot(a, b) / (na * nb);
}

function explainCosine(val) {
  if (val === null) return "Meaning: vectors cannot be all zeros.";
  if (val > 0.9) return "Meaning: extremely similar.";
  if (val > 0.7) return "Meaning: strongly similar.";
  if (val > 0.4) return "Meaning: moderately similar.";
  if (val > 0.1) return "Meaning: weak similarity.";
  return "Meaning: little to no similarity.";
}

function initCosineWidget() {
  const btn = document.getElementById("btnCosine");
  const out = document.getElementById("cosineOut");
  const meaning = document.getElementById("cosineMeaning");
  const va = document.getElementById("vecA");
  const vb = document.getElementById("vecB");
  if (!btn || !out || !meaning || !va || !vb) return;

  btn.addEventListener("click", () => {
    const a = parseNumberList(va.value);
    const b = parseNumberList(vb.value);

    if (!a || !b) {
      out.textContent = "Result: Invalid input (comma-separated numbers).";
      meaning.textContent = "Meaning: —";
      return;
    }
    if (a.length !== b.length) {
      out.textContent = "Result: Vectors must have the same length.";
      meaning.textContent = "Meaning: —";
      return;
    }

    const sim = cosineSim(a, b);
    out.textContent = `Result: ${sim === null ? "—" : sim.toFixed(4)}`;
    meaning.textContent = explainCosine(sim);
  });
}

// ===========================
// Widget: Precision@K & Recall@K
// YOUR HTML IDs:
// btnPRcalc, recList, relList, kVal, prCalcOut
// ===========================
function initPrecisionRecallWidget() {
  const btn = document.getElementById("btnPRcalc");
  const recIn = document.getElementById("recList");
  const relIn = document.getElementById("relList");
  const kIn = document.getElementById("kVal");
  const out = document.getElementById("prCalcOut");
  if (!btn || !recIn || !relIn || !kIn || !out) return;

  btn.addEventListener("click", () => {
    const recommended = parseStringList(recIn.value);
    const relevant = new Set(parseStringList(relIn.value));
    const k = Math.max(1, Math.floor(Number(kIn.value)));

    if (!recommended.length) {
      out.textContent = "Results: Please enter a recommended list.";
      return;
    }

    const topK = recommended.slice(0, k);
    let hits = 0;
    for (const item of topK) if (relevant.has(item)) hits++;

    const precision = hits / k;
    const recall = relevant.size === 0 ? 0 : hits / relevant.size;

    out.innerHTML = `
      <div><strong>Precision@${k}:</strong> ${precision.toFixed(3)} — how many of top-${k} were relevant</div>
      <div><strong>Recall@${k}:</strong> ${recall.toFixed(3)} — how many relevant items were found</div>
      <div class="smallNote">Hits: ${hits} (in top ${k}) • Relevant total: ${relevant.size}</div>
    `;
  });
}

// ===========================
// Widget: NDCG@K (your HTML uses ndcgList)
// IDs: ndcgList, ndcgK, btnNDCG, ndcgOut
// ===========================
function initNDCGWidget() {
  const btn = document.getElementById("btnNDCG");
  const listIn = document.getElementById("ndcgList");
  const kIn = document.getElementById("ndcgK");
  const out = document.getElementById("ndcgOut");
  if (!btn || !listIn || !kIn || !out) return;

  function dcg(grades, k) {
    let s = 0;
    for (let i = 0; i < Math.min(k, grades.length); i++) {
      const rel = grades[i];
      const rank = i + 1;
      s += rel / Math.log2(rank + 1);
    }
    return s;
  }

  btn.addEventListener("click", () => {
    const grades = parseNumberList(listIn.value);
    const k = Math.max(1, Math.floor(Number(kIn.value)));

    if (!grades) {
      out.textContent = "NDCG: Invalid grades. Use numbers like 3,2,0,1,0";
      return;
    }

    const ideal = [...grades].sort((a, b) => b - a);
    const dcgVal = dcg(grades, k);
    const idcgVal = dcg(ideal, k);
    const ndcg = idcgVal === 0 ? 0 : dcgVal / idcgVal;

    out.textContent = `NDCG: ${ndcg.toFixed(3)}`;
  });
}

// ===========================
// Widget: Diversity re-rank demo
// IDs: divPenalty, btnDiversify, divOut, feedOriginal, feedDiversified
// ===========================
function initDiversityWidget() {
  const slider = document.getElementById("divPenalty");
  const btn = document.getElementById("btnDiversify");
  const out = document.getElementById("divOut");
  const olA = document.getElementById("feedOriginal");
  const olB = document.getElementById("feedDiversified");
  if (!slider || !btn || !out || !olA || !olB) return;

  // Toy feed: (title, topic, baseScore)
  const items = [
    { title: "Football highlights", topic: "Sports", score: 0.94 },
    { title: "Premier League analysis", topic: "Sports", score: 0.92 },
    { title: "Easy pasta recipe", topic: "Food", score: 0.90 },
    { title: "Gym routine tips", topic: "Fitness", score: 0.88 },
    { title: "Basketball dunk compilation", topic: "Sports", score: 0.87 },
    { title: "Study productivity hacks", topic: "Education", score: 0.86 },
    { title: "New camera review", topic: "Tech", score: 0.85 },
    { title: "Healthy smoothie ideas", topic: "Food", score: 0.84 },
  ];

  function renderList(ol, list) {
    ol.innerHTML = "";
    for (const it of list) {
      const li = document.createElement("li");
      li.textContent = `${it.title} — [${it.topic}]`;
      ol.appendChild(li);
    }
  }

  const original = [...items].sort((a, b) => b.score - a.score);
  renderList(olA, original);
  renderList(olB, original);

  function diversify(penalty) {
    const remaining = [...original];
    const selected = [];
    const topicCount = new Map();

    while (remaining.length) {
      let bestIdx = 0;
      let bestVal = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const it = remaining[i];
        const count = topicCount.get(it.topic) || 0;
        const adjusted = it.score - penalty * count;
        if (adjusted > bestVal) {
          bestVal = adjusted;
          bestIdx = i;
        }
      }

      const picked = remaining.splice(bestIdx, 1)[0];
      selected.push(picked);
      topicCount.set(picked.topic, (topicCount.get(picked.topic) || 0) + 1);
    }
    return selected;
  }

  function updatePenaltyLabel() {
    out.textContent = `Penalty: ${Number(slider.value).toFixed(2)}`;
  }

  slider.addEventListener("input", updatePenaltyLabel);
  updatePenaltyLabel();

  btn.addEventListener("click", () => {
    const penalty = Number(slider.value);
    const diversified = diversify(penalty);
    renderList(olB, diversified);
  });
}

// ===========================
// Widget: Bandit simulator
// IDs: pA, pB, eps, steps, btnBandit, btnBanditReset, banditOut
// ===========================
function initBanditWidget() {
  const pA = document.getElementById("pA");
  const pB = document.getElementById("pB");
  const eps = document.getElementById("eps");
  const steps = document.getElementById("steps");
  const btn = document.getElementById("btnBandit");
  const reset = document.getElementById("btnBanditReset");
  const out = document.getElementById("banditOut");
  if (!pA || !pB || !eps || !steps || !btn || !reset || !out) return;

  let state = null;

  function resetState() {
    state = {
      nA: 0, nB: 0,
      rA: 0, rB: 0
    };
    out.textContent = "Results: —";
  }

  function chooseArm(epsilon, estA, estB) {
    if (Math.random() < epsilon) return Math.random() < 0.5 ? "A" : "B";
    return estA >= estB ? "A" : "B";
  }

  btn.addEventListener("click", () => {
    const trueA = Number(pA.value);
    const trueB = Number(pB.value);
    const epsilon = Number(eps.value);
    const T = Math.max(10, Math.floor(Number(steps.value)));

    if ([trueA, trueB, epsilon].some((x) => Number.isNaN(x))) {
      out.textContent = "Results: Please enter valid numbers.";
      return;
    }

    for (let t = 0; t < T; t++) {
      const estA = state.nA === 0 ? 0 : state.rA / state.nA;
      const estB = state.nB === 0 ? 0 : state.rB / state.nB;

      const arm = chooseArm(epsilon, estA, estB);
      const click =
        arm === "A" ? (Math.random() < trueA ? 1 : 0) : (Math.random() < trueB ? 1 : 0);

      if (arm === "A") { state.nA++; state.rA += click; }
      else { state.nB++; state.rB += click; }
    }

    const estA = state.nA === 0 ? 0 : state.rA / state.nA;
    const estB = state.nB === 0 ? 0 : state.rB / state.nB;

    out.innerHTML = `
      <div><strong>A:</strong> shown ${state.nA} • clicks ${state.rA} • estimated CTR ${estA.toFixed(3)}</div>
      <div><strong>B:</strong> shown ${state.nB} • clicks ${state.rB} • estimated CTR ${estB.toFixed(3)}</div>
      <div class="smallNote">ε = ${epsilon.toFixed(2)} • steps ran: ${T}</div>
    `;
  });

  reset.addEventListener("click", resetState);
  resetState();
}

// ===========================
// Glossary
// ===========================
const GLOSSARY = {
  sparsity: {
    title: "Sparsity",
    text: "Most cells in the user–item table are empty because users only interact with a tiny fraction of all items."
  },
  "cold-start": {
    title: "Cold Start",
    text: "When a new user or item has little interaction data, so the model must rely more on content features or exploration."
  }
};

function initGlossary() {
  const popup = document.getElementById("glossaryPopup");
  const gTitle = document.getElementById("gTitle");
  const gText = document.getElementById("gText");
  const close = document.getElementById("gClose");
  if (!popup || !gTitle || !gText || !close) return;

  function show(key) {
    const entry = GLOSSARY[key];
    if (!entry) return;
    gTitle.textContent = entry.title;
    gText.textContent = entry.text;
    popup.style.display = "block";
    popup.setAttribute("aria-hidden", "false");
  }

  function hide() {
    popup.style.display = "none";
    popup.setAttribute("aria-hidden", "true");
  }

  document.querySelectorAll(".gterm").forEach((el) => {
    el.addEventListener("click", () => {
      const key = el.getAttribute("data-term");
      if (key) show(key);
    });
  });

  close.addEventListener("click", hide);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hide();
  });
}

// ===========================
// Init
// ===========================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();

  document.getElementById("toggleTheme")?.addEventListener("click", () => {
    const current = html.getAttribute("data-theme") || "light";
    setTheme(current === "dark" ? "light" : "dark");
  });

  buildTOC();
  initSearch();
  initAccordionButtons();
  initReadingMode();

  initCosineWidget();
  initPrecisionRecallWidget();
  initNDCGWidget();
  initDiversityWidget();
  initBanditWidget();
  initGlossary();

  document.getElementById("backToTop")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  updateProgressBar();
  updateBackToTop();
  updateActiveTOC();

  window.addEventListener("scroll", () => {
    updateProgressBar();
    updateBackToTop();
    updateActiveTOC();
  });

  window.addEventListener("resize", () => {
    buildTOC();
    updateActiveTOC();
  });
});
