import './styles.css';
import { createClient } from '@supabase/supabase-js';

const EVENT_START = new Date('2026-06-06T14:00:00-04:00');
const PHOTO_BUCKET = import.meta.env.VITE_SUPABASE_PHOTO_BUCKET || 'yuvi-party-photos';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const DEMO_RSVP_KEY = 'yuvi_rsvps_demo_v2';
const INTRO_KEY = 'yuvi_stadium_intro_seen_v2';

const supabaseConfigured =
  SUPABASE_URL.startsWith('https://') &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_URL.includes('your-project-ref') &&
  !SUPABASE_ANON_KEY.includes('your-public-anon-key');

const supabase = supabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const queryParams = new URLSearchParams(window.location.search);
const photoUploadUnlocked = true;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const pad = (number) => String(number).padStart(2, '0');
const clamp = (number, min, max) => Math.min(Math.max(number, min), max);


const TEAM_PRESETS = {
  'Brazil FC': { flag: '🇧🇷', short: 'BRA', primary: '#ffd84a', secondary: '#1fce62', accent: '#1a53ff' },
  'Argentina FC': { flag: '🇦🇷', short: 'ARG', primary: '#8de8ff', secondary: '#ffffff', accent: '#1f6cff' },
  'France FC': { flag: '🇫🇷', short: 'FRA', primary: '#2864ff', secondary: '#ffffff', accent: '#ff3958' },
  'Portugal FC': { flag: '🇵🇹', short: 'POR', primary: '#e81e35', secondary: '#0d9f4f', accent: '#ffd84a' },
  'Canada FC': { flag: '🇨🇦', short: 'CAN', primary: '#ff3958', secondary: '#ffffff', accent: '#c90028' },
  'England FC': { flag: '🏴', short: 'ENG', primary: '#ffffff', secondary: '#ff3958', accent: '#2864ff' },
  'Germany FC': { flag: '🇩🇪', short: 'GER', primary: '#ffffff', secondary: '#111111', accent: '#ffd84a' },
  'Mexico FC': { flag: '🇲🇽', short: 'MEX', primary: '#1fce62', secondary: '#ffffff', accent: '#ff3958' },
  'Yuvaan FC': { flag: '⚽', short: 'YUV', primary: '#ffd84a', secondary: '#2ee6ff', accent: '#ff2d8d' }
};

const PLAYER_PRESETS = {
  'Lionel Messi': { number: '10', role: 'Playmaker', emoji: '🐐', trait: 'GOAT VISION', rating: 99, hairStyle: 'messi', skin: '#c98a5d', hair: '#2b160f', beard: '#2a1711', stats: [['PAC', 94], ['SHO', 97], ['PAS', 99], ['DRB', 99]] },
  'Cristiano Ronaldo': { number: '07', role: 'Captain', emoji: '🚀', trait: 'POWER FINISH', rating: 99, hairStyle: 'ronaldo', skin: '#c99062', hair: '#151515', beard: 'rgba(37, 22, 16, .32)', stats: [['PAC', 95], ['SHO', 99], ['PHY', 96], ['JMP', 99]] },
  'Kylian Mbappé': { number: '10', role: 'Speedster', emoji: '⚡', trait: 'LIGHTNING RUN', rating: 98, hairStyle: 'mbappe', skin: '#8a543b', hair: '#111111', beard: 'rgba(25, 16, 12, .25)', stats: [['PAC', 99], ['SHO', 96], ['DRB', 97], ['AGI', 98]] },
  'Neymar Jr.': { number: '11', role: 'Skill master', emoji: '✨', trait: 'SKILL MOVES', rating: 97, hairStyle: 'neymar', skin: '#b8764d', hair: '#f6d66a', beard: '#2e1a12', stats: [['PAC', 94], ['SHO', 93], ['PAS', 95], ['DRB', 99]] }
};

const boothState = {
  team: 'Brazil FC',
  player: 'Lionel Messi',
  faceDataUrl: '',
  stream: null
};

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value;
}

function updateCountdown() {
  const diff = Math.max(0, EVENT_START.getTime() - Date.now());
  const secondsTotal = Math.floor(diff / 1000);
  const days = Math.floor(secondsTotal / 86400);
  const hours = Math.floor((secondsTotal % 86400) / 3600);
  const minutes = Math.floor((secondsTotal % 3600) / 60);
  const seconds = secondsTotal % 60;

  setText('#days', pad(days));
  setText('#hours', pad(hours));
  setText('#minutes', pad(minutes));
  setText('#seconds', pad(seconds));
}

function startCountdown() {
  updateCountdown();
  window.setInterval(updateCountdown, 1000);
}

function getLocalRsvps() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_RSVP_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalRsvp(rsvp) {
  const rsvps = getLocalRsvps();
  rsvps.push({ ...rsvp, created_at: new Date().toISOString() });
  localStorage.setItem(DEMO_RSVP_KEY, JSON.stringify(rsvps));
}

function buildLocalSummary() {
  const rsvps = getLocalRsvps();
  const going = rsvps.filter((rsvp) => rsvp.attendance === 'going');
  const maybe = rsvps.filter((rsvp) => rsvp.attendance === 'maybe');
  const notGoing = rsvps.filter((rsvp) => rsvp.attendance === 'not_going');
  const teamCounts = going.reduce((teams, rsvp) => {
    const team = rsvp.favorite_team || 'Yuvaan FC';
    teams[team] = (teams[team] || 0) + Number(rsvp.guest_count || 1);
    return teams;
  }, {});

  return {
    going_count: going.length,
    maybe_count: maybe.length,
    not_going_count: notGoing.length,
    total_people: going.reduce((total, rsvp) => total + Number(rsvp.guest_count || 1), 0),
    public_names: going.filter((rsvp) => rsvp.is_public).map((rsvp) => rsvp.display_name || rsvp.guest_name),
    team_counts: teamCounts
  };
}

function normalizeSummary(summary) {
  return {
    goingCount: Number(summary?.going_count || 0),
    maybeCount: Number(summary?.maybe_count || 0),
    notGoingCount: Number(summary?.not_going_count || 0),
    totalPeople: Number(summary?.total_people ?? summary?.going_count ?? 0),
    publicNames: Array.isArray(summary?.public_names) ? summary.public_names : [],
    teamCounts: summary?.team_counts && typeof summary.team_counts === 'object' ? summary.team_counts : {}
  };
}

function flagForTeam(team) {
  const name = String(team || '').toLowerCase();
  if (name.includes('brazil')) return '🇧🇷';
  if (name.includes('argentina')) return '🇦🇷';
  if (name.includes('france')) return '🇫🇷';
  if (name.includes('portugal')) return '🇵🇹';
  if (name.includes('canada')) return '🇨🇦';
  if (name.includes('england')) return '🏴';
  if (name.includes('germany')) return '🇩🇪';
  if (name.includes('mexico')) return '🇲🇽';
  return '⚽';
}

function renderSummary(summary) {
  const data = normalizeSummary(summary);

  setText('#going-count', data.totalPeople);
  setText('#maybe-count', data.maybeCount);
  setText('#not-going-count', data.notGoingCount);
  setText('#live-count-copy', data.totalPeople);

  renderTeamCounts(data.teamCounts);
  renderLineup(data.publicNames);
  renderGuestList(data.publicNames);
}

function renderTeamCounts(teamCounts = {}) {
  const board = $('#team-counts');
  const entries = Object.entries(teamCounts)
    .map(([team, count]) => [team, Number(count || 0)])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  $$('[data-team-live]').forEach((element) => {
    const team = element.dataset.teamLive;
    const count = Number(teamCounts[team] || 0);
    element.textContent = `${count} ${count === 1 ? 'player' : 'players'}`;
  });

  if (!board) return;

  board.innerHTML = '';
  if (!entries.length) {
    board.innerHTML = '<p class="team-empty">Pick a country when you RSVP and the tournament table will light up.</p>';
    return;
  }

  entries.slice(0, 6).forEach(([team, count], index) => {
    const row = document.createElement('div');
    row.className = 'team-count-row';
    row.innerHTML = `<em>${index + 1}</em><span>${flagForTeam(team)} ${escapeHtml(team)}</span><strong>${count}</strong>`;
    board.appendChild(row);
  });
}

function renderGuestList(names = []) {
  const list = $('#guest-list');
  if (!list) return;
  list.innerHTML = '';

  if (!names.length) {
    const item = document.createElement('li');
    item.textContent = 'No players yet. Be first on the team sheet.';
    list.appendChild(item);
    return;
  }

  names.slice(0, 50).forEach((name) => {
    const item = document.createElement('li');
    item.textContent = name;
    list.appendChild(item);
  });
}

function renderLineup(names = []) {
  const lineup = $('#pitch-lineup');
  if (!lineup) return;
  lineup.innerHTML = '';

  if (!names.length) {
    const empty = document.createElement('span');
    empty.textContent = 'No players yet. Be first on the team sheet.';
    lineup.appendChild(empty);
    return;
  }

  names.slice(0, 11).forEach((name) => {
    const player = document.createElement('div');
    player.className = 'lineup-player';
    player.innerHTML = `<span>😊</span><b>${escapeHtml(name)}</b>`;
    lineup.appendChild(player);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function loadRsvpSummary() {
  if (!supabase) {
    renderSummary(buildLocalSummary());
    const status = $('#rsvp-status');
    if (status && !getLocalRsvps().length) status.textContent = 'Preview mode. Add Supabase env vars for live RSVPs.';
    return;
  }

  const { data, error } = await supabase.rpc('get_rsvp_summary');
  if (error) throw error;
  renderSummary(Array.isArray(data) ? data[0] : data);
}

function readRsvpForm(form) {
  const formData = new FormData(form);
  const attendance = String(formData.get('attendance') || 'going');
  const rawCount = Number.parseInt(String(formData.get('guest_count') || '1'), 10);
  const guestCount = attendance === 'not_going' ? 0 : clamp(Number.isFinite(rawCount) ? rawCount : 1, 1, 10);
  const guestName = String(formData.get('guest_name') || '').trim();

  return {
    guest_name: guestName,
    display_name: guestName.split(/\s+/).slice(0, 2).join(' '),
    attendance,
    guest_count: guestCount,
    favorite_team: String(formData.get('favorite_team') || '').trim(),
    contact: String(formData.get('contact') || '').trim(),
    message: String(formData.get('message') || '').trim(),
    is_public: formData.get('is_public') === 'on'
  };
}

function updatePlayerCard(rsvp) {
  const name = rsvp.display_name || rsvp.guest_name || 'Future Legend';
  const team = rsvp.favorite_team || 'Yuvaan FC';
  const rating = rsvp.attendance === 'going' ? 99 : rsvp.attendance === 'maybe' ? 88 : 77;

  setText('#card-name', name);
  setText('#card-team', team);
  setText('#card-rating', rating);

  const card = $('#player-card');
  if (card) {
    card.classList.remove('card-pop');
    window.setTimeout(() => card.classList.add('card-pop'), 20);
  }
}

function setupRsvpForm() {
  const form = $('#rsvp-form');
  const status = $('#rsvp-status');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const rsvp = readRsvpForm(form);

    if (!rsvp.guest_name) {
      if (status) status.textContent = 'Please enter the player name.';
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    if (status) status.textContent = 'Submitting your match ticket...';

    try {
      if (supabase) {
        const { error } = await supabase.from('rsvps').insert(rsvp);
        if (error) throw error;
      } else {
        saveLocalRsvp(rsvp);
      }

      updatePlayerCard(rsvp);
      await loadRsvpSummary();
      burstConfetti(140);
      showGoalBanner(rsvp.attendance === 'going' ? 'GOOOAAAL!' : 'Ticket saved!');
      if (status) status.textContent = 'You are on the match sheet. Thank you!';
      form.reset();
      syncSelectedTeam(rsvp.favorite_team || boothState.team || 'Brazil FC');
    } catch (error) {
      console.error(error);
      if (status) status.textContent = 'Could not save RSVP. Please try again or message Neelam.';
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

function setupTeamPicker() {
  const select = $('select[name="favorite_team"]');
  const selectedTeam = $('.booth-team-button.is-selected')?.dataset.team || select?.value || 'Brazil FC';

  $$('.booth-team-button').forEach((button) => {
    button.addEventListener('click', () => {
      syncSelectedTeam(button.dataset.team || 'Brazil FC');
      setBoothStatus(`${button.dataset.team || 'Team'} selected. Now pick a superstar and capture your face.`);
    });
  });

  if (select) select.addEventListener('change', () => syncSelectedTeam(select.value));
  syncSelectedTeam(selectedTeam);
}

function syncSelectedTeam(team) {
  const normalizedTeam = TEAM_PRESETS[team] ? team : 'Yuvaan FC';
  boothState.team = normalizedTeam;

  const select = $('select[name="favorite_team"]');
  if (select && [...select.options].some((option) => option.value === normalizedTeam)) select.value = normalizedTeam;

  $$('.booth-team-button').forEach((button) => {
    const selected = button.dataset.team === normalizedTeam;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });

  updateBoothSelectionSummary();
  renderPlayerCardCanvas();
}

function setupPhotoBooth() {
  $$('.player-choice-button').forEach((button) => {
    button.addEventListener('click', () => {
      boothState.player = button.dataset.player || 'Lionel Messi';
      $$('.player-choice-button').forEach((choice) => {
        const selected = choice === button;
        choice.classList.toggle('is-selected', selected);
        choice.setAttribute('aria-pressed', String(selected));
      });
      updateBoothSelectionSummary();
      setBoothStatus(`${boothState.player} style selected. Take a selfie or choose a photo to generate your card.`);
      renderPlayerCardCanvas();
    });
  });

  // Mobile first photo flow: use the phone's native camera/photo picker instead of getUserMedia.
  // This avoids NotAllowedError in embedded browsers and locked down mobile settings.
  $('#take-selfie-upload')?.addEventListener('click', (event) => { event.currentTarget.value = ''; });
  $('#take-selfie-upload')?.addEventListener('change', handleFaceUpload);
  $('#choose-photo-upload')?.addEventListener('click', (event) => { event.currentTarget.value = ''; });
  $('#choose-photo-upload')?.addEventListener('change', handleFaceUpload);

  // Legacy camera buttons may exist in older cached markup, so keep these listeners harmless.
  $('#start-camera')?.addEventListener('click', startBoothCamera);
  $('#capture-face')?.addEventListener('click', captureBoothFace);
  $('#face-upload')?.addEventListener('click', (event) => { event.currentTarget.value = ''; });
  $('#face-upload')?.addEventListener('change', handleFaceUpload);
  $('#download-card')?.addEventListener('click', downloadGeneratedCard);
  $('#post-card')?.addEventListener('click', postGeneratedCardToHighlights);

  updateBoothSelectionSummary();
  renderPlayerCardCanvas();
  document.fonts?.ready?.then(() => renderPlayerCardCanvas());
}

function updateBoothSelectionSummary() {
  setText('#booth-selection-summary', `${boothState.team} · ${boothState.player}`);
}

function setBoothStatus(message) {
  const status = $('#booth-status');
  if (status) status.textContent = message;
}

function getTeamPreset(team) {
  return TEAM_PRESETS[team] || TEAM_PRESETS['Yuvaan FC'];
}

function getPlayerPreset(player) {
  return PLAYER_PRESETS[player] || PLAYER_PRESETS['Lionel Messi'];
}


async function startBoothCamera() {
  const video = $('#booth-video');
  const placeholder = $('#camera-placeholder');

  if (!video) {
    setBoothStatus('Camera preview is not ready. Try again or upload a selfie.');
    return;
  }

  if (!window.isSecureContext) {
    setBoothStatus('Camera needs HTTPS. You are safe on yuvi.ca, or upload a selfie.');
    return;
  }

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    setBoothStatus('Camera is not supported in this browser. Upload a selfie instead.');
    return;
  }

  try {
    stopBoothCamera();
    setBoothStatus('Opening camera. Please allow camera access.');

    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    const constraints = [
      { audio: false, video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } } },
      { audio: false, video: { facingMode: 'user' } },
      { audio: false, video: true }
    ];

    let stream = null;
    let lastError = null;

    for (const constraint of constraints) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraint);
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!stream) throw lastError || new Error('Camera unavailable');

    boothState.stream = stream;
    video.srcObject = stream;
    video.classList.add('is-live');
    placeholder?.classList.add('is-hidden');

    await waitForVideoReady(video);
    await video.play();

    $('#capture-face')?.removeAttribute('disabled');
    setBoothStatus('Camera ready. Center your face in the oval and tap Capture face.');
  } catch (error) {
    console.error('Camera failed:', error);
    const name = error?.name || 'CameraError';
    const message = error?.message ? ` ${error.message}` : '';
    setBoothStatus(`${name}:${message} Upload a selfie instead.`);
    $('#camera-placeholder')?.classList.remove('is-hidden');
  }
}

function stopBoothCamera() {
  if (boothState.stream) {
    boothState.stream.getTracks().forEach((track) => track.stop());
    boothState.stream = null;
  }
}

function waitForVideoReady(video) {
  return new Promise((resolve) => {
    if (video.videoWidth && video.videoHeight) {
      resolve();
      return;
    }

    const done = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', done);
      video.removeEventListener('canplay', done);
    };

    video.addEventListener('loadedmetadata', done, { once: true });
    video.addEventListener('canplay', done, { once: true });
    window.setTimeout(done, 1200);
  });
}

function captureBoothFace() {
  const video = $('#booth-video');
  const canvas = $('#booth-capture-canvas');
  if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
    setBoothStatus('Use Take selfie or Choose photo. The image will appear on the generated card.');
    return;
  }

  const context = canvas.getContext('2d');
  canvas.width = 900;
  canvas.height = 1080;

  const targetRatio = canvas.width / canvas.height;
  const videoRatio = video.videoWidth / video.videoHeight;
  let sx = 0;
  let sy = 0;
  let sourceWidth = video.videoWidth;
  let sourceHeight = video.videoHeight;

  if (videoRatio > targetRatio) {
    sourceWidth = video.videoHeight * targetRatio;
    sx = (video.videoWidth - sourceWidth) / 2;
  } else {
    sourceHeight = video.videoWidth / targetRatio;
    sy = (video.videoHeight - sourceHeight) / 2;
  }

  context.save();
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, sx, sy, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
  context.restore();

  boothState.faceDataUrl = canvas.toDataURL('image/jpeg', 0.92);
  setBoothStatus('Face captured. Your player card is ready.');
  burstConfetti(70);
  renderPlayerCardCanvas();
}

async function handleFaceUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    setBoothStatus('Please choose an image file.');
    event.target.value = '';
    return;
  }

  try {
    setBoothStatus('Loading photo directly into your player card...');
    stopBoothCamera();
    $('#booth-video')?.classList.remove('is-live');
    $('#camera-placeholder')?.classList.add('is-hidden');

    boothState.faceDataUrl = await normalizeSelfieFile(file);
    setBoothStatus('Photo added to the generated card. Download it or post it to Media Highlights.');
    burstConfetti(50);
    await renderPlayerCardCanvas();
  } catch (error) {
    console.error('Selfie upload failed:', error);
    setBoothStatus('Could not load that photo. Try a different one.');
    $('#camera-placeholder')?.classList.remove('is-hidden');
  } finally {
    event.target.value = '';
  }
}

async function normalizeSelfieFile(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1080;
    const context = canvas.getContext('2d');

    const targetRatio = canvas.width / canvas.height;
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    let sx = 0;
    let sy = 0;
    let sw = image.naturalWidth;
    let sh = image.naturalHeight;

    if (sourceRatio > targetRatio) {
      sw = image.naturalHeight * targetRatio;
      sx = (image.naturalWidth - sw) / 2;
    } else {
      sh = image.naturalWidth / targetRatio;
      sy = (image.naturalHeight - sh) / 2;
    }

    context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.92);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function drawRoundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function drawFitText(context, text, x, y, maxWidth, startingSize, family = 'Anton, Impact, sans-serif', align = 'center') {
  let size = startingSize;
  context.textAlign = align;
  context.textBaseline = 'middle';
  do {
    context.font = `900 ${size}px ${family}`;
    if (context.measureText(text).width <= maxWidth) break;
    size -= 4;
  } while (size > 26);
  context.fillText(text, x, y);
}

function drawJersey(context, cx, y, team) {
  context.save();
  context.fillStyle = team.primary;
  context.strokeStyle = team.accent;
  context.lineWidth = 10;
  context.beginPath();
  context.moveTo(cx - 170, y + 22);
  context.lineTo(cx - 82, y - 38);
  context.lineTo(cx - 46, y + 28);
  context.lineTo(cx + 46, y + 28);
  context.lineTo(cx + 82, y - 38);
  context.lineTo(cx + 170, y + 22);
  context.lineTo(cx + 126, y + 170);
  context.lineTo(cx - 126, y + 170);
  context.closePath();
  context.fill();
  context.stroke();

  context.globalAlpha = 0.35;
  context.fillStyle = team.secondary;
  for (let i = -90; i <= 90; i += 45) context.fillRect(cx + i, y + 18, 20, 148);
  context.globalAlpha = 1;

  context.fillStyle = '#06102b';
  context.font = '900 78px Anton, Impact, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(getPlayerPreset(boothState.player).number, cx, y + 92);
  context.restore();
}

function drawQrPattern(context, x, y, size) {
  context.save();
  context.fillStyle = '#fff';
  drawRoundedRect(context, x, y, size, size, 12);
  context.fill();
  context.fillStyle = '#09112f';
  const cells = 9;
  const gap = size / cells;
  const pattern = [
    [1,1,1,0,1,0,1,1,1],
    [1,0,1,0,0,1,1,0,1],
    [1,1,1,1,0,0,1,1,1],
    [0,0,1,0,1,1,0,0,1],
    [1,0,0,1,1,0,1,0,0],
    [0,1,1,0,0,1,0,1,1],
    [1,1,1,0,1,0,1,0,1],
    [1,0,1,1,0,1,0,1,0],
    [1,1,1,0,1,1,1,0,1]
  ];
  pattern.forEach((row, rowIndex) => row.forEach((cell, colIndex) => {
    if (cell) context.fillRect(x + colIndex * gap + 5, y + rowIndex * gap + 5, gap - 8, gap - 8);
  }));
  context.restore();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}



function drawPortraitFrame(context, cx, cy, radius, team) {
  context.save();
  context.shadowBlur = 34;
  context.shadowColor = team.primary;
  context.fillStyle = 'rgba(255, 255, 255, 0.08)';
  context.strokeStyle = team.primary;
  context.lineWidth = 12;
  context.beginPath();
  context.ellipse(cx, cy, radius * 1.02, radius * 1.18, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.strokeStyle = 'rgba(255,255,255,.7)';
  context.lineWidth = 4;
  context.beginPath();
  context.ellipse(cx, cy, radius * 0.9, radius * 1.04, 0, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawCleanSilhouette(context, cx, cy, radius, team) {
  context.save();
  const grad = context.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  grad.addColorStop(0, team.primary);
  grad.addColorStop(1, team.secondary || team.accent);
  context.fillStyle = grad;
  context.globalAlpha = 0.9;
  context.beginPath();
  context.arc(cx, cy - radius * 0.2, radius * 0.42, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(cx, cy + radius * 0.62, radius * 0.72, radius * 0.48, 0, Math.PI, 0, true);
  context.closePath();
  context.fill();
  context.globalAlpha = 1;
  context.fillStyle = 'rgba(255,255,255,.82)';
  context.font = '900 38px Bebas Neue, Impact, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('ADD SELFIE', cx, cy + radius * 0.88);
  context.restore();
}

function drawPlayerStyleBadge(context, x, y, player, team) {
  context.save();
  context.shadowBlur = 18;
  context.shadowColor = team.primary;
  context.fillStyle = 'rgba(3, 8, 30, .78)';
  context.strokeStyle = team.primary;
  context.lineWidth = 4;
  drawRoundedRect(context, x, y, 250, 96, 24);
  context.fill();
  context.stroke();
  context.fillStyle = '#ffffff';
  context.font = '900 27px Bebas Neue, Impact, sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText('STYLE', x + 22, y + 32);
  context.fillStyle = team.primary;
  context.font = '900 34px Bebas Neue, Impact, sans-serif';
  const shortName = (player.name || boothState.player).replace('Lionel ', '').replace('Cristiano ', '').replace('Kylian ', '').replace(' Jr.', '');
  context.fillText(shortName.toUpperCase(), x + 22, y + 68);
  context.restore();
}

async function drawFace(context, faceDataUrl, cx, cy, radius) {
  const team = getTeamPreset(boothState.team);
  drawPortraitFrame(context, cx, cy, radius, team);

  context.save();
  context.beginPath();
  context.ellipse(cx, cy, radius * 0.88, radius * 1.02, 0, 0, Math.PI * 2);
  context.clip();

  const innerGrad = context.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  innerGrad.addColorStop(0, 'rgba(255,255,255,.16)');
  innerGrad.addColorStop(0.5, 'rgba(46,230,255,.12)');
  innerGrad.addColorStop(1, 'rgba(255,216,74,.16)');
  context.fillStyle = innerGrad;
  context.fillRect(cx - radius, cy - radius * 1.16, radius * 2, radius * 2.32);

  if (faceDataUrl) {
    try {
      const image = await loadImage(faceDataUrl);
      const targetW = radius * 1.76;
      const targetH = radius * 2.04;
      const sourceRatio = image.width / image.height;
      const targetRatio = targetW / targetH;
      let sw = image.width;
      let sh = image.height;
      let sx = 0;
      let sy = 0;
      if (sourceRatio > targetRatio) {
        sw = image.height * targetRatio;
        sx = (image.width - sw) / 2;
      } else {
        sh = image.width / targetRatio;
        sy = (image.height - sh) / 2;
      }
      context.drawImage(image, sx, sy, sw, sh, cx - targetW / 2, cy - targetH / 2, targetW, targetH);
      context.globalCompositeOperation = 'screen';
      const shine = context.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
      shine.addColorStop(0, 'rgba(255,255,255,.18)');
      shine.addColorStop(0.48, 'rgba(255,255,255,.02)');
      shine.addColorStop(1, 'rgba(255,216,74,.12)');
      context.fillStyle = shine;
      context.fillRect(cx - radius, cy - radius * 1.16, radius * 2, radius * 2.32);
      context.globalCompositeOperation = 'source-over';
    } catch {
      drawCleanSilhouette(context, cx, cy, radius, team);
    }
  } else {
    drawCleanSilhouette(context, cx, cy, radius, team);
  }
  context.restore();

  context.save();
  context.strokeStyle = 'rgba(255,255,255,.55)';
  context.lineWidth = 4;
  context.beginPath();
  context.ellipse(cx, cy, radius * 0.88, radius * 1.02, 0, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}


async function downloadGeneratedCard() {
  const canvas = $('#generated-player-card');
  if (!canvas) return;
  await renderPlayerCardCanvas();
  const link = document.createElement('a');
  const safeTeam = boothState.team.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const safePlayer = boothState.player.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  link.download = `yuvaan-${safeTeam}-${safePlayer}-player-card.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  setBoothStatus('Player card downloaded. Share it with the squad!');
  burstConfetti(80);
}


function canvasToBlob(canvas, type = 'image/png', quality = 0.95) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function setCardPostStatus(message) {
  const status = $('#card-post-status');
  if (status) status.textContent = message;
  else setBoothStatus(message);
}

async function postGeneratedCardToHighlights() {
  const canvas = $('#generated-player-card');
  if (!canvas) return;

  const button = $('#post-card');
  if (button) button.disabled = true;
  setCardPostStatus('Posting your player card to Media Highlights...');

  try {
    await renderPlayerCardCanvas();
    const caption = `${boothState.player} style card · ${boothState.team}`;

    if (!supabase) {
      const dataUrl = canvas.toDataURL('image/png');
      addPhotoCard(dataUrl, caption);
      updateGalleryPreview([{ public_url: dataUrl, caption }], true);
      $('#photo-section')?.classList.add('is-open');
      setCardPostStatus('Preview mode. Card added locally to Media Highlights. Connect Supabase for live posting.');
      burstConfetti(70);
      return;
    }

    const blob = await canvasToBlob(canvas, 'image/png', 0.95);
    if (!blob) throw new Error('Could not render the card image.');

    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `party/generated-cards/${Date.now()}-${id}.png`;
    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, blob, { contentType: 'image/png', cacheControl: '3600' });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    const publicUrl = data.publicUrl;
    const metadata = {
      uploader_name: 'Photo Booth',
      caption,
      file_path: path,
      public_url: publicUrl
    };
    const { error: insertError } = await supabase.from('party_photos').insert(metadata);
    if (insertError) throw insertError;

    addPhotoCard(publicUrl, caption);
    updateGalleryPreview([metadata], true);
    $('#photo-section')?.classList.add('is-open');
    setCardPostStatus('Posted to Media Highlights. Share your card with the squad!');
    burstConfetti(100);
  } catch (error) {
    console.error(error);
    setCardPostStatus('Could not post the card. Check Supabase storage policies and try again.');
  } finally {
    if (button) button.disabled = false;
  }
}

function setupRsvpModal() {
  const modal = $('#rsvp-modal');
  if (!modal) return;

  $$('.open-rsvp').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openRsvpModal(true);
    });
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.close();
  });
}

function openRsvpModal(focusName = true) {
  const modal = $('#rsvp-modal');
  if (!modal) return;

  if (typeof modal.showModal === 'function' && !modal.open) modal.showModal();
  else modal.setAttribute('open', '');

  if (focusName) window.setTimeout(() => modal.querySelector('input[name="guest_name"]')?.focus(), 120);
}

function setupStadiumIntro() {
  const intro = $('#stadium-intro');
  const button = $('#enter-stadium');
  if (!intro || !button) return;

  if (localStorage.getItem(INTRO_KEY) === 'yes' && !queryParams.has('intro')) {
    intro.classList.add('is-hidden');
    return;
  }

  const close = () => {
    localStorage.setItem(INTRO_KEY, 'yes');
    intro.classList.add('is-hidden');
    burstConfetti(90);
  };

  button.addEventListener('click', close);
}

function showGoalBanner(text = 'GOOOAAAL!') {
  const banner = $('#goal-banner');
  if (!banner) return;
  banner.textContent = text;
  banner.classList.add('is-visible');
  window.setTimeout(() => banner.classList.remove('is-visible'), 1500);
}

function setupPenaltyGame() {
  let shots = [];
  let selectedShot = 'middle';
  const status = $('#game-status');
  const shootButton = $('#shoot-button');
  const targets = $$('.shot-targets button');

  function renderShots() {
    const icons = $$('#shot-icons span');
    icons.forEach((icon, index) => {
      icon.classList.remove('good', 'miss');
      icon.textContent = '⚽';
      if (shots[index] === true) {
        icon.classList.add('good');
        icon.textContent = '✓';
      }
      if (shots[index] === false) {
        icon.classList.add('miss');
        icon.textContent = '×';
      }
    });
  }

  targets.forEach((target) => {
    target.addEventListener('click', () => {
      selectedShot = target.dataset.shot || 'middle';
      targets.forEach((button) => button.classList.toggle('is-targeted', button === target));
      if (status) status.textContent = `Target selected: ${selectedShot}. Hit play now!`;
    });
  });

  shootButton?.addEventListener('click', () => {
    if (shots.length >= 3) shots = [];
    const goalie = ['left', 'middle', 'right'][Math.floor(Math.random() * 3)];
    const ball = $('#penalty-ball');
    const keeper = $('#keeper');
    if (ball) {
      ball.classList.remove('shoot-left', 'shoot-middle', 'shoot-right');
      void ball.offsetWidth;
      ball.classList.add(`shoot-${selectedShot}`);
    }
    if (keeper) {
      keeper.classList.remove('dive-left', 'dive-middle', 'dive-right');
      void keeper.offsetWidth;
      keeper.classList.add(`dive-${goalie}`);
    }
    const scored = goalie !== selectedShot || Math.random() > 0.7;
    shots.push(scored);
    renderShots();

    if (scored) {
      if (status) status.textContent = `Goal! Keeper went ${goalie}.`;
      showGoalBanner('GOAL!');
      burstConfetti(80);
    } else if (status) {
      status.textContent = `Saved! Keeper guessed ${goalie}. Try again.`;
    }

    if (shots.length === 3) {
      const goals = shots.filter(Boolean).length;
      window.setTimeout(() => {
        if (status) status.textContent = `${goals}/3 goals. ${goals ? 'Create your player card now!' : 'One more round?'}`;
      }, 850);
    }
  });
}

function setupPhotoSection() {
  const section = $('#photo-section');
  const openButton = $('#open-photo-section');
  const form = $('#photo-form');
  const status = $('#photo-status');
  const lockCopy = $('#photo-lock-copy');

  openButton?.addEventListener('click', () => {
    section?.classList.add('is-open');
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  loadExistingPhotos();

  if (queryParams.has('photos')) {
    section?.classList.add('is-open');
  }

  if (!form) return;

  if (lockCopy) {
    lockCopy.textContent = 'Photo uploads are open now. Add your best match highlight or post a generated player card.';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const file = formData.get('photo');
    if (!(file instanceof File) || !file.size) {
      if (status) status.textContent = 'Please select a photo first.';
      return;
    }

    if (!supabase) {
      const previewUrl = URL.createObjectURL(file);
      addPhotoCard(previewUrl, formData.get('caption') || 'Media highlight');
      updateGalleryPreview([{ public_url: previewUrl, caption: formData.get('caption') || 'Media highlight' }], true);
      if (status) status.textContent = 'Preview photo added locally. Connect Supabase for live uploads.';
      form.reset();
      return;
    }

    try {
      if (status) status.textContent = 'Uploading match highlight...';
      const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, '_');
      const path = `party/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { cacheControl: '3600' });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
      const publicUrl = data.publicUrl;
      const metadata = {
        uploader_name: String(formData.get('uploader_name') || '').trim(),
        caption: String(formData.get('caption') || '').trim(),
        file_path: path,
        public_url: publicUrl
      };
      const { error: insertError } = await supabase.from('party_photos').insert(metadata);
      if (insertError) throw insertError;

      addPhotoCard(publicUrl, metadata.caption || 'Media highlight');
      updateGalleryPreview([metadata], true);
      if (status) status.textContent = 'Highlight uploaded!';
      form.reset();
      burstConfetti(60);
    } catch (error) {
      console.error(error);
      if (status) status.textContent = 'Upload failed. Please try again after checking Supabase storage.';
    }
  });
}

async function loadExistingPhotos() {
  const grid = $('#photo-grid');
  const status = $('#photo-status');
  const openButton = $('#open-photo-section');

  if (!grid || !supabase) return;

  try {
    const { data, error } = await supabase
      .from('party_photos')
      .select('caption, public_url, file_path, created_at')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    const photos = (data || []).map((photo) => {
      if (photo.public_url) return photo;
      if (!photo.file_path) return photo;
      const { data: publicData } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(photo.file_path);
      return { ...photo, public_url: publicData.publicUrl };
    }).filter((photo) => photo.public_url);

    grid.innerHTML = '';
    photos.forEach((photo) => addPhotoCard(photo.public_url, photo.caption || 'Media highlight', false));
    updateGalleryPreview(photos);

    if (openButton) {
      openButton.textContent = photos.length ? `View ${photos.length} highlights` : 'View gallery';
    }
    if (status && photos.length) {
      status.textContent = `${photos.length} uploaded highlight${photos.length === 1 ? '' : 's'} loaded.`;
    }
  } catch (error) {
    console.error(error);
    if (status) status.textContent = 'Could not load uploaded photos. Please check Supabase policies.';
  }
}

function updateGalleryPreview(photos, prepend = false) {
  const thumbs = $('.gallery-panel .thumbs');
  if (!thumbs || !photos?.length) return;

  const current = Array.from(thumbs.querySelectorAll('img')).map((img) => img.src);
  const newImages = photos
    .map((photo) => photo.public_url)
    .filter((url) => url && !current.includes(url))
    .slice(0, 4)
    .map((url) => `<img src="${escapeHtml(url)}" alt="Uploaded media highlight" />`)
    .join('');

  if (!newImages) return;
  if (prepend) thumbs.insertAdjacentHTML('afterbegin', newImages);
  else thumbs.innerHTML = newImages;
}

function addPhotoCard(url, caption, prepend = true) {
  const grid = $('#photo-grid');
  if (!grid || !url) return;

  const existing = Array.from(grid.querySelectorAll('img')).some((img) => img.src === url);
  if (existing) return;

  const card = document.createElement('article');
  card.className = 'photo-card';
  card.innerHTML = `<img src="${escapeHtml(url)}" alt="Media highlight upload" loading="lazy" /><p>${escapeHtml(caption)}</p>`;
  if (prepend) grid.prepend(card);
  else grid.append(card);
}

function setupConfetti() {
  const canvas = $('#confetti-canvas');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  let pieces = [];
  let running = false;

  function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  }

  function add(count = 100) {
    const colors = ['#ffd84a', '#ff2d8d', '#2ee6ff', '#24df75', '#ffffff', '#ff9f1c'];
    pieces = pieces.concat(Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: -30 - Math.random() * 120,
      size: 5 + Math.random() * 10,
      speed: 2 + Math.random() * 5,
      drift: -2 + Math.random() * 4,
      rotation: Math.random() * Math.PI,
      spin: -0.16 + Math.random() * 0.32,
      color: colors[Math.floor(Math.random() * colors.length)]
    })));
    if (!running) animate();
  }

  function animate() {
    running = true;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    pieces = pieces.filter((piece) => piece.y < window.innerHeight + 30);

    pieces.forEach((piece) => {
      piece.y += piece.speed;
      piece.x += piece.drift;
      piece.rotation += piece.spin;
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.rotation);
      context.fillStyle = piece.color;
      context.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.62);
      context.restore();
    });

    if (pieces.length) requestAnimationFrame(animate);
    else running = false;
  }

  window.addEventListener('resize', resize);
  resize();
  window.burstConfetti = add;
}

function burstConfetti(count = 100) {
  if (typeof window.burstConfetti === 'function') window.burstConfetti(count);
}

async function boot() {
  setupConfetti();
  startCountdown();
  setupStadiumIntro();
  setupRsvpModal();
  setupTeamPicker();
  setupPhotoBooth();
  setupPenaltyGame();
  setupRsvpForm();
  setupPhotoSection();

  try {
    await loadRsvpSummary();
  } catch (error) {
    console.error(error);
    renderSummary(buildLocalSummary());
    const status = $('#rsvp-status');
    if (status) status.textContent = 'Could not load live RSVP count. Local preview is showing.';
  }
}

boot();



/* v13 clean trading card renderer
   This intentionally removes the browser face-merge/body-swap approach. The selfie is now rendered
   as the hero portrait inside a premium football card frame. The selected country controls the full
   card theme, jersey icon, shorts, socks, flag, accents, and stats. This is much cleaner, faster,
   and more reliable on phones than trying to paste a face onto a baked JPEG body. */
const PLAYER_CARD_STYLE = {
  'Lionel Messi': { jerseyName: 'MESSI', number: '10', label: 'MESSI MODE', role: 'PLAYMAKER', emoji: '🐐', rating: 99, stats: [['PAC', 94], ['SHO', 96], ['PAS', 99], ['DRB', 99]] },
  'Cristiano Ronaldo': { jerseyName: 'RONALDO', number: '7', label: 'RONALDO MODE', role: 'CAPTAIN', emoji: '🚀', rating: 99, stats: [['PAC', 95], ['SHO', 99], ['JMP', 99], ['PHY', 96]] },
  'Kylian Mbappé': { jerseyName: 'MBAPPÉ', number: '10', label: 'MBAPPÉ MODE', role: 'SPEEDSTER', emoji: '⚡', rating: 98, stats: [['PAC', 99], ['SHO', 96], ['DRB', 97], ['AGI', 98]] },
  'Neymar Jr.': { jerseyName: 'NEYMAR', number: '11', label: 'NEYMAR MODE', role: 'SKILL MASTER', emoji: '✨', rating: 97, stats: [['PAC', 94], ['SHO', 93], ['PAS', 95], ['DRB', 99]] }
};

const CARD_KITS = {
  'Brazil FC': { flag: '🇧🇷', code: 'BRA', base: '#ffd84a', secondary: '#1fce62', accent: '#1a53ff', text: '#071a57', trim: '#ffffff', pattern: 'diagonal' },
  'Argentina FC': { flag: '🇦🇷', code: 'ARG', base: '#ffffff', secondary: '#86ddff', accent: '#1f6cff', text: '#102b68', trim: '#ffffff', pattern: 'stripes' },
  'France FC': { flag: '🇫🇷', code: 'FRA', base: '#143f9f', secondary: '#0b1f5d', accent: '#ff3958', text: '#ffffff', trim: '#ffffff', pattern: 'sash' },
  'Portugal FC': { flag: '🇵🇹', code: 'POR', base: '#d71935', secondary: '#0f8f55', accent: '#ffd84a', text: '#ffffff', trim: '#0f8f55', pattern: 'split' },
  'Canada FC': { flag: '🇨🇦', code: 'CAN', base: '#ffffff', secondary: '#e4002b', accent: '#e4002b', text: '#e4002b', trim: '#ffffff', pattern: 'canada' },
  'England FC': { flag: '🏴', code: 'ENG', base: '#ffffff', secondary: '#f2f5ff', accent: '#dc1f38', text: '#12265b', trim: '#dc1f38', pattern: 'cross' },
  'Germany FC': { flag: '🇩🇪', code: 'GER', base: '#ffffff', secondary: '#111111', accent: '#ffd84a', text: '#111111', trim: '#e53935', pattern: 'tricolor' },
  'Mexico FC': { flag: '🇲🇽', code: 'MEX', base: '#0f8f55', secondary: '#ffffff', accent: '#d82935', text: '#ffffff', trim: '#ffffff', pattern: 'split' },
  'Yuvaan FC': { flag: '⚽', code: 'YUV', base: '#143cff', secondary: '#071a57', accent: '#ffd84a', text: '#ffffff', trim: '#2ee6ff', pattern: 'diagonal' }
};

function getCardKit(teamName) {
  return CARD_KITS[teamName] || CARD_KITS['Yuvaan FC'];
}

function rgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawCardText(context, text, x, y, maxWidth, size, color = '#ffffff', align = 'center', family = 'Anton, Impact, sans-serif') {
  context.save();
  context.fillStyle = color;
  drawFitText(context, text, x, y, maxWidth, size, family, align);
  context.restore();
}

function drawCardBackground(context, width, height, kit) {
  const bg = context.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#030616');
  bg.addColorStop(0.28, '#071a57');
  bg.addColorStop(0.72, '#11052c');
  bg.addColorStop(1, '#030616');
  context.fillStyle = bg;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.82;
  const glow = context.createRadialGradient(width * 0.5, height * 0.32, 20, width * 0.5, height * 0.32, 620);
  glow.addColorStop(0, rgba(kit.accent, 0.78));
  glow.addColorStop(0.38, rgba(kit.base, 0.2));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
  context.restore();

  context.save();
  for (let i = 0; i < 72; i += 1) {
    const x = (i * 157) % width;
    const y = (i * 97) % height;
    context.fillStyle = i % 3 === 0 ? rgba(kit.accent, 0.48) : i % 3 === 1 ? 'rgba(255,216,74,.34)' : 'rgba(255,255,255,.28)';
    context.beginPath();
    context.arc(x, y, 2 + (i % 4), 0, Math.PI * 2);
    context.fill();
  }
  context.restore();

  context.save();
  context.strokeStyle = rgba(kit.accent, 0.9);
  context.lineWidth = 12;
  context.shadowColor = kit.accent;
  context.shadowBlur = 26;
  drawRoundedRect(context, 34, 34, width - 68, height - 68, 58);
  context.stroke();
  context.strokeStyle = 'rgba(255,216,74,.75)';
  context.lineWidth = 5;
  drawRoundedRect(context, 58, 58, width - 116, height - 116, 42);
  context.stroke();
  context.restore();
}

function drawPortrait(context, faceDataUrl, x, y, width, height, kit) {
  context.save();
  context.shadowColor = rgba(kit.accent, 0.9);
  context.shadowBlur = 32;
  const frameGrad = context.createLinearGradient(x, y, x + width, y + height);
  frameGrad.addColorStop(0, '#ffd84a');
  frameGrad.addColorStop(0.48, kit.accent);
  frameGrad.addColorStop(1, '#ffffff');
  context.fillStyle = frameGrad;
  drawRoundedRect(context, x - 14, y - 14, width + 28, height + 28, 44);
  context.fill();
  context.restore();

  context.save();
  drawRoundedRect(context, x, y, width, height, 34);
  context.clip();

  const portraitBg = context.createLinearGradient(x, y, x + width, y + height);
  portraitBg.addColorStop(0, rgba(kit.base, 0.62));
  portraitBg.addColorStop(0.45, '#06102b');
  portraitBg.addColorStop(1, rgba(kit.accent, 0.5));
  context.fillStyle = portraitBg;
  context.fillRect(x, y, width, height);

  context.fillStyle = 'rgba(255,255,255,.08)';
  for (let i = -height; i < width; i += 90) {
    context.save();
    context.translate(x + i, y);
    context.rotate(-0.45);
    context.fillRect(0, 0, 34, height * 2);
    context.restore();
  }

  if (faceDataUrl) {
    return loadImage(faceDataUrl).then((image) => {
      const sourceRatio = image.width / image.height;
      const targetRatio = width / height;
      let sx = 0;
      let sy = 0;
      let sw = image.width;
      let sh = image.height;
      if (sourceRatio > targetRatio) {
        sw = image.height * targetRatio;
        sx = (image.width - sw) / 2;
      } else {
        sh = image.width / targetRatio;
        sy = Math.max(0, (image.height - sh) * 0.28);
      }
      context.filter = 'saturate(1.08) contrast(1.04) brightness(1.03)';
      context.drawImage(image, sx, sy, sw, sh, x, y, width, height);
      context.filter = 'none';

      const shade = context.createLinearGradient(x, y, x, y + height);
      shade.addColorStop(0, 'rgba(0,0,0,.08)');
      shade.addColorStop(0.72, 'rgba(0,0,0,0)');
      shade.addColorStop(1, 'rgba(0,0,0,.42)');
      context.fillStyle = shade;
      context.fillRect(x, y, width, height);
      context.restore();
    }).catch(() => {
      context.restore();
      drawPortraitPlaceholder(context, x, y, width, height, kit);
    });
  }

  context.restore();
  drawPortraitPlaceholder(context, x, y, width, height, kit);
  return Promise.resolve();
}

function drawPortraitPlaceholder(context, x, y, width, height, kit) {
  context.save();
  drawRoundedRect(context, x, y, width, height, 34);
  context.clip();
  context.fillStyle = 'rgba(255,255,255,.1)';
  context.fillRect(x, y, width, height);
  context.fillStyle = rgba(kit.accent, 0.35);
  context.beginPath();
  context.arc(x + width / 2, y + height * 0.38, width * 0.18, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(x + width / 2, y + height * 0.78, width * 0.32, height * 0.16, 0, Math.PI, 0, true);
  context.fill();
  context.restore();

  drawCardText(context, 'TAKE OR CHOOSE SELFIE', x + width / 2, y + height * 0.5, width - 90, 46, '#ffffff');
}

function drawCountryJerseyIcon(context, x, y, scale, kit, style) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);

  // Jersey
  context.fillStyle = kit.base;
  context.strokeStyle = kit.accent;
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(84, 54);
  context.lineTo(148, 20);
  context.lineTo(190, 72);
  context.lineTo(250, 72);
  context.lineTo(292, 20);
  context.lineTo(356, 54);
  context.lineTo(326, 184);
  context.lineTo(284, 168);
  context.lineTo(274, 330);
  context.lineTo(166, 330);
  context.lineTo(156, 168);
  context.lineTo(114, 184);
  context.closePath();
  context.fill();
  context.stroke();

  context.save();
  context.beginPath();
  context.moveTo(84, 54);
  context.lineTo(148, 20);
  context.lineTo(190, 72);
  context.lineTo(250, 72);
  context.lineTo(292, 20);
  context.lineTo(356, 54);
  context.lineTo(326, 184);
  context.lineTo(284, 168);
  context.lineTo(274, 330);
  context.lineTo(166, 330);
  context.lineTo(156, 168);
  context.lineTo(114, 184);
  context.closePath();
  context.clip();

  if (kit.pattern === 'stripes') {
    context.fillStyle = kit.secondary;
    [116, 190, 264].forEach((stripeX) => context.fillRect(stripeX, 34, 42, 296));
  } else if (kit.pattern === 'canada') {
    context.fillStyle = kit.secondary;
    context.fillRect(84, 20, 64, 310);
    context.fillRect(292, 20, 64, 310);
  } else if (kit.pattern === 'split') {
    context.fillStyle = kit.secondary;
    context.fillRect(220, 20, 140, 310);
  } else if (kit.pattern === 'sash') {
    context.fillStyle = kit.accent;
    context.rotate(-0.42);
    context.fillRect(40, 160, 380, 44);
  } else if (kit.pattern === 'cross') {
    context.fillStyle = kit.accent;
    context.fillRect(202, 20, 36, 310);
    context.fillRect(84, 150, 272, 36);
  } else if (kit.pattern === 'tricolor') {
    context.fillStyle = '#111111';
    context.fillRect(84, 20, 272, 44);
    context.fillStyle = '#dd0000';
    context.fillRect(84, 64, 272, 44);
    context.fillStyle = '#ffce00';
    context.fillRect(84, 108, 272, 44);
  } else {
    context.fillStyle = rgba(kit.secondary, 0.75);
    context.rotate(-0.36);
    context.fillRect(-20, 110, 460, 52);
  }
  context.restore();

  // Shorts and socks
  context.fillStyle = kit.secondary;
  context.strokeStyle = kit.accent;
  context.lineWidth = 6;
  drawRoundedRect(context, 148, 344, 70, 88, 16);
  context.fill();
  context.stroke();
  drawRoundedRect(context, 226, 344, 70, 88, 16);
  context.fill();
  context.stroke();
  context.fillStyle = kit.base;
  drawRoundedRect(context, 156, 436, 48, 78, 16);
  context.fill();
  drawRoundedRect(context, 240, 436, 48, 78, 16);
  context.fill();
  context.fillStyle = kit.accent;
  context.fillRect(156, 454, 48, 10);
  context.fillRect(240, 454, 48, 10);

  // Jersey text
  context.fillStyle = kit.text;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = rgba(kit.trim, 0.55);
  context.shadowBlur = 6;
  context.font = '900 46px Anton, Impact, sans-serif';
  context.fillText(style.number, 220, 192);
  context.font = '900 24px Bebas Neue, Impact, sans-serif';
  context.fillText(style.jerseyName, 220, 126);

  context.restore();
}

function drawStats(context, x, y, width, style, kit) {
  context.save();
  style.stats.forEach(([label, value], index) => {
    const rowY = y + index * 58;
    context.fillStyle = 'rgba(255,255,255,.1)';
    drawRoundedRect(context, x, rowY, width, 38, 18);
    context.fill();
    context.fillStyle = '#ffffff';
    context.font = '900 25px Orbitron, monospace';
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText(label, x + 18, rowY + 20);
    context.fillStyle = kit.accent;
    context.fillRect(x + 92, rowY + 12, (width - 160) * (value / 100), 14);
    context.strokeStyle = 'rgba(255,255,255,.28)';
    context.strokeRect(x + 92, rowY + 12, width - 160, 14);
    context.fillStyle = '#ffd84a';
    context.textAlign = 'right';
    context.fillText(String(value), x + width - 18, rowY + 20);
  });
  context.restore();
}

async function renderPlayerCardCanvas() {
  const canvas = $('#generated-player-card');
  if (!canvas) return;

  canvas.width = 1080;
  canvas.height = 1350;

  const context = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const kit = getCardKit(boothState.team);
  const style = PLAYER_CARD_STYLE[boothState.player] || PLAYER_CARD_STYLE['Lionel Messi'];

  context.clearRect(0, 0, width, height);
  drawCardBackground(context, width, height, kit);

  // Header
  drawCardText(context, 'YUVAAN WORLD CUP 2026', 94, 96, 520, 44, '#ffffff', 'left', 'Bebas Neue, Impact, sans-serif');
  drawCardText(context, `${kit.flag} ${boothState.team.toUpperCase()}`, width - 94, 96, 430, 38, kit.accent, 'right', 'Orbitron, monospace');

  // Rating and player mode block
  context.save();
  context.fillStyle = 'rgba(255,216,74,.95)';
  drawRoundedRect(context, 88, 138, 154, 146, 32);
  context.fill();
  context.fillStyle = '#07102d';
  context.font = '900 74px Anton, Impact, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(String(style.rating), 165, 196);
  context.font = '900 30px Bebas Neue, Impact, sans-serif';
  context.fillText(style.role, 165, 250);
  context.restore();

  drawCardText(context, style.label, 284, 176, 710, 70, '#ffffff', 'left');
  drawCardText(context, `${style.emoji} SOCIAL PLAYER CARD`, 288, 242, 700, 34, kit.accent, 'left', 'Orbitron, monospace');

  // Portrait
  await drawPortrait(context, boothState.faceDataUrl, 116, 320, 520, 610, kit);

  // Country kit icon with full uniform colors
  context.save();
  context.shadowColor = rgba(kit.accent, 0.85);
  context.shadowBlur = 24;
  context.fillStyle = 'rgba(255,255,255,.07)';
  drawRoundedRect(context, 688, 320, 300, 430, 38);
  context.fill();
  context.restore();
  drawCountryJerseyIcon(context, 620, 348, 0.86, kit, style);

  // Stats
  drawStats(context, 690, 800, 300, style, kit);

  // Name strip
  context.save();
  const strip = context.createLinearGradient(94, 972, width - 94, 1108);
  strip.addColorStop(0, rgba(kit.accent, 0.86));
  strip.addColorStop(0.5, 'rgba(255,216,74,.92)');
  strip.addColorStop(1, rgba(kit.base, 0.86));
  context.fillStyle = strip;
  drawRoundedRect(context, 94, 970, width - 188, 154, 34);
  context.fill();
  context.fillStyle = '#06102b';
  drawFitText(context, `${style.jerseyName} ${style.number}`, width / 2, 1032, width - 260, 78, 'Anton, Impact, sans-serif');
  context.font = '900 30px Orbitron, monospace';
  context.textAlign = 'center';
  context.fillText(`${kit.code} KIT · ${boothState.team.toUpperCase()} · PARTY ENERGY 99`, width / 2, 1090);
  context.restore();

  // Footer CTA
  context.save();
  context.fillStyle = 'rgba(4, 10, 34, .78)';
  drawRoundedRect(context, 94, 1164, width - 188, 96, 30);
  context.fill();
  context.strokeStyle = rgba(kit.accent, 0.74);
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = '#ffffff';
  context.font = '900 36px Bebas Neue, Impact, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(boothState.faceDataUrl ? 'READY TO DOWNLOAD OR POST TO HIGHLIGHTS' : 'TAKE OR CHOOSE A SELFIE TO FINISH YOUR CARD', width / 2, 1213);
  context.restore();
}

