/* ───────────────────────────────────────────────
   script.js — Data loader for Anfaal portfolio
   Reads profile.json and renders all dynamic UI.
   ─────────────────────────────────────────────── */

const $   = id => document.getElementById(id);
const esc = s  => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safe = u => /^https?:\/\//i.test(u) ? u : '#';

/* Project category labels — ordered to match profile.json */
const CATS = ['WEB APP', 'PRODUCTIVITY', 'RESOURCES'];

fetch('profile.json')
  .then(r => r.json())
  .then(p => {

    /* ── Page title ── */
    document.title = `${p.name} — Portfolio`;

    /* ── Tagline ── */
    const tEl = $('tagline');
    if (tEl) tEl.textContent = p.tagline;

    /* ── GitHub links (nav CTA + hero button) ── */
    const gh = p.links?.github || '#';
    ['nav-cta', 'github-link'].forEach(id => {
      const el = $(id);
      if (el) el.href = gh;
    });

    /* ── Footer copyright ── */
    const fEl = $('footer');
    if (fEl) fEl.textContent = `© ${new Date().getFullYear()} ${p.name}`;

    /* ── Skills — large typographic list ── */
    const skEl = $('skills');
    if (skEl) {
      skEl.innerHTML = (p.skills || [])
        .map(s => `<li>${esc(s)}</li>`)
        .join('');
    }

    /* ── Projects — bento grid ── */
    const prEl = $('projects');
    if (prEl) {
      prEl.innerHTML = (p.projects || []).map((x, i) => {
        const featured = i === 0;
        const cat      = CATS[i] || 'PROJECT';
        return `
<article class="card ${featured ? 'card--featured' : 'card--small'}" data-reveal>
  <div class="card-preview" aria-hidden="true">
    <span class="card-ghost">${esc(x.title)}</span>
  </div>
  <div class="card-body">
    <div class="card-meta">
      <span class="card-num">0${i + 1}</span>
      <span class="card-cat">${esc(cat)}</span>
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
</article>`;
      }).join('');

      /* Observe newly inserted cards for scroll-reveal */
      if (window.__ro) {
        prEl.querySelectorAll('[data-reveal]').forEach(el => window.__ro.observe(el));
      }
    }
  })
  .catch(() => {
    /* Graceful fallback — site still renders without data */
    console.warn('portfolio: could not load profile.json');
  });
