import './styles.css';
import { createClient } from '@supabase/supabase-js';

const EVENT_START = new Date('2026-06-06T14:00:00-04:00');
const PHOTO_UNLOCK_TIME = new Date('2026-06-06T18:00:00-04:00');
const PHOTO_BUCKET = import.meta.env.VITE_SUPABASE_PHOTO_BUCKET || 'yuvi-party-photos';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const DEMO_RSVP_KEY = 'yuvi_rsvps_demo';
const INTRO_KEY = 'yuvi_stadium_intro_seen';

const supabaseConfigured =
  SUPABASE_URL.startsWith('https://') &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_URL.includes('your-project-ref') &&
  !SUPABASE_ANON_KEY.includes('your-public-anon-key');

const supabase = supabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const queryParams = new URLSearchParams(window.location.search);
const photoUploadUnlocked = Date.now() >= PHOTO_UNLOCK_TIME.getTime() || queryParams.has('photos');

const $ = (selector) => document.querySelector(selector);
const setText = (selector, value) => {
  const element = $(selector);
  if (element) element.textContent = value;
};

const clamp = (number, min, max) => Math.min(Math.max(number, min), max);
const pad = (number) => String(number).padStart(2, '0');

function updateCountdown() {
  const diff = EVENT_START.getTime() - Date.now();
  const safeDiff = Math.max(0, diff);
  const secondsTotal = Math.floor(safeDiff / 1000);

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

  return {
    going_count: going.length,
    maybe_count: maybe.length,
    not_going_count: notGoing.length,
    total_people: going.reduce((total, rsvp) => total + Number(rsvp.guest_count || 1), 0),
    public_names: going.filter((rsvp) => rsvp.is_public).map((rsvp) => rsvp.display_name || rsvp.guest_name)
  };
}

function renderSummary(summary) {
  const totalPeople = Number(summary?.total_people ?? summary?.going_count ?? 0);
  const maybeCount = Number(summary?.maybe_count ?? 0);
  const notGoingCount = Number(summary?.not_going_count ?? 0);
  const publicNames = Array.isArray(summary?.public_names) ? summary.public_names : [];

  setText('#going-count', totalPeople);
  setText('#maybe-count', maybeCount);
  setText('#not-going-count', notGoingCount);

  const guestList = $('#guest-list');
  if (!guestList) return;

  guestList.innerHTML = '';
  if (!publicNames.length) {
    const item = document.createElement('li');
    item.textContent = 'No players yet. Be first on the team sheet.';
    guestList.appendChild(item);
    renderLineup([]);
    return;
  }

  publicNames.slice(0, 50).forEach((name) => {
    const item = document.createElement('li');
    item.textContent = name;
    guestList.appendChild(item);
  });

  renderLineup(publicNames);
}

function renderLineup(publicNames = []) {
  const lineup = $('#pitch-lineup');
  if (!lineup) return;

  lineup.innerHTML = '';
  if (!publicNames.length) {
    const empty = document.createElement('span');
    empty.textContent = 'No players yet. Be first on the team sheet.';
    lineup.appendChild(empty);
    return;
  }

  publicNames.slice(0, 11).forEach((name, index) => {
    const player = document.createElement('div');
    player.className = `lineup-player slot-${index + 1}`;
    player.innerHTML = `<span>⚽</span><strong>${name}</strong>`;
    lineup.appendChild(player);
  });
}

function updatePlayerCard(rsvp) {
  const card = $('#player-card');
  if (!card || !rsvp) return;

  const name = rsvp.display_name || rsvp.guest_name || 'Future Legend';
  const team = rsvp.favorite_team || 'Yuvaan FC';
  const rating = rsvp.attendance === 'going' ? 99 : rsvp.attendance === 'maybe' ? 88 : 77;

  setText('#card-name', name);
  setText('#card-team', team);
  setText('#card-rating', rating);
  card.classList.remove('is-flipped');
  window.setTimeout(() => card.classList.add('is-flipped'), 60);
}

function showGoalBanner(text = 'GOOOAAAL!') {
  const banner = $('#goal-banner');
  if (!banner) return;
  banner.textContent = text;
  banner.classList.add('is-visible');
  window.setTimeout(() => banner.classList.remove('is-visible'), 1700);
}

async function loadRsvpSummary() {
  if (!supabase) {
    renderSummary(buildLocalSummary());
    const status = $('#rsvp-status');
    if (status && !getLocalRsvps().length) {
      status.textContent = 'Preview mode: connect Supabase to save real RSVPs.';
    }
    return;
  }

  const { data, error } = await supabase.rpc('get_rsvp_summary');
  if (error) {
    throw error;
  }

  const summary = Array.isArray(data) ? data[0] : data;
  renderSummary(summary);
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

function setupRsvpForm() {
  const form = $('#rsvp-form');
  const status = $('#rsvp-status');
  if (!form || !status) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.classList.remove('error');
    status.textContent = 'Submitting your RSVP...';

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
      const rsvp = readRsvpForm(form);
      if (!rsvp.guest_name) {
        throw new Error('Please enter your name.');
      }

      if (supabase) {
        const { error } = await supabase.from('rsvps').insert(rsvp);
        if (error) throw error;
      } else {
        saveLocalRsvp(rsvp);
      }

      status.textContent = rsvp.attendance === 'going'
        ? 'You are on the team sheet. See you at kick off!'
        : 'Thanks, your RSVP has been saved.';

      form.reset();
      form.querySelector('input[name="attendance"][value="going"]').checked = true;
      form.querySelector('input[name="guest_count"]').value = '1';
      form.querySelector('input[name="is_public"]').checked = true;

      await loadRsvpSummary();
      updatePlayerCard(rsvp);
      showGoalBanner(rsvp.attendance === 'going' ? 'GOOOAAAL! RSVP SAVED' : 'RSVP SAVED!');
      burstConfetti(rsvp.attendance === 'going' ? 4200 : 1800);
    } catch (error) {
      status.classList.add('error');
      status.textContent = error.message || 'Something went wrong. Please try again.';
    } finally {
      submitButton.disabled = false;
    }
  });
}

function randomId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getPhotoExtension(file) {
  const fallback = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : file.type === 'image/gif' ? 'gif' : 'jpg';
  const raw = file.name.split('.').pop() || fallback;
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || fallback;
}

function renderPhotos(photos) {
  const gallery = $('#photo-gallery');
  if (!gallery) return;

  gallery.innerHTML = '';
  if (!photos?.length) {
    const empty = document.createElement('p');
    empty.className = 'form-status';
    empty.textContent = photoUploadUnlocked ? 'No photos yet. Come back after the party and add the first one.' : 'The gallery will appear here after the party.';
    gallery.appendChild(empty);
    return;
  }

  photos.forEach((photo) => {
    const card = document.createElement('article');
    card.className = 'photo-card';

    const img = document.createElement('img');
    img.src = photo.public_url;
    img.alt = photo.caption || `Photo uploaded by ${photo.uploader_name || 'a guest'}`;
    img.loading = 'lazy';

    const body = document.createElement('div');
    const byline = document.createElement('strong');
    byline.textContent = photo.uploader_name || 'Guest';
    const caption = document.createElement('p');
    caption.textContent = photo.caption || 'Party memory';

    body.append(byline, caption);
    card.append(img, body);
    gallery.appendChild(card);
  });
}

async function loadPhotos() {
  if (!supabase) {
    renderPhotos([]);
    return;
  }

  const { data, error } = await supabase
    .from('party_photos')
    .select('uploader_name, caption, public_url, created_at')
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(24);

  if (error) throw error;
  renderPhotos(data);
}

function setupPhotoForm() {
  const form = $('#photo-form');
  const status = $('#photo-status');
  const message = $('#photo-lock-message');
  if (!form || !status || !message) return;

  if (!photoUploadUnlocked) {
    form.classList.add('is-locked');
    form.querySelectorAll('input, button').forEach((element) => {
      element.disabled = true;
    });
    message.textContent = `Photo upload opens after the final whistle on June 6, 2026. For testing before the party, add ?photos=1 to the site URL.`;
  } else if (!supabase) {
    form.classList.add('is-locked');
    form.querySelectorAll('input, button').forEach((element) => {
      element.disabled = true;
    });
    message.textContent = 'Photo upload is unlocked, but Supabase must be connected before guests can upload images.';
  } else {
    message.textContent = 'Photo upload is open. Add your favourite match day memories to the gallery.';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!photoUploadUnlocked || !supabase) return;

    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const file = formData.get('photo');
    const uploaderName = String(formData.get('uploader_name') || '').trim() || 'Guest';
    const caption = String(formData.get('caption') || '').trim();

    status.classList.remove('error');
    status.textContent = 'Uploading photo...';
    submitButton.disabled = true;

    try {
      if (!(file instanceof File) || file.size === 0) {
        throw new Error('Please choose a photo.');
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Please upload a JPG, PNG, WEBP, or GIF image.');
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('Please choose a photo smaller than 10 MB.');
      }

      const extension = getPhotoExtension(file);
      const dayFolder = new Date().toISOString().slice(0, 10);
      const filePath = `party/${dayFolder}/${randomId()}.${extension}`;

      const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false
      });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;

      const { error: metadataError } = await supabase.from('party_photos').insert({
        uploader_name: uploaderName,
        caption,
        file_path: filePath,
        public_url: publicUrl,
        approved: true
      });

      if (metadataError) throw metadataError;

      status.textContent = 'Uploaded. That memory is in the gallery!';
      form.reset();
      await loadPhotos();
      burstConfetti(1800);
    } catch (error) {
      status.classList.add('error');
      status.textContent = error.message || 'Upload failed. Please try again.';
    } finally {
      submitButton.disabled = false;
    }
  });
}

function burstConfetti(duration = 2600) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const canvas = $('#confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const resize = () => {
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  resize();

  const colors = ['#f4c75f', '#fffaf0', '#0f6a37', '#e63946', '#2563eb'];
  const shapes = ['rect', 'circle', 'star'];
  const particles = Array.from({ length: 170 }, () => ({
    x: Math.random() * window.innerWidth,
    y: -30 - Math.random() * window.innerHeight * 0.35,
    vx: -3 + Math.random() * 6,
    vy: 3 + Math.random() * 5,
    size: 5 + Math.random() * 8,
    spin: Math.random() * Math.PI,
    spinSpeed: -0.18 + Math.random() * 0.36,
    color: colors[Math.floor(Math.random() * colors.length)],
    shape: shapes[Math.floor(Math.random() * shapes.length)],
    gravity: 0.045 + Math.random() * 0.04,
    opacity: 0.74 + Math.random() * 0.26
  }));

  const startedAt = performance.now();
  const endAt = startedAt + duration;

  function drawStar(x, y, radius) {
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const length = i % 2 === 0 ? radius : radius * 0.45;
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    }
    ctx.closePath();
    ctx.fill();
  }

  function frame(now) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += particle.gravity;
      particle.spin += particle.spinSpeed;

      if (particle.y > window.innerHeight + 40) {
        particle.y = -20;
        particle.x = Math.random() * window.innerWidth;
        particle.vy = 2 + Math.random() * 4;
      }

      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.spin);
      ctx.globalAlpha = particle.opacity * Math.max(0, (endAt - now) / duration);
      ctx.fillStyle = particle.color;

      if (particle.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, particle.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
      } else if (particle.shape === 'star') {
        drawStar(0, 0, particle.size * 0.75);
      } else {
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.58);
      }

      ctx.restore();
    });

    if (now < endAt) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  requestAnimationFrame(frame);
}


function setupStadiumIntro() {
  const intro = $('#stadium-intro');
  const button = $('#enter-stadium');
  if (!intro || !button) return;

  const alreadySeen = localStorage.getItem(INTRO_KEY) === 'yes';
  if (alreadySeen) {
    intro.classList.add('is-hidden');
    return;
  }

  button.addEventListener('click', () => {
    localStorage.setItem(INTRO_KEY, 'yes');
    intro.classList.add('is-hidden');
    showGoalBanner('WELCOME TO YUVAAN STADIUM');
    burstConfetti(1800);
  });
}

function setupPenaltyGame() {
  const targets = [...document.querySelectorAll('.shot-target')];
  const goalie = $('#goalie');
  const ball = $('#game-ball');
  const status = $('#game-status');
  const reset = $('#reset-game');
  if (!targets.length || !goalie || !ball || !status || !reset) return;

  const positions = ['left', 'middle', 'right'];
  const resetShot = () => {
    ball.className = 'ball';
    goalie.className = 'goalie';
    targets.forEach((target) => { target.disabled = false; target.classList.remove('is-picked'); });
    status.textContent = 'Choose your corner and shoot!';
  };

  targets.forEach((target) => {
    target.addEventListener('click', () => {
      const shot = target.dataset.shot;
      const goalieDive = positions[Math.floor(Math.random() * positions.length)];
      const scored = shot !== goalieDive || Math.random() > 0.72;

      targets.forEach((item) => { item.disabled = true; item.classList.remove('is-picked'); });
      target.classList.add('is-picked');
      goalie.className = `goalie dive-${goalieDive}`;
      ball.className = `ball shoot-${shot}`;

      if (scored) {
        status.textContent = 'GOAL! You unlocked champion energy for the RSVP.';
        showGoalBanner('GOOOAAAL!');
        burstConfetti(2200);
      } else {
        status.textContent = 'Saved by the goalie! Try again or RSVP anyway.';
        showGoalBanner('BIG SAVE!');
      }
    });
  });

  reset.addEventListener('click', resetShot);
}

async function boot() {
  setupStadiumIntro();
  setupPenaltyGame();
  startCountdown();
  setupRsvpForm();
  setupPhotoForm();

  try {
    await loadRsvpSummary();
  } catch (error) {
    const status = $('#rsvp-status');
    if (status) {
      status.classList.add('error');
      status.textContent = `Could not load RSVP summary: ${error.message}`;
    }
  }

  try {
    await loadPhotos();
  } catch (error) {
    const status = $('#photo-status');
    if (status) {
      status.classList.add('error');
      status.textContent = `Could not load photos: ${error.message}`;
    }
  }

  window.setTimeout(() => burstConfetti(2600), 700);
}

boot();
