const $   = id => document.getElementById(id);
const esc = s  => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safe = u => /^https?:\/\//i.test(u) ? u : '#';

const CATS = ['WEB APP', 'PRODUCTIVITY', 'RESOURCES'];

/* CSS-art previews — one per project, ordered to match profile.json */
const PREVIEWS = [
  /* 0 — FileForge: browser-based file toolkit */
  `<div class="prev prev-fileforge" aria-hidden="true">
    <div class="ff-header">
      <span class="ff-logo">FileForge</span>
      <span class="ff-sub">Privacy-first file toolkit for the web.</span>
    </div>
    <div class="ff-dropzone">
      <div class="ff-icon">&#9707;</div>
      <span>Drop files here</span>
      <span class="ff-or">or click to select</span>
    </div>
    <div class="ff-actions">
      <div class="ff-action"><span class="ff-dot"></span>Merge PDF</div>
      <div class="ff-action ff-action--active"><span class="ff-dot"></span>Compress Image</div>
      <div class="ff-action"><span class="ff-dot"></span>Convert Format</div>
    </div>
    <div class="ff-progress" role="presentation">
      <div class="ff-progress-fill"></div>
    </div>
  </div>`,

  /* 1 — Lofi-Timer: study timer */
  `<div class="prev prev-timer" aria-hidden="true">
    <div class="tmr-label">Deep Work</div>
    <div class="tmr-ring">
      <svg viewBox="0 0 100 100" class="tmr-svg" aria-hidden="true">
        <circle cx="50" cy="50" r="42" class="tmr-track"/>
        <circle cx="50" cy="50" r="42" class="tmr-fill"/>
      </svg>
      <div class="tmr-time">25:00</div>
    </div>
    <div class="tmr-tags">
      <span>&#9654;</span>
      <span class="tmr-tag">Focus</span>
      <span class="tmr-tag">Sounds</span>
      <span class="tmr-tag">Stats</span>
    </div>
  </div>`,

  /* 2 — DevStarter: resource directory */
  `<div class="prev prev-devstarter" aria-hidden="true">
    <div class="ds-search">&#9906; Search resources…</div>
    <div class="ds-tabs">
      <span class="ds-tab ds-tab--on">All</span>
      <span class="ds-tab">Web Dev</span>
      <span class="ds-tab">CS</span>
      <span class="ds-tab">Tools</span>
    </div>
    <div class="ds-grid">
      <div class="ds-card"><span class="ds-icon">&#128187;</span>Web Development<span class="ds-hint">Start here</span></div>
      <div class="ds-card"><span class="ds-icon">&#129504;</span>CS Fundamentals<span class="ds-hint">Core concepts</span></div>
      <div class="ds-card"><span class="ds-icon">&#9881;</span>Tools &amp; Workflow<span class="ds-hint">Build faster</span></div>
    </div>
  </div>`
];

fetch('profile.json')
  .then(r => r.json())
  .then(p => {
    document.title = `${p.name} — TKM College of Engineering`;

    const tEl = $('tagline');
    if (tEl) {
      tEl.innerHTML = `<strong style="color:var(--fg);">${esc(p.name)}</strong> — First-year B.Tech student in Computer Science &amp; Artificial Intelligence at <strong style="color:var(--green);">T.K.M. College of Engineering, Kollam</strong>. Learning through practical engineering, Git, and open-source contributions.`;
    }

    const gh = p.links?.github || '#';
    ['nav-cta', 'github-link'].forEach(id => { const el = $(id); if (el) el.href = gh; });

    const fEl = $('footer');
    if (fEl) fEl.textContent = `© ${new Date().getFullYear()} ${p.name}`;

    const skEl = $('skills');
    if (skEl) skEl.innerHTML = (p.skills || []).map(s => `<li>${esc(s)}</li>`).join('');

    const prEl = $('projects');
    if (prEl) {
      prEl.innerHTML = (p.projects || []).map((x, i) => `
<article class="card ${i === 0 ? 'card--featured' : 'card--small'}" data-reveal>
  <div class="card-preview">${PREVIEWS[i] || `<span class="card-ghost">${esc(x.title)}</span>`}</div>
  <div class="card-body">
    <div class="card-meta">
      <span class="card-num">0${i + 1}</span>
      <span class="card-cat">${CATS[i] || 'PROJECT'}</span>
    </div>
    <h3 class="card-title">${esc(x.title)}</h3>
    <p class="card-desc">${esc(x.desc)}</p>
    <a class="card-link"
       href="${safe(x.link)}"
       target="_blank"
       rel="noopener noreferrer"
       aria-label="Open ${esc(x.title)} in a new tab">
      <span>View Project</span>
      <span class="card-link-arrow" aria-hidden="true">↗</span>
    </a>
  </div>
</article>`).join('');

      if (window.__ro) prEl.querySelectorAll('[data-reveal]').forEach(el => window.__ro.observe(el));
    }
  })
  .catch(() => console.warn('portfolio: could not load profile.json'));
