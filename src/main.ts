import './styles.css';
import { exportCsv, importCsv } from './csv';
import { storage } from './db';
import { completeSession, decideProgression, suggestedWeight } from './progression';
import { buyUrl, initializeLicense, restoreLicense, type LicenseState } from './license';
import { defaultSettings, type DraftSession, type Session, type Settings } from './types';

const app = document.querySelector<HTMLDivElement>('#app')!;
let settings: Settings = { ...defaultSettings };
let draft: DraftSession | null = null;
let sessions: Session[] = [];
let storageHealthy = true;
let lastResult: Session | null = null;
let message = '';
let license: LicenseState = { unlocked: false, checking: false, notice: '' };
let persistenceQueue = Promise.resolve();
let pendingServiceWorker: ServiceWorker | null = null;
let refreshingForUpdate = false;

const escapeHtml = (value: unknown) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const formatWeight = (weight: number) => Number.isInteger(weight) ? String(weight) : String(weight).replace(/0+$/, '').replace(/\.$/, '');
const formatDate = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

function announce(text: string): void {
  message = text;
  const region = document.querySelector<HTMLElement>('#announcer');
  if (region) region.textContent = text;
  const feedback = document.querySelector<HTMLElement>('#feedback');
  if (feedback) { feedback.textContent = text; feedback.classList.remove('hidden'); }
}

async function save(action: () => Promise<unknown>): Promise<void> {
  if (!storageHealthy) return;
  try { await action(); }
  catch {
    storageHealthy = false;
    announce('Browser storage became unavailable. This tab still works, but export before closing it.');
    render();
  }
}

function queueSave(action: () => Promise<unknown>): Promise<void> {
  persistenceQueue = persistenceQueue.then(() => save(action));
  return persistenceQueue;
}

function compassMark(): string {
  return `<svg class="brand-mark" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="18"/><path d="M24 5v8M24 35v8M5 24h8M35 24h8"/><path class="mark-needle" d="m24 13 5 13-5 9-5-9 5-13Z"/><path d="M15 31h3M21 35h6M30 31h3"/></svg>`;
}

function currentCue(): string {
  const setNumber = (draft?.sets.length ?? 0) + 1;
  const weight = draft?.weight ?? suggestedWeight(settings, sessions);
  const setDots = Array.from({ length: settings.setCount }, (_, index) => {
    const entry = draft?.sets[index];
    return `<li class="set-dot ${entry ? 'complete' : index === setNumber - 1 ? 'active' : ''}">
      <span>${entry ? `${entry.reps} reps · ${entry.rir} RIR` : `Set ${index + 1}`}</span>
    </li>`;
  }).join('');
  const outcome = lastResult ? `<div class="outcome ${lastResult.decision}" role="status">
    <span class="eyebrow">Last session complete</span>
    <strong>${lastResult.decision === 'increase' ? `Increase to ${formatWeight(lastResult.nextWeight)} ${lastResult.unit}` : `Repeat ${formatWeight(lastResult.weight)} ${lastResult.unit}`}</strong>
    <span>${escapeHtml(decideProgression(settings, lastResult).reason)}</span>
  </div>` : '';

  return `<section class="cue-card" aria-labelledby="cue-title">
    <div class="signal-notch" aria-hidden="true"></div>
    ${outcome}
    <div class="cue-heading">
      <div><span class="eyebrow">Current bearing</span><h2 id="cue-title">Set ${setNumber} of ${settings.setCount}</h2></div>
      <span class="local-chip">On this device</span>
    </div>
    <p class="target"><strong>${settings.repMin}–${settings.repMax}</strong> <span>reps</span></p>
    <p class="weight-line">at <strong>${formatWeight(weight)} ${settings.unit}</strong></p>
    <ol class="set-track" aria-label="Set progress">${setDots}</ol>
    <form id="log-form" class="log-form" novalidate>
      <div class="field"><label for="weight">Weight (${settings.unit})</label><input id="weight" name="weight" type="number" min="0" max="9999" step="0.01" value="${formatWeight(weight)}" ${draft ? 'readonly' : ''} required /></div>
      <div class="field"><label for="reps">Reps</label><input id="reps" name="reps" type="number" min="0" max="100" inputmode="numeric" value="${settings.repMin}" required /></div>
      <div class="field"><label for="rir">RIR <span class="hint">reps left</span></label><input id="rir" name="rir" type="number" min="0" max="10" inputmode="numeric" value="2" required /></div>
      <button class="primary" type="submit">${setNumber === settings.setCount ? 'Finish session' : 'Log set'} <span aria-hidden="true">→</span></button>
    </form>
    <p class="microcopy">RIR is your estimate of reps left in reserve. Suggestions use only the arithmetic rule below.</p>
    ${draft ? '<button id="discard-session" class="text-button danger" type="button">Discard current session</button>' : ''}
  </section>`;
}

function settingsPanel(): string {
  return `<details class="glass-section" id="settings-section">
    <summary><span><span class="eyebrow">Your rule</span><strong>${settings.setCount} × ${settings.repMin}–${settings.repMax} · +${formatWeight(settings.increment)} ${settings.unit}</strong></span><span class="summary-action">Change</span></summary>
    <form id="settings-form" class="settings-form">
      <div class="field wide"><label for="exercise">Exercise label</label><input id="exercise" name="exercise" maxlength="60" value="${escapeHtml(settings.exercise)}" required /></div>
      <div class="field"><label for="set-count">Working sets</label><input id="set-count" name="setCount" type="number" min="1" max="10" value="${settings.setCount}" required /></div>
      <div class="field"><label for="rep-min">Rep range from</label><input id="rep-min" name="repMin" type="number" min="1" max="99" value="${settings.repMin}" required /></div>
      <div class="field"><label for="rep-max">Rep range to</label><input id="rep-max" name="repMax" type="number" min="2" max="100" value="${settings.repMax}" required /></div>
      <div class="field"><label for="start-weight">Starting weight</label><input id="start-weight" name="startWeight" type="number" min="0" max="9999" step="0.01" value="${settings.startWeight}" required /></div>
      <div class="field"><label for="increment">Increase by</label><input id="increment" name="increment" type="number" min="0.01" max="999" step="0.01" value="${settings.increment}" required /></div>
      <div class="field"><label for="unit">Unit</label><select id="unit" name="unit"><option ${settings.unit === 'kg' ? 'selected' : ''}>kg</option><option ${settings.unit === 'lb' ? 'selected' : ''}>lb</option></select></div>
      <div class="field wide"><label for="rule">Weight-increase rule</label><select id="rule" name="rule"><option value="all-top" ${settings.rule === 'all-top' ? 'selected' : ''}>Every set reaches the top of the range</option><option value="total-reps" ${settings.rule === 'total-reps' ? 'selected' : ''}>Session reaches a total-rep target</option></select></div>
      <div class="field"><label for="total-target">Total-rep target</label><input id="total-target" name="totalTarget" type="number" min="1" max="1000" value="${settings.totalTarget}" required /></div>
      <div class="field"><label for="rir-floor">Minimum RIR to increase</label><select id="rir-floor" name="rirFloor"><option value="" ${settings.rirFloor === null ? 'selected' : ''}>No RIR condition</option>${[0,1,2,3,4,5].map((value) => `<option value="${value}" ${settings.rirFloor === value ? 'selected' : ''}>${value}+ RIR</option>`).join('')}</select></div>
      <p class="form-note wide">Changing units does not convert existing weights. Total-rep target applies only when that rule is selected.</p>
      <button class="secondary wide" type="submit">Save progression rule</button>
    </form>
  </details>`;
}

function historySection(): string {
  const visible = license.unlocked ? sessions : sessions.slice(0, 5);
  const rows = visible.map((session) => `<li class="history-row">
    <div><strong>${escapeHtml(session.exercise)}</strong><span>${formatDate(session.completedAt)}</span></div>
    <div class="history-sets" aria-label="Sets: ${session.sets.map((set) => `${set.reps} reps at ${set.rir} RIR`).join(', ')}">${session.sets.map((set) => `<span>${set.reps}<small> @${set.rir}</small></span>`).join('')}</div>
    <div class="history-decision ${session.decision}"><span>${formatWeight(session.weight)} ${session.unit}</span><strong>${session.decision === 'increase' ? `Next ${formatWeight(session.nextWeight)}` : 'Repeat'}</strong></div>
  </li>`).join('');
  const empty = `<div class="empty-state"><span class="empty-rings" aria-hidden="true"></span><h3>No completed sessions yet</h3><p>Log ${settings.setCount} sets and the repeat-or-increase decision will land here.</p></div>`;
  const limit = !license.unlocked && sessions.length > 5 ? `<p class="locked-note">Showing your five latest sessions. Compass Plus reveals the full on-screen history; CSV export always includes everything.</p>` : '';
  return `<section class="history-section" aria-labelledby="history-title">
    <div class="section-heading"><div><span class="eyebrow">Flight log</span><h2 id="history-title">Recent sessions</h2></div><span>${sessions.length} total</span></div>
    ${sessions.length ? `<ol class="history-list">${rows}</ol>${limit}` : empty}
  </section>`;
}

function dataAndLicense(): string {
  return `<div class="lower-grid">
    <details class="glass-section"><summary><span><span class="eyebrow">Local data</span><strong>Export, import, or clear</strong></span><span class="summary-action">Open</span></summary>
      <div class="data-tools">
        <p>Your log lives in this browser’s IndexedDB. Export a portable copy before clearing site data or changing devices.</p>
        <div class="button-row"><button id="export-csv" class="secondary" type="button">Export CSV</button><label class="file-button" for="import-csv">Import CSV</label><input class="visually-hidden" id="import-csv" type="file" accept=".csv,text/csv" /></div>
        <button id="clear-data" class="text-button danger" type="button">Clear all local data</button>
      </div>
    </details>
    <details class="glass-section"><summary><span><span class="eyebrow">One-time unlock</span><strong>${license.unlocked ? 'Compass Plus active' : 'Compass Plus · $12 once'}</strong></span><span class="summary-action">${license.unlocked ? 'Active' : 'View'}</span></summary>
      <div class="upgrade-copy">
        <p>The free compass includes logging, progression rules, offline use, and unlimited CSV export. Plus unlocks your full on-screen history and future convenience views for a one-time $12 purchase.</p>
        <p class="license-notice" role="status">${escapeHtml(license.notice)}</p>
        ${license.unlocked ? '<p class="success-line">✓ This device is unlocked.</p>' : `<a class="primary link-button" href="${buyUrl}">Buy Compass Plus</a>`}
        <form id="license-form" class="license-form"><label for="license-token">Have a license? Paste it here</label><div><input id="license-token" name="license" type="password" autocomplete="off" required /><button class="secondary" type="submit">Restore</button></div></form>
        <p class="form-note">Sociobot/Dodo is the merchant of record. Refunds are handled there and revoke the license automatically. See <a href="/terms/">terms</a> and <a href="/privacy/">privacy</a>.</p>
      </div>
    </details>
  </div>`;
}

function render(): void {
  const offline = !navigator.onLine;
  app.innerHTML = `<header class="site-header"><div class="shell header-inner"><a class="brand" href="/" aria-label="Rep Range Compass home">${compassMark()}<span>Rep Range<br/><strong>Compass</strong></span></a><div class="network-status ${offline ? 'offline' : ''}"><span aria-hidden="true"></span>${offline ? 'Offline · saved locally' : 'Local-first'}</div></div></header>
    <main id="main">
      <section class="hero shell">
        <div class="hero-copy"><p class="kicker">Double progression, without the spreadsheet</p><h1>Know the next set.<br/><em>Earn the next weight.</em></h1><p class="lede">Log weight, reps, and RIR. Your rule gives one clear bearing: repeat or increase. Nothing leaves this device unless you export it.</p><a class="hero-jump" href="#compass">Open your compass <span aria-hidden="true">↓</span></a></div>
        <picture class="hero-art"><source type="image/avif" srcset="/assets/progression-landscape-640.avif 640w, /assets/progression-landscape-1280.avif 1280w" sizes="(max-width: 900px) 75vw, 760px"/><source type="image/webp" srcset="/assets/progression-landscape-640.webp 640w, /assets/progression-landscape-1280.webp 1280w" sizes="(max-width: 900px) 75vw, 760px"/><img src="/assets/progression-landscape-1280.jpg" width="1280" height="853" alt="Three translucent platforms ascend toward a small amber signal, representing completed rep targets." decoding="async" fetchpriority="high" /></picture>
      </section>
      <section class="workbench shell" id="compass" aria-label="Progression compass">
        <div class="storage-alert ${storageHealthy ? 'hidden' : ''}" role="alert"><strong>Local storage is unavailable.</strong> You can continue in this tab, but export before closing it.</div>
        <div class="compass-grid">${currentCue()}<div class="side-stack">${settingsPanel()}<div class="principle"><span aria-hidden="true">≠</span><p><strong>Arithmetic, not coaching.</strong> This tool applies the rule you set. It is not medical advice and cannot judge technique, fatigue, pain, or readiness.</p></div></div></div>
      </section>
      <div class="shell">${historySection()}${dataAndLicense()}</div>
    </main>
    <footer><div class="shell footer-inner"><div>${compassMark()}<p><strong>Rep Range Compass</strong><br/>Private by default. Useful offline.</p></div><nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav><p class="provenance">Landscape artwork was generated for this product with Azure OpenAI. No tracking, no account.</p></div></footer>
    <div id="announcer" class="visually-hidden" aria-live="polite">${escapeHtml(message)}</div><div id="feedback" class="feedback ${message ? '' : 'hidden'}" role="status">${escapeHtml(message)}</div>
    <div id="update-toast" class="toast ${pendingServiceWorker ? '' : 'hidden'}" role="status"><span>An app update is ready.</span><button id="apply-update" type="button">Refresh now</button></div>`;
  bindEvents();
}

function readNumber(data: FormData, name: string): number {
  return Number(data.get(name));
}

function bindEvents(): void {
  document.querySelector<HTMLButtonElement>('#apply-update')?.addEventListener('click', () => {
    if (!pendingServiceWorker) return;
    refreshingForUpdate = true;
    pendingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
  });

  document.querySelector<HTMLFormElement>('#log-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const weight = readNumber(data, 'weight');
    const reps = readNumber(data, 'reps');
    const rir = readNumber(data, 'rir');
    if (weight < 0 || reps < 0 || reps > 100 || rir < 0 || rir > 10) { announce('Check weight, reps, and RIR before logging this set.'); return; }
    const now = new Date().toISOString();
    draft = draft ?? { id: crypto.randomUUID(), startedAt: now, weight, sets: [] };
    draft.sets.push({ reps, rir, loggedAt: now });
    let persistence: Promise<void>;
    if (draft.sets.length === settings.setCount) {
      const completed = completeSession(settings, draft, now);
      sessions = [completed, ...sessions.filter((item) => item.id !== completed.id)];
      lastResult = completed;
      draft = null;
      message = completed.decision === 'increase' ? `Session complete. Increase to ${completed.nextWeight} ${completed.unit}.` : `Session complete. Repeat ${completed.weight} ${completed.unit}.`;
      persistence = queueSave(async () => { await storage.putSession(completed); await storage.setDraft(null); });
    } else {
      const currentDraft = draft;
      message = `Set ${currentDraft.sets.length} logged. Set ${currentDraft.sets.length + 1} is next.`;
      persistence = queueSave(() => storage.setDraft(currentDraft));
    }
    render();
    document.querySelector<HTMLInputElement>('#reps')?.focus();
    await persistence;
  });

  document.querySelector<HTMLButtonElement>('#discard-session')?.addEventListener('click', async () => {
    if (!confirm(`Discard the ${draft?.sets.length ?? 0} logged set(s) in this unfinished session?`)) return;
    draft = null; lastResult = null;
    await save(() => storage.setDraft(null));
    render(); announce('Unfinished session discarded.');
  });

  document.querySelector<HTMLFormElement>('#settings-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const repMin = readNumber(data, 'repMin');
    const repMax = readNumber(data, 'repMax');
    if (repMax <= repMin) { announce('The top of the rep range must be greater than the bottom.'); document.querySelector('#rep-max')?.setAttribute('aria-invalid', 'true'); return; }
    if (draft && !confirm('Saving a new rule will discard the unfinished session. Continue?')) return;
    settings = {
      exercise: String(data.get('exercise')).trim(), unit: data.get('unit') as 'kg' | 'lb',
      setCount: readNumber(data, 'setCount'), repMin, repMax, increment: readNumber(data, 'increment'),
      startWeight: readNumber(data, 'startWeight'), rule: data.get('rule') as Settings['rule'],
      totalTarget: readNumber(data, 'totalTarget'), rirFloor: data.get('rirFloor') === '' ? null : readNumber(data, 'rirFloor')
    };
    draft = null; lastResult = null;
    await save(async () => { await storage.setSettings(settings); await storage.setDraft(null); });
    render(); announce('Progression rule saved.');
  });

  document.querySelector<HTMLButtonElement>('#export-csv')?.addEventListener('click', () => {
    if (!sessions.length) { announce('There are no completed sessions to export yet.'); return; }
    const blob = new Blob([exportCsv(sessions)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `rep-range-compass-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    URL.revokeObjectURL(url); announce(`Exported ${sessions.length} sessions.`);
  });

  document.querySelector<HTMLInputElement>('#import-csv')?.addEventListener('change', async (event) => {
    const input = event.currentTarget as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
    try {
      const imported = importCsv(await file.text());
      const merged = new Map(sessions.map((item) => [item.id, item]));
      imported.forEach((item) => merged.set(item.id, item));
      sessions = [...merged.values()].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
      await save(() => storage.putSessions(imported));
      render(); announce(`Imported ${imported.length} sessions. Existing matching sessions were updated.`);
    } catch (error) { announce(error instanceof Error ? error.message : 'The CSV could not be imported.'); }
    input.value = '';
  });

  document.querySelector<HTMLButtonElement>('#clear-data')?.addEventListener('click', async () => {
    if (!confirm(`Clear ${sessions.length} completed session(s), the current rule, and any unfinished set? Export first if you want a backup.`)) return;
    sessions = []; draft = null; settings = { ...defaultSettings }; lastResult = null;
    await save(() => storage.clearAll()); render(); announce('All local training data was cleared.');
  });

  document.querySelector<HTMLFormElement>('#license-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget as HTMLFormElement);
    license = { ...license, checking: true, notice: 'Checking that license…' }; render();
    license = await restoreLicense(String(data.get('license') ?? '')); render();
  });
}

function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const showUpdate = (worker: ServiceWorker) => {
        pendingServiceWorker = worker;
        document.querySelector('#update-toast')?.classList.remove('hidden');
      };
      if (registration.waiting) showUpdate(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;
        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) showUpdate(installingWorker);
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (refreshingForUpdate) location.reload(); });
    } catch { announce('Offline installation is unavailable in this browser.'); }
  };
  if (document.readyState === 'complete') void register();
  else window.addEventListener('load', register, { once: true });
}

async function start(): Promise<void> {
  try {
    const [savedSettings, savedDraft, savedSessions] = await Promise.all([storage.getSettings(), storage.getDraft(), storage.getSessions()]);
    settings = savedSettings ?? { ...defaultSettings }; draft = savedDraft ?? null; sessions = savedSessions;
  } catch { storageHealthy = false; }
  render();
  window.addEventListener('online', render); window.addEventListener('offline', render);
  license = await initializeLicense((state) => { license = state; render(); }); render();
  registerServiceWorker();
}

void start();
