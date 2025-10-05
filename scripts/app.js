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
  let logs = JSON.parse(localStorage.getItem('fitober_logs') || '[]');
  logs.unshift(log);
  logs = logs.slice(0, 7);
  localStorage.setItem('fitober_logs', JSON.stringify(logs));
  renderRecentLogs();
  updateLeaderboard();
}

function renderRecentLogs() {
  const logs = JSON.parse(localStorage.getItem('fitober_logs') || '[]');
  let ul = document.getElementById('recentLog');
  if (!ul) {
    // create the section
    const container = document.createElement('div');
    container.className = 'info';
    container.style.marginTop = '20px';
    container.innerHTML = '<strong>Recent logs</strong><ul id="recentLog" style="margin-top:8px"></ul>';
    const footer = document.querySelector('.footer-credit');
    footer.parentNode.insertBefore(container, footer);
    ul = document.getElementById('recentLog');
  }
  ul.innerHTML = '';
  logs.forEach(l => {
    const li = document.createElement('li');
    li.textContent = `${l.date} | ${l.member} | ${l.activity} (${l.duration} min)`;
    ul.appendChild(li);
  });
}

function updateLeaderboard() {
  const logs = JSON.parse(localStorage.getItem('fitober_logs') || '[]');
  const totals = {};
  members.forEach(m => { totals[m.name] = 0; });
  logs.forEach(l => {
    if (totals[l.member] !== undefined) {
      totals[l.member] += parseInt(l.duration) || 0;
    }
  });
  const sorted = Object.entries(totals).sort((a,b) => b[1] - a[1]);

  let lb = document.getElementById('leaderboardList');
  if (!lb) {
    const container = document.createElement('div');
    container.className = 'info';
    container.style.marginTop = '12px';
    container.innerHTML = '<strong>Leaderboard</strong><ul id="leaderboardList" style="margin-top:8px"></ul>';
    const footer = document.querySelector('.footer-credit');
    footer.parentNode.insertBefore(container, footer);
    lb = document.getElementById('leaderboardList');
  }
  lb.innerHTML = '';
  sorted.forEach(([name, min]) => {
    const li = document.createElement('li');
    li.textContent = `${name}: ${min} min`;
    lb.appendChild(li);
  });
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

  // Mirror clicks on duration buttons (only the set generated in index.html)
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.duration-btn');
    if (!btn) return;
    // toggle selected styling
    document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const d = btn.dataset.duration || btn.textContent.replace(/[^0-9]/g,'');
    if (d) {
      window._selectedDuration = String(d);
      // reflect selection into manual input so user can edit it
      const manual = document.getElementById('manualDuration');
      if (manual) manual.value = String(d);
    }
  });

  // If manual input exists, mirror its changes into window._selectedDuration
  const manualInput = document.getElementById('manualDuration');
  if (manualInput) {
    manualInput.addEventListener('input', (e) => {
      const v = e.target.value && Number(e.target.value) > 0 ? String(Number(e.target.value)) : '';
      if (v) {
        // clear any selected duration button
        document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
        window._selectedDuration = v;
      } else {
        window._selectedDuration = '';
      }
    });
    manualInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'e' || ev.key === 'E' || ev.key === '+' || ev.key === '-') ev.preventDefault();
    });
  }

  // Wire the existing submit button to post to webhook then open the prefilled form
  const submitBtn = document.getElementById('submitBtn');
  const copyBtn = document.getElementById('copyBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
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
          const date = new Date().toLocaleDateString('en-GB', { year:'numeric', month:'short', day:'2-digit' });
          saveRecentLog({ date, member: profile.name, activity, duration });
          const url = buildPrefillURL(profile, activity, duration);
          window.open(url, '_blank');
        });
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      // reuse buildURL and copy function already defined in page script
      const url = `${WEBHOOK}/?preview=1`;
      navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(url) : null;
    });
  }

  // initial state
  memberSelect.value = '';
  renderRecentLogs();
  updateLeaderboard();
});
