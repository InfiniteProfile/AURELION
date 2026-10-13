(() => {
"use strict";

const grid = document.getElementById("profileGrid");
const sentinel = document.getElementById("scrollSentinel");
const loadButton = document.getElementById("loadMore");
const loadingIndicator = document.getElementById("loadingIndicator");
const rangeLabel = document.getElementById("rangeLabel");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("profileSearch");
const backToTop = document.getElementById("backToTop");
const year = document.getElementById("year");

if (!grid || !sentinel) return;

if (year) year.textContent = new Date().getFullYear();

const BATCH_SIZE = 24;
const MAX_VISIBLE = 72;
const MAX_SEARCH_DIGITS = 1000;

let nextId = 1n;
let firstVisibleId = 1n;
let isLoading = false;
let observer = null;
let pendingFrame = 0;
let searchVersion = 0;

const namesA = [
"Aurelius", "Nyx", "Solara", "Veyron", "Caelum",
"Zerion", "Astrion", "Elaris", "Orion", "Vael",
"Lunaris", "Aether", "Zephira", "Noctis", "Altair",
"Seraph", "Velora", "Eclipse", "Arcturus", "Lyra",
"Vesper", "Oryn", "Zypher", "Elion", "Novaris",
"Solis", "Astra", "Kael", "Riven", "Thalor",
"Cyrion", "Evora", "Nerion", "Auralis", "Draven",
"Oberon", "Calista", "Eryndor", "Valkyr", "Solstice"
];

const namesB = [
"the Eternal", "the Unknown", "Starborn", "the Infinite",
"of the Void", "the Celestial", "the Timeless", "the Ancient",
"of Eternity", "the Unseen", "the Wanderer", "the Radiant",
"of the Cosmos", "the Dreamer", "the Boundless", "the Silent",
"the Astral", "of the Abyss", "the Luminary", "the Origin",
"the Exalted", "the Forgotten", "the Ascendant", "the Infinite One"
];

const roles = [
"Guardian of Lost Galaxies",
"Explorer of the Unknown",
"Keeper of Cosmic Secrets",
"Wanderer Beyond Time",
"Architect of Dreams",
"Watcher of Distant Stars",
"Seeker of Eternity",
"Master of Celestial Light",
"Traveler Between Worlds",
"Observer of Infinite Realms",
"Guardian of the Eternal Core",
"Dreamer Beyond Existence",
"Cartographer of the Cosmos",
"Voice of the Silent Void",
"Bearer of Ancient Wisdom",
"Sentinel of the Astral Gate"
];

const symbols = [
"✦", "✧", "◈", "◇", "✺", "☼", "∞", "✳",
"◉", "⟡", "✴", "⬡", "✵", "❖", "⊙", "⋆"
];

const accents = [
[212, 175, 55],
[179, 151, 100],
[164, 130, 220],
[110, 173, 220],
[218, 145, 110],
[125, 195, 165],
[220, 190, 130],
[154, 158, 225]
];

// Deterministic pseudo-random selection.
// The same profile ID always creates the same identity.
function hashText(text) {
let hash = 2166136261;

for (let i = 0; i < text.length; i++) {
  hash ^= text.charCodeAt(i);
  hash = Math.imul(hash, 16777619);
}

return hash >>> 0;

}

function pick(list, seed, offset = 0) {
const index = (seed + Math.imul(offset + 1, 2654435761)) >>> 0;
return list[index % list.length];
}

function makeProfile(id) {
const idText = id.toString();
const seed = hashText(idText);

const nameA = pick(namesA, seed, 0);
const nameB = pick(namesB, seed, 1);
const role = pick(roles, seed, 2);
const symbol = pick(symbols, seed, 3);
const accent = pick(accents, seed, 4);

return {
  id: idText,
  name: `${nameA} ${nameB}`,
  role,
  symbol,
  accent
};

}

function createCard(profile) {
const [r, g, b] = profile.accent;
const accentRGB = "${r}, ${g}, ${b}";
const accentColor = "rgb(${r}, ${g}, ${b})";

const card = document.createElement("article");
card.className = "profile-card";
card.dataset.profileId = profile.id;
card.style.setProperty("--accent", accentRGB);
card.style.setProperty("--accent-color", accentColor);

const top = document.createElement("div");
top.className = "profile-top";

const idLabel = document.createElement("span");
idLabel.textContent = `IDENTITY #${profile.id}`;

const status = document.createElement("span");
status.className = "profile-status";
status.textContent = "DISCOVERED";

top.append(idLabel, status);

const art = document.createElement("div");
art.className = "profile-art";
art.setAttribute("aria-hidden", "true");

const orbit1 = document.createElement("div");
orbit1.className = "profile-orbit";

const orbit2 = document.createElement("div");
orbit2.className = "profile-orbit orbit-tilted";

const orbit3 = document.createElement("div");
orbit3.className = "profile-orbit orbit-inner";

const avatar = document.createElement("div");
avatar.className = "profile-avatar";
avatar.textContent = profile.symbol;

art.append(orbit1, orbit2, orbit3, avatar);

const details = document.createElement("div");
details.className = "profile-details";

const name = document.createElement("h3");
name.className = "profile-name";
name.textContent = profile.name;

const subtitle = document.createElement("p");
subtitle.className = "profile-subtitle";
subtitle.textContent = profile.role;

const bottom = document.createElement("div");
bottom.className = "profile-bottom";

const identity = document.createElement("span");
identity.textContent = `AUR-${profile.id}`;

const statusText = document.createElement("span");
statusText.textContent = "INFINITE ∞";

bottom.append(identity, statusText);
details.append(name, subtitle, bottom);
card.append(top, art, details);

return card;

}

function updateRange() {
if (!rangeLabel) return;

const cards = grid.querySelectorAll(".profile-card");

if (!cards.length) {
  rangeLabel.textContent = "NO IDENTITIES";
  return;
}

const first = cards[0].dataset.profileId;
const last = cards[cards.length - 1].dataset.profileId;

rangeLabel.textContent = `IDENTITIES #${first}–#${last}`;

}

function showLoading(show) {
if (loadingIndicator) {
loadingIndicator.classList.toggle("hidden", !show);
}

if (loadButton) {
  loadButton.disabled = show;
}

}

function generateBatch(count = BATCH_SIZE) {
if (isLoading) return;

isLoading = true;
showLoading(true);

// Allow the browser to paint the loading state before generating.
pendingFrame = requestAnimationFrame(() => {
  pendingFrame = 0;

  try {
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
      fragment.appendChild(createCard(makeProfile(nextId)));
      nextId += 1n;
    }

    grid.appendChild(fragment);

    // Keep the DOM bounded for better mobile performance.
    // Older cards are removed, but their IDs can still be regenerated.
    while (grid.children.length > MAX_VISIBLE) {
      const firstCard = grid.firstElementChild;

      if (!firstCard) break;

      const removedId = BigInt(firstCard.dataset.profileId);

      if (removedId >= firstVisibleId) {
        firstVisibleId = removedId + 1n;
      }

      firstCard.remove();
    }

    updateRange();
  } finally {
    isLoading = false;
    showLoading(false);
  }
});

}

function resetToProfile(id) {
searchVersion++;

if (pendingFrame) {
  cancelAnimationFrame(pendingFrame);
  pendingFrame = 0;
}

isLoading = false;
showLoading(false);

grid.replaceChildren();

// Start a new browsing window at the requested ID.
// BigInt supports IDs far beyond JavaScript's safe integer range.
nextId = id;
firstVisibleId = id;

generateBatch();

window.scrollTo({
  top: document.getElementById("universe").offsetTop,
  behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth"
});

}

function handleSearch(event) {
event.preventDefault();

const raw = searchInput.value.trim();

if (!/^\d+$/.test(raw)) {
  searchInput.setCustomValidity("Enter a positive whole-number profile ID.");
  searchInput.reportValidity();
  searchInput.setCustomValidity("");
  return;
}

const normalized = raw.replace(/^0+/, "");

if (!normalized) {
  searchInput.setCustomValidity("Profile numbers begin at 1.");
  searchInput.reportValidity();
  searchInput.setCustomValidity("");
  return;
}

if (normalized.length > MAX_SEARCH_DIGITS) {
  searchInput.setCustomValidity(
    `Please enter a number with no more than ${MAX_SEARCH_DIGITS} digits.`
  );
  searchInput.reportValidity();
  searchInput.setCustomValidity("");
  return;
}

const id = BigInt(normalized);
resetToProfile(id);

}

function handleLoadMore() {
generateBatch();
}

if (searchForm) {
searchForm.addEventListener("submit", handleSearch);
}

if (searchInput) {
searchInput.addEventListener("input", () => {
searchInput.setCustomValidity("");
});
}

if (loadButton) {
loadButton.addEventListener("click", handleLoadMore);
}

if (backToTop) {
backToTop.addEventListener("click", () => {
window.scrollTo({
top: 0,
behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
? "auto"
: "smooth"
});
});
}

// Automatically generate the next batch near the bottom.
if ("IntersectionObserver" in window) {
observer = new IntersectionObserver((entries) => {
if (entries.some(entry => entry.isIntersecting)) {
generateBatch();
}
}, {
rootMargin: "700px 0px"
});

observer.observe(sentinel);

} else {
// Fallback for browsers without IntersectionObserver.
window.addEventListener("scroll", () => {
const nearBottom =
window.innerHeight + window.scrollY >=
document.documentElement.scrollHeight - 700;

  if (nearBottom) generateBatch();
}, { passive: true });

}

// Initial profiles.
generateBatch(BATCH_SIZE);

// Animate the starfield without external libraries.
const canvas = document.getElementById("starfield");
const ctx = canvas?.getContext("2d");

if (canvas && ctx) {
const reducedMotion = window.matchMedia(
"(prefers-reduced-motion: reduce)"
).matches;

let width = 0;
let height = 0;
let stars = [];
let animationFrame = 0;
let lastFrame = 0;
let running = true;

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  width = window.innerWidth;
  height = window.innerHeight;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const count = Math.min(
    125,
    Math.max(40, Math.floor((width * height) / 10000))
  );

  stars = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 1.1 + 0.2,
    alpha: Math.random() * 0.6 + 0.15,
    speed: Math.random() * 0.1 + 0.02,
    phase: Math.random() * Math.PI * 2
  }));

  drawStars();
}

function drawStars() {
  ctx.clearRect(0, 0, width, height);

  for (const star of stars) {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(244, 220, 155, ${star.alpha})`;
    ctx.fill();
  }
}

function animate(timestamp = 0) {
  animationFrame = 0;

  if (!running || document.hidden) return;

  if (timestamp - lastFrame < 33) {
    animationFrame = requestAnimationFrame(animate);
    return;
  }

  lastFrame = timestamp;
  ctx.clearRect(0, 0, width, height);

  for (const star of stars) {
    star.phase += 0.008;

    if (!reducedMotion) {
      star.y += star.speed;

      if (star.y > height + 2) {
        star.y = -2;
        star.x = Math.random() * width;
      }
    }

    const twinkle = 0.72 + Math.sin(star.phase) * 0.28;

    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(244, 220, 155, ${star.alpha * twinkle})`;
    ctx.fill();
  }

  if (!reducedMotion) {
    animationFrame = requestAnimationFrame(animate);
  }
}

function startStars() {
  running = true;

  if (reducedMotion) {
    drawStars();
    return;
  }

  if (!animationFrame && !document.hidden) {
    animationFrame = requestAnimationFrame(animate);
  }
}

function stopStars() {
  running = false;

  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }
}

resizeCanvas();
startStars();

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopStars();
  } else {
    startStars();
  }
});

let resizeTimer;

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    resizeCanvas();
    startStars();
  }, 120);
}, { passive: true });

}
})();
