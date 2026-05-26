/* write_paper.js — Write a Paper toolbar logic
   Loaded before ui.js. Registers _openWritePaperImpl and _clearWritePaperImpl
   which ui.js delegates to via window.openWritePaper / window.clearWritePaper.
   v=20260526a */

window._writerState = {
  active: false,
  format: 'APA 7th',
  type: 'Research Paper',
  length: '3000w',
};

/* ── Gate card for free users ── */
function _showWriterUpgradeGate() {
  if (document.getElementById('_wp-upgrade-gate')) return;
  const el = document.createElement('div');
  el.id = '_wp-upgrade-gate';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:9999;';
  el.innerHTML = `
    <div style="background:#fff;border-radius:20px;max-width:380px;width:100%;padding:28px 24px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.25);">
      <div style="font-size:38px;margin-bottom:12px;">🔒</div>
      <h3 style="font-size:17px;font-weight:900;color:#111;margin:0 0 8px 0;">Write a Paper is a Plus &amp; Pro feature</h3>
      <p style="font-size:13px;color:#6b7280;line-height:1.65;margin:0 0 22px 0;">
        Upgrade to generate full academic papers with citations in APA, IEEE, MLA, Harvard and more — starting at <strong>₹399/mo</strong>.
      </p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <a href="/pricing.html" style="display:block;padding:12px 16px;background:#facc15;color:#111;font-weight:800;font-size:14px;border-radius:12px;text-decoration:none;">⚡ See Plans &amp; Upgrade</a>
        <button onclick="document.getElementById('_wp-upgrade-gate').remove()" style="padding:10px;background:transparent;border:1px solid #e5e7eb;color:#9ca3af;font-size:13px;font-weight:600;border-radius:12px;cursor:pointer;">Maybe later</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) el.remove(); });
}

/* ── Quota exhausted card ── */
function _showWriterQuotaGate(used, limit, plan) {
  if (document.getElementById('_wp-quota-gate')) return;
  const el = document.createElement('div');
  el.id = '_wp-quota-gate';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:9999;';
  el.innerHTML = `
    <div style="background:#fff;border-radius:20px;max-width:380px;width:100%;padding:28px 24px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.25);">
      <div style="font-size:38px;margin-bottom:12px;">📄</div>
      <h3 style="font-size:17px;font-weight:900;color:#111;margin:0 0 8px 0;">Monthly limit reached</h3>
      <p style="font-size:13px;color:#6b7280;line-height:1.65;margin:0 0 6px 0;">
        You've used <strong>${used}/${limit}</strong> paper write-ups this month on your <strong>${plan.charAt(0).toUpperCase()+plan.slice(1)}</strong> plan.
      </p>
      <p style="font-size:12px;color:#9ca3af;margin:0 0 22px 0;">Resets on the 1st of next month.</p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${plan === 'plus' ? `<a href="/pricing.html" style="display:block;padding:12px 16px;background:#facc15;color:#111;font-weight:800;font-size:14px;border-radius:12px;text-decoration:none;">⚡ Upgrade to Pro (5/month)</a>` : ''}
        <button onclick="document.getElementById('_wp-quota-gate').remove()" style="padding:10px;background:transparent;border:1px solid #e5e7eb;color:#9ca3af;font-size:13px;font-weight:600;border-radius:12px;cursor:pointer;">Close</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) el.remove(); });
}

/* ── Show the toolbar ── */
function _showWriterToolbar(used, limit) {
  const toolbar = document.getElementById('writer-toolbar');
  if (!toolbar) return;

  // Restore selects to current state
  const fmt = document.getElementById('wp-format');
  const typ = document.getElementById('wp-type');
  const len = document.getElementById('wp-length');
  if (fmt) fmt.value = window._writerState.format;
  if (typ) typ.value = window._writerState.type;
  if (len) len.value = window._writerState.length;

  // Update quota badge
  const badge = document.getElementById('wp-quota-badge');
  if (badge && limit) {
    badge.textContent = `${used}/${limit} write-ups this month`;
  }

  toolbar.style.display = 'flex';
  window._writerState.active = true;

  // Sync the old chip (kept for chat.js compatibility)
  const chip  = document.getElementById('write-paper-chip');
  const label = document.getElementById('write-paper-chip-label');
  if (chip && label) {
    label.textContent = `Write a Paper · ${window._writerState.format}`;
    chip.classList.remove('hidden');
    chip.classList.add('flex');
  }
}

/* ── _wpSet — called by the inline onchange handlers in the toolbar ── */
window._wpSet = (key, value) => {
  window._writerState[key] = value;

  // Keep _paperCitationFormat in sync so chat.js picks it up
  if (key === 'format') {
    window._paperCitationFormat = value;
    const label = document.getElementById('write-paper-chip-label');
    if (label) label.textContent = `Write a Paper · ${value}`;
  }
};

/* ── Main entry point (called by ui.js → openWritePaper) ── */
window._openWritePaperImpl = async () => {
  const supa = window.appState?.supabaseUser;
  if (!supa) { window.openAuthModal?.('login'); return; }

  const plan = (supa.plan || 'free').toLowerCase();
  if (plan === 'free') { _showWriterUpgradeGate(); return; }

  // Call backend to check quota + increment
  let data;
  try {
    const res = await fetch(`${window.BACKEND_URL || ''}/start-paper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: supa.id })
    });
    data = await res.json();
  } catch (e) {
    console.error('start-paper error', e);
    // Fail open — let user write if backend is unreachable
    data = { ok: true, used: 1, limit: plan === 'pro' ? 5 : 3 };
  }

  if (!data.ok) {
    if (data.error === 'upgrade') { _showWriterUpgradeGate(); return; }
    if (data.error === 'quota')   { _showWriterQuotaGate(data.used, data.limit, plan); return; }
    if (data.error === 'auth')    { window.openAuthModal?.('login'); return; }
    return;
  }

  // Activate Research mode
  const researchBtn = document.querySelector('[data-mode="research"]');
  window.setMode?.('research', researchBtn);

  // Store format for chat.js
  window._paperCitationFormat = window._writerState.format;

  // Show toolbar
  _showWriterToolbar(data.used, data.limit);

  document.getElementById('chat-input')?.focus();
};

/* ── Clear / exit writer mode ── */
window._clearWritePaperImpl = () => {
  window._writerState.active = false;
  window._paperCitationFormat = null;

  const toolbar = document.getElementById('writer-toolbar');
  if (toolbar) toolbar.style.display = 'none';

  const chip = document.getElementById('write-paper-chip');
  if (chip) {
    chip.classList.add('hidden');
    chip.classList.remove('flex');
  }
};

console.log('write_paper.js loaded ✅');
