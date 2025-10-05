// Minimal client script: build a Google Form prefill URL from FORM_CONFIG
// and open it. No webhooks, no logging — intentionally tiny for GitHub Pages.

(function () {
  'use strict';

  // safe helpers
  function normalizeEntryId(id) {
    if (!id) return null;
    id = String(id).trim();
    if (!id) return null;
    return id.startsWith('entry.') ? id : 'entry.' + id;
  }

  function getConfig() {
    if (typeof FORM_CONFIG !== 'undefined' && FORM_CONFIG) return FORM_CONFIG;
    return null;
  }

  function buildURLFromConfig(name, cwid, activity, duration) {
    const cfg = getConfig();
    if (!cfg) return '';
    const e = cfg.entries || {};
    const formBase = cfg.formBaseURL || '';
    const params = new URLSearchParams();
    const teamKey = normalizeEntryId(e.teamName || e.team || e.team_name);
    const nameKey = normalizeEntryId(e.name || e.member);
    const cwidKey = normalizeEntryId(e.cwid);
    const activityKey = normalizeEntryId(e.activity);
    const durationKey = normalizeEntryId(e.duration);
    if (teamKey && cfg.teamName) params.append(teamKey, cfg.teamName);
    if (nameKey) params.append(nameKey, name || '');
    if (cwidKey) params.append(cwidKey, cwid || '');
    if (activityKey) params.append(activityKey, activity || '');
    if (durationKey) params.append(durationKey, duration || '');
    return params.toString() ? `${formBase}?${params.toString()}` : formBase;
  }

  // UI wiring
  document.addEventListener('DOMContentLoaded', () => {
    const cfg = getConfig();
    const memberSelect = document.getElementById('member');
    const activitySelect = document.getElementById('activity');
    const durationButtons = document.querySelector('.duration-buttons');
    const manualInput = document.getElementById('manualDuration');
    const slider = document.getElementById('durationSlider');
    const actionBtn = document.getElementById('copyBtn');

    if (!memberSelect || !activitySelect || !actionBtn) return;

    // populate members and activities from config if present
    if (cfg && cfg.teamMembers) {
      memberSelect.innerHTML = '<option value="">-- Choose a member --</option>';
      Object.entries(cfg.teamMembers).forEach(([n, id]) => {
        const opt = document.createElement('option');
        opt.value = `${n}|${id}`;
        opt.textContent = n;
        memberSelect.appendChild(opt);
      });
    }

    if (cfg && Array.isArray(cfg.activities)) {
      activitySelect.innerHTML = '<option value="">-- Choose an activity --</option>';
      cfg.activities.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a; opt.textContent = a; activitySelect.appendChild(opt);
      });
    }

    // build duration buttons from DOM or config
    if (durationButtons && cfg && Array.isArray(cfg.durations)) {
      durationButtons.innerHTML = '';
      cfg.durations.forEach(d => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'duration-btn';
        btn.dataset.duration = String(d);
        btn.textContent = `${d} min`;
        durationButtons.appendChild(btn);
      });
    }

    // shared duration state
    let selectedDuration = '';

    // delegate duration button clicks
    if (durationButtons) {
      durationButtons.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.duration-btn');
        if (!btn) return;
        document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedDuration = String(btn.dataset.duration || btn.textContent.replace(/[^0-9]/g, ''));
        if (manualInput) manualInput.value = selectedDuration;
        if (slider) slider.value = selectedDuration;
      });
    }

    // manual input
    if (manualInput) {
      manualInput.addEventListener('input', (e) => {
        const v = e.target.value && Number(e.target.value) > 0 ? String(Number(e.target.value)) : '';
        document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
        selectedDuration = v;
        if (slider && v) slider.value = v;
      });
    }

    // slider
    if (slider) {
      slider.addEventListener('input', (e) => {
        selectedDuration = String(e.target.value);
        if (manualInput) manualInput.value = selectedDuration;
        document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
      });
      // init
      selectedDuration = String(slider.value || '');
      if (manualInput) manualInput.value = selectedDuration;
    }

    // action button: validate minimal fields, build url, copy & open
    actionBtn.addEventListener('click', () => {
      const memberVal = memberSelect.value || '';
      const activityVal = activitySelect.value || '';
      const durationVal = selectedDuration || '';
      if (!memberVal) { alert('Please select a member'); return; }
      if (!activityVal) { alert('Please select an activity'); return; }
      if (!durationVal) { alert('Please select a duration'); return; }

      const [name, cwid] = memberVal.split('|');
      const url = buildURLFromConfig(name, cwid, activityVal, durationVal);
      if (!url) { alert('Form not configured. Please set FORM_CONFIG in index.html'); return; }

      // copy to clipboard (best-effort) then open
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).catch(() => {});
      }
      window.open(url, '_blank');
    });
  });
})();
// External app script: populate members, build prefilled Google Form URL,
// save recent logs to localStorage, render recent logs and a simple leaderboard.

const members = [
  { name: 'Mukesh Ravichandran', cwid: '50380788' },
  { name: 'Trisha Harjono', cwid: '50386141' },
  { name: 'Jaahnavi Garikipati', cwid: '50393610' },
  { name: 'Tejaswini Damodara Kannan', cwid: '50380778' },
];
const teamName = "The Excel-erators";

// NOTE: entry IDs and form base URL are consolidated in `index.html`'s FORM_CONFIG.
// This file will attempt to read mapping from that object; if it's not present,
// fallback to a minimal, hard-coded mapping (so development doesn't immediately fail).

// Minimal fallback mapping (development only)
const fallbackEntryIDs = {
  team: 'entry.500000070',
  member: 'entry.721958901',
  cwid: 'entry.1522950107',
  activity: 'entry.1322466239',
  duration: 'entry.737958173'
};

function normalizeEntryIdLocal(id) {
  if (!id) return null;
  id = String(id).trim();
  if (!id) return null;
  if (id.startsWith('entry.')) return id;
  return 'entry.' + id;
}

// CONFIG: set your webhook endpoint and API key here (or keep defaults for local dev)
const WEBHOOK = window.WEBHOOK_ENDPOINT || 'http://localhost:3000/api/log';
const WEBHOOK_API_KEY = window.WEBHOOK_API_KEY || 'dev-key';

// Helper: build prefilled form URL
function buildPrefillURL(profile, activity, duration) {
  // Prefer FORM_CONFIG.entries defined in index.html. If not available, fall back.
  const cfgEntries = (typeof FORM_CONFIG !== 'undefined' && FORM_CONFIG.entries) ? FORM_CONFIG.entries : fallbackEntryIDs;
  const formBase = (typeof FORM_CONFIG !== 'undefined' && FORM_CONFIG.formBaseURL) ? FORM_CONFIG.formBaseURL : 'https://docs.google.com/forms/d/e/1FAIpQLSfhLBkLnU8xGQouW4lr_ALblEuij9aCkgYad5F87T06XBJUvg/viewform';

  const entries = {};
  const teamKey = normalizeEntryIdLocal(cfgEntries.team || cfgEntries.teamName || cfgEntries.team_name);
  const memberKey = normalizeEntryIdLocal(cfgEntries.member || cfgEntries.name);
  const cwidKey = normalizeEntryIdLocal(cfgEntries.cwid);
  const activityKey = normalizeEntryIdLocal(cfgEntries.activity);
  const durationKey = normalizeEntryIdLocal(cfgEntries.duration);

  if (teamKey) entries[teamKey] = teamName;
  if (memberKey) entries[memberKey] = profile.name;
  if (cwidKey) entries[cwidKey] = profile.cwid;
  if (activityKey) entries[activityKey] = activity;
  if (durationKey) entries[durationKey] = duration;

  const params = new URLSearchParams(entries);
  return params.toString() ? `${formBase}?${params.toString()}` : formBase;
}

function saveRecentLog(log) {
  // intentionally disabled: recent logs are not used anymore
}

// wire up the existing DOM when ready
document.addEventListener('DOMContentLoaded', () => {
  const memberSelect = document.getElementById('member');
  if (!memberSelect) return;

  // Replace member select options with indexed options (so we can use index to look up members)
  memberSelect.innerHTML = '<option value="">-- Choose a member --</option>';
  members.forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = m.name;
    memberSelect.appendChild(opt);
  });

  // Make the team-name element have an id for JS-friendly updates
  const teamEl = document.querySelector('.team-name');
  if (teamEl) {
    teamEl.id = 'teamName';
    teamEl.textContent = teamName;
  }

  // Create / update a small CWID text element below member select
  let cwidEl = document.getElementById('cwid');
  if (!cwidEl) {
    cwidEl = document.createElement('div');
    cwidEl.id = 'cwid';
    cwidEl.style.marginTop = '6px';
    cwidEl.style.fontSize = '13px';
    cwidEl.style.color = '#666';
    memberSelect.parentNode.appendChild(cwidEl);
  }

  function updateProfile(idx) {
    const i = parseInt(idx);
    if (isNaN(i) || !members[i]) {
      cwidEl.textContent = '';
      return;
    }
    cwidEl.textContent = `CWID: ${members[i].cwid}`;
  }

  memberSelect.addEventListener('change', (e) => updateProfile(e.target.value));

  // Delegate clicks on the duration-buttons container so button clicks reliably update manual input
  const durationContainer = document.querySelector('.duration-buttons');
  if (durationContainer) {
    durationContainer.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.duration-btn');
      if (!btn) return;
      // toggle selected styling
      document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const d = btn.dataset.duration || btn.textContent.replace(/[^0-9]/g,'');
      if (d) {
        window._selectedDuration = String(d);
        // reflect into manual input so user can edit
        const manual = document.getElementById('manualDuration');
        if (manual) manual.value = String(d);
        // also sync slider
        const s = document.getElementById('durationSlider');
        if (s) s.value = String(d);
        const err = document.getElementById('durationError');
        if (err) err.style.display = 'none';
      }
    });
  }

  // If manual input exists, mirror its changes into window._selectedDuration
  const manualInput = document.getElementById('manualDuration');
  if (manualInput) {
    manualInput.addEventListener('input', (e) => {
      const v = e.target.value && Number(e.target.value) > 0 ? String(Number(e.target.value)) : '';
      if (v) {
        // clear any selected duration button
        document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
        window._selectedDuration = v;
        // sync slider
        const s = document.getElementById('durationSlider');
        if (s) s.value = v;
      } else {
        window._selectedDuration = '';
      }
    });
    manualInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'e' || ev.key === 'E' || ev.key === '+' || ev.key === '-') ev.preventDefault();
    });
  }

  // Slider behavior
  const slider = document.getElementById('durationSlider');
  if (slider) {
    // initialize selectedDuration from slider value
    window._selectedDuration = String(slider.value);
    const manual = document.getElementById('manualDuration');
    if (manual) manual.value = String(slider.value);
    slider.addEventListener('input', (e) => {
      const v = String(e.target.value);
      window._selectedDuration = v;
      // reflect into manual input and clear button highlights
      const m = document.getElementById('manualDuration');
      if (m) m.value = v;
      document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
      const err = document.getElementById('durationError');
      if (err) err.style.display = 'none';
    });
  }

  // Repurpose the copyBtn as the single action button: validate, post to webhook, then open form
  const actionBtn = document.getElementById('copyBtn');
  if (actionBtn) {
    actionBtn.addEventListener('click', () => {
      const sel = document.getElementById('member');
      const idx = sel.value;
      if (idx === '' || idx === undefined) {
        document.getElementById('memberError').style.display = 'block';
        return;
      }
      const profile = members[parseInt(idx)];
      const activity = document.getElementById('activity').value;
      const duration = window._selectedDuration || '';
      if (!activity) { document.getElementById('activityError').style.display = 'block'; return; }
      if (!duration) { document.getElementById('durationError').style.display = 'block'; return; }

      const payload = { team: teamName, member: profile.name, cwid: profile.cwid, activity, duration };
      const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + WEBHOOK_API_KEY };

      fetch(WEBHOOK, { method: 'POST', headers, body: JSON.stringify(payload) })
        .then(resp => {
          if (!resp.ok) console.warn('Webhook responded with', resp.status);
          return resp.json().catch(() => ({}));
        })
        .catch(err => {
          console.warn('Webhook error', err);
        })
        .finally(() => {
          const url = buildPrefillURL(profile, activity, duration);
          // show toast and then open the form
          showToast('Opening form...');
          setTimeout(() => window.open(url, '_blank'), 300);
        });
    });
  }

// Toast helper
function showToast(msg, ms = 2000) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  // trigger show class
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => { t.style.display = 'none'; }, 250);
  }, ms);
}

  // initial state
  memberSelect.value = '';
});
