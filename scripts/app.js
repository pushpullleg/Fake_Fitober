// External app script: populate members, build prefilled Google Form URL,
// save recent logs to localStorage, render recent logs and a simple leaderboard.

const members = [
  { name: 'Mukesh Ravichandran', cwid: '50380788' },
  { name: 'Trisha Harjono', cwid: '50386141' },
  { name: 'Jaahnavi Garikipati', cwid: '50393610' },
  { name: 'Tejaswini Damodara Kannan', cwid: '50380778' },
];
const teamName = "The Excel-erators";

// Google Form field entry IDs (use the full 'entry.123' form)
const entryIDs = {
  team: 'entry.500000070',
  member: 'entry.721958901',
  cwid: 'entry.1522950107',
  activity: 'entry.1322466239',
  duration: 'entry.737958173'
};

// CONFIG: set your webhook endpoint and API key here (or keep defaults for local dev)
const WEBHOOK = window.WEBHOOK_ENDPOINT || 'http://localhost:3000/api/log';
const WEBHOOK_API_KEY = window.WEBHOOK_API_KEY || 'dev-key';

// Helper: build prefilled form URL
function buildPrefillURL(profile, activity, duration) {
  const params = new URLSearchParams();
  params.append(entryIDs.team, teamName);
  params.append(entryIDs.member, profile.name);
  params.append(entryIDs.cwid, profile.cwid);
  params.append(entryIDs.activity, activity);
  params.append(entryIDs.duration, duration);
  return `https://docs.google.com/forms/d/e/1FAIpQLSfhLBkLnU8xGQouW4lr_ALblEuij9aCkgYad5F87T06XBJUvg/viewform?pli=1&${params.toString()}`;
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
