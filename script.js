(() => {
"use strict";

const canvas = document.getElementById("starfield");
const ctx = canvas?.getContext("2d");
const year = document.getElementById("year");
const returnTop = document.getElementById("return-top");

if (year) {
year.textContent = new Date().getFullYear();
}

if (returnTop) {
returnTop.addEventListener("click", (event) => {
event.preventDefault();
window.scrollTo({
top: 0,
behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
? "auto"
: "smooth"
});
});
}

// Lightweight animated starfield.
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

const STAR_LIMIT = 150;

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
    STAR_LIMIT,
    Math.max(45, Math.floor((width * height) / 8500))
  );

  stars = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 1.15 + 0.2,
    alpha: Math.random() * 0.6 + 0.15,
    speed: Math.random() * 0.12 + 0.025,
    phase: Math.random() * Math.PI * 2
  }));

  drawStaticStars();
}

function drawStaticStars() {
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);

  for (const star of stars) {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(244, 220, 155, ${star.alpha})`;
    ctx.fill();
  }
}

function animate(timestamp = 0) {
  if (!running || !ctx) return;

  // Limit work on mobile screens to approximately 30 FPS.
  if (timestamp - lastFrame < 33) {
    animationFrame = requestAnimationFrame(animate);
    return;
  }

  lastFrame = timestamp;
  ctx.clearRect(0, 0, width, height);

  for (const star of stars) {
    star.phase += 0.008;
    const twinkle = 0.72 + Math.sin(star.phase) * 0.28;

    if (!reducedMotion) {
      star.y += star.speed;

      if (star.y > height + 2) {
        star.y = -2;
        star.x = Math.random() * width;
      }
    }

    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(244, 220, 155, ${star.alpha * twinkle})`;
    ctx.fill();
  }

  animationFrame = requestAnimationFrame(animate);
}

function startAnimation() {
  if (running && !animationFrame && !reducedMotion) {
    animationFrame = requestAnimationFrame(animate);
  }
}

function stopAnimation() {
  running = false;

  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }
}

function resumeAnimation() {
  if (document.hidden) return;

  running = true;

  if (reducedMotion) {
    drawStaticStars();
    return;
  }

  startAnimation();
}

resizeCanvas();

if (reducedMotion) {
  drawStaticStars();
} else {
  startAnimation();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopAnimation();
  } else {
    resumeAnimation();
  }
});

let resizeTimer;

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resizeCanvas();

    if (!reducedMotion && !document.hidden) {
      stopAnimation();
      running = true;
      startAnimation();
    }
  }, 120);
}, { passive: true });

}

// Reveal sections as they enter the viewport.
const revealSections = document.querySelectorAll(".section-reveal");

if ("IntersectionObserver" in window) {
const observer = new IntersectionObserver((entries, currentObserver) => {
for (const entry of entries) {
if (entry.isIntersecting) {
entry.target.classList.add("visible");
currentObserver.unobserve(entry.target);
}
}
}, {
threshold: 0.08
});

revealSections.forEach((section) => observer.observe(section));

} else {
revealSections.forEach((section) => section.classList.add("visible"));
}
})();
