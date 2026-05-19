import './styles.css';
import { createClient } from '@supabase/supabase-js';

const EVENT_START = new Date('2026-06-06T14:00:00-04:00');
const PHOTO_UNLOCK_TIME = new Date('2026-06-06T18:00:00-04:00');
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
const photoUploadUnlocked = Date.now() >= PHOTO_UNLOCK_TIME.getTime() || queryParams.has('photos');

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const pad = (number) => String(number).padStart(2, '0');
const clamp = (number, min, max) => Math.min(Math.max(number, min), max);

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
      syncSelectedTeam('Brazil FC');
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
  $$('.team-card-button').forEach((button) => {
    button.addEventListener('click', () => {
      syncSelectedTeam(button.dataset.team || 'Brazil FC');
      openRsvpModal(false);
    });
  });
  if (select) select.addEventListener('change', () => syncSelectedTeam(select.value));
  syncSelectedTeam(select?.value || 'Brazil FC');
}

function syncSelectedTeam(team) {
  const select = $('select[name="favorite_team"]');
  if (select && [...select.options].some((option) => option.value === team)) select.value = team;

  $$('.team-card-button').forEach((button) => {
    const selected = button.dataset.team === team;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
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

  if (!photoUploadUnlocked) {
    form.querySelectorAll('input, button').forEach((input) => { input.disabled = true; });
  } else if (lockCopy) {
    lockCopy.textContent = 'Photo upload is open. Add your best match highlight.';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!photoUploadUnlocked) return;

    const formData = new FormData(form);
    const file = formData.get('photo');
    if (!(file instanceof File) || !file.size) {
      if (status) status.textContent = 'Please select a photo first.';
      return;
    }

    if (!supabase) {
      const previewUrl = URL.createObjectURL(file);
      addPhotoCard(previewUrl, formData.get('caption') || 'Party highlight');
      updateGalleryPreview([{ public_url: previewUrl, caption: formData.get('caption') || 'Party highlight' }], true);
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

      addPhotoCard(publicUrl, metadata.caption || 'Party highlight');
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
    photos.forEach((photo) => addPhotoCard(photo.public_url, photo.caption || 'Party highlight', false));
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
    .map((url) => `<img src="${escapeHtml(url)}" alt="Uploaded party highlight" />`)
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
  card.innerHTML = `<img src="${escapeHtml(url)}" alt="Party upload" loading="lazy" /><p>${escapeHtml(caption)}</p>`;
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
