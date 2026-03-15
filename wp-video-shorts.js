/**
 * WP Video Shorts — Carousel Slider (PlayShorts-style)
 * =====================================================
 * Mobile-first, responsive, performant
 *
 * FONCTIONNALITÉS :
 * - Mobile-first CSS (base = mobile, min-width = scale up)
 * - Carousel horizontal avec inertie/momentum physique
 * - Snap magnétique sur les cartes
 * - Rubber-band aux bornes du carousel
 * - Cartes fluides (clamp) — pas de px fixe
 * - Thumbnail image + vidéo preview au hover (desktop)
 * - Tap-to-play/pause dans la lightbox (mobile)
 * - Safe-area-inset pour iPhone notch/Dynamic Island
 * - 100dvh lightbox (fix iOS Safari)
 * - Touch targets >= 44px (Apple HIG)
 * - Lazy loading IntersectionObserver (horizontal)
 * - Pas de backdrop-filter sur les cartes (perf mobile)
 * - touch-action: pan-y sur le carousel
 * - prefers-reduced-motion respecté
 * - Accessibilité : focus visible, aria, rôles
 *
 * UTILISATION :
 * <div data-wp-video-shorts>
 *   <div class="wvs-card"
 *     data-video="url.mp4"
 *     data-poster="thumb.webp"
 *     data-title="Titre">
 *   </div>
 * </div>
 */

(function () {
  "use strict";

  /* ─── CONFIGURATION ─── */
  const CONFIG = {
    gap: 12,               // Gap mobile (px) — scales up via CSS
    gapDesktop: 20,
    scrollStepMobile: 1,   // Cartes par scroll flèche mobile
    scrollStepDesktop: 3,
    hoverDelay: 200,
    autoScroll: false,
    autoScrollInterval: 4000,
    borderRadius: 14,
    showArrows: true,
    showTitle: true,
    titlePosition: "inside",
    lightbox: true,
    swipeThreshold: 80,
    dragThreshold: 8,
    momentumFriction: 0.92,   // Inertie : 0.9=lourd 0.96=léger
    momentumMultiplier: 0.8,
    rubberBandFactor: 0.35,   // Résistance rubber-band
  };

  /* ─── DETECT ─── */
  const prefersReducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouchDevice = () => window.matchMedia("(pointer: coarse)").matches;

  /* ─── STYLES (Mobile-first) ─── */
  const STYLES = `
    /* ============================
       BASE = MOBILE (< 640px)
       ============================ */

    .wvs-carousel-wrapper {
      position: relative;
      width: 100%;
      overflow: hidden;
      padding: 8px 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      touch-action: pan-y;
      -webkit-tap-highlight-color: transparent;
    }

    /* Fade edges */
    .wvs-carousel-wrapper::before,
    .wvs-carousel-wrapper::after {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      width: 20px;
      z-index: 5;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .wvs-carousel-wrapper::before {
      left: 0;
      background: linear-gradient(90deg, var(--wvs-bg, #f5f5f5) 0%, transparent 100%);
    }
    .wvs-carousel-wrapper::after {
      right: 0;
      background: linear-gradient(270deg, var(--wvs-bg, #f5f5f5) 0%, transparent 100%);
    }
    .wvs-carousel-wrapper.wvs-fade-left::before { opacity: 1; }
    .wvs-carousel-wrapper.wvs-fade-right::after { opacity: 1; }

    /* Cards container */
    .wvs-cards {
      display: flex;
      gap: ${CONFIG.gap}px;
      transition: transform 0.45s cubic-bezier(0.25, 0.1, 0.25, 1);
      opacity: 0;
      animation: wvsFadeIn 0.35s ease forwards;
    }

    .wvs-cards.wvs-dragging {
      transition: none;
      will-change: transform;
    }

    .wvs-cards.wvs-momentum {
      transition: transform 0.6s cubic-bezier(0.15, 0.8, 0.3, 1);
    }

    @keyframes wvsFadeIn {
      to { opacity: 1; }
    }

    /* Card — mobile base : fluide via clamp */
    .wvs-card-item {
      flex: 0 0 clamp(130px, 38vw, 170px);
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
    }

    /* Thumbnail wrapper */
    .wvs-card-thumb-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 9 / 16;
      border-radius: ${CONFIG.borderRadius}px;
      overflow: hidden;
      background: #1a1a1a;
    }

    /* Skeleton shimmer */
    .wvs-card-thumb-wrap::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 0;
      background: linear-gradient(110deg, #2a2a2a 25%, #3a3a3a 37%, #2a2a2a 50%);
      background-size: 200% 100%;
      animation: wvsShimmer 1.5s ease infinite;
    }
    .wvs-card-thumb-wrap.wvs-loaded::before { display: none; }

    @keyframes wvsShimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Poster image */
    .wvs-card-thumb-wrap img.wvs-card-thumb {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: opacity 0.3s ease;
      z-index: 1;
    }

    /* Backdrop gradient */
    .wvs-card-backdrop {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.7) 100%);
      z-index: 2;
      pointer-events: none;
    }

    /* Video preview (desktop only) */
    .wvs-card-thumb-wrap video.wvs-card-preview {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.35s ease;
      z-index: 1;
    }

    .wvs-card-item:hover .wvs-card-preview { opacity: 1; }
    .wvs-card-item:hover .wvs-card-thumb { opacity: 0; }

    /* Play button — pas de backdrop-filter sur mobile (perf) */
    .wvs-card-play {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 4;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      opacity: 0.9;
      transition: opacity 0.25s ease, transform 0.25s ease;
    }

    .wvs-card-play-blur {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .wvs-card-play-icon {
      width: 20px;
      height: 20px;
      fill: white;
    }

    /* Card title */
    .wvs-card-title {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 10px 10px;
      color: #fff;
      font-size: clamp(11px, 2.8vw, 13px);
      font-weight: 600;
      line-height: 1.3;
      z-index: 3;
      text-shadow: 0 1px 3px rgba(0,0,0,0.6);
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .wvs-card-title--below {
      position: relative;
      padding: 6px 2px 0;
      color: #333;
      text-shadow: none;
    }

    /* Arrows — HIDDEN on mobile */
    .wvs-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 10;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 2px 8px rgba(0,0,0,0.18);
      cursor: pointer;
      display: none;
      align-items: center;
      justify-content: center;
      transition: opacity 0.25s ease, transform 0.2s ease, box-shadow 0.2s ease;
      opacity: 0;
      pointer-events: none;
    }

    .wvs-arrow--visible { opacity: 1; pointer-events: auto; }
    .wvs-arrow--left { left: 6px; }
    .wvs-arrow--right { right: 6px; }

    .wvs-arrow svg {
      width: 20px;
      height: 20px;
      fill: #333;
    }

    /* Focus visible (a11y) */
    .wvs-card-item:focus-visible,
    .wvs-arrow:focus-visible,
    .wvs-lightbox-close:focus-visible,
    .wvs-lightbox-btn:focus-visible,
    .wvs-lightbox-nav:focus-visible {
      outline: 2px solid #7c6cff;
      outline-offset: 2px;
    }

    /* ============================
       LIGHTBOX — Mobile base
       ============================ */

    .wvs-lightbox {
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }
    .wvs-lightbox--open { opacity: 1; visibility: visible; }

    .wvs-lightbox-inner {
      position: relative;
      width: 100%;
      height: 100vh;
      height: 100dvh;
      border-radius: 0;
      overflow: hidden;
      background: #000;
      display: flex;
      flex-direction: column;
    }

    .wvs-lightbox video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Tap zone — invisible, couvre toute la vidéo */
    .wvs-lightbox-tapzone {
      position: absolute;
      inset: 60px 0 80px 0;
      z-index: 4;
      cursor: pointer;
    }

    /* Lightbox header */
    .wvs-lightbox-header {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 12px 12px;
      padding-top: calc(12px + env(safe-area-inset-top, 0px));
      z-index: 5;
      background: linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 60%, transparent 100%);
    }

    .wvs-lightbox-header-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
      margin-right: 10px;
    }

    .wvs-lightbox-title {
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .wvs-lightbox-counter {
      color: rgba(255,255,255,0.55);
      font-size: 11px;
      font-weight: 400;
    }

    .wvs-lightbox-close {
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 50%;
      background: rgba(255,255,255,0.12);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.2s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .wvs-lightbox-close:hover { background: rgba(255,255,255,0.25); }
    .wvs-lightbox-close svg { width: 20px; height: 20px; fill: #fff; }

    /* Lightbox controls */
    .wvs-lightbox-controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 16px 12px;
      padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
      z-index: 5;
      background: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 60%, transparent 100%);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* Progress bar — zone tactile élargie */
    .wvs-lightbox-progress-bar {
      width: 100%;
      height: 28px;
      display: flex;
      align-items: center;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .wvs-lightbox-progress-track {
      width: 100%;
      height: 3px;
      background: rgba(255,255,255,0.2);
      border-radius: 2px;
      overflow: hidden;
      transition: height 0.15s ease;
    }

    .wvs-lightbox-progress-fill {
      height: 100%;
      background: #fff;
      border-radius: 2px;
      width: 0%;
    }

    .wvs-lightbox-bottom-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .wvs-lightbox-time {
      color: rgba(255,255,255,0.6);
      font-size: 11px;
      font-variant-numeric: tabular-nums;
      min-width: 70px;
      text-align: center;
    }

    .wvs-lightbox-btn {
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 50%;
      background: rgba(255,255,255,0.12);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .wvs-lightbox-btn:hover { background: rgba(255,255,255,0.25); }
    .wvs-lightbox-btn svg { width: 20px; height: 20px; fill: #fff; }

    .wvs-lightbox-btn-group {
      display: flex;
      gap: 6px;
    }

    /* Lightbox nav arrows — hidden on mobile */
    .wvs-lightbox-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 6;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: none;
      background: rgba(255,255,255,0.12);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      cursor: pointer;
      display: none;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease, background 0.2s ease;
    }
    .wvs-lightbox-nav--visible { opacity: 1; pointer-events: auto; }
    .wvs-lightbox-nav:hover { background: rgba(255,255,255,0.3); }
    .wvs-lightbox-nav--prev { left: 10px; }
    .wvs-lightbox-nav--next { right: 10px; }
    .wvs-lightbox-nav svg { width: 22px; height: 22px; fill: #fff; }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .wvs-cards,
      .wvs-card-item,
      .wvs-card-play,
      .wvs-card-thumb-wrap img,
      .wvs-card-thumb-wrap video,
      .wvs-lightbox,
      .wvs-arrow {
        transition: none !important;
        animation: none !important;
      }
      .wvs-cards { opacity: 1; }
      .wvs-card-thumb-wrap::before { animation: none; }
    }

    /* ============================
       SM — 640px+ (large phones)
       ============================ */
    @media (min-width: 640px) {
      .wvs-cards { gap: 16px; }
      .wvs-card-item { flex: 0 0 clamp(160px, 28vw, 200px); }
      .wvs-card-title { font-size: 13px; padding: 12px 12px; }
      .wvs-card-play { width: 48px; height: 48px; }
      .wvs-card-play-icon { width: 22px; height: 22px; }
      .wvs-carousel-wrapper::before,
      .wvs-carousel-wrapper::after { width: 30px; }
    }

    /* ============================
       MD — 768px+ (tablets)
       ============================ */
    @media (min-width: 768px) {
      .wvs-carousel-wrapper { padding: 10px 0; }
      .wvs-cards { gap: ${CONFIG.gapDesktop}px; }
      .wvs-card-item { flex: 0 0 clamp(180px, 20vw, 220px); }

      .wvs-card-title { font-size: 14px; padding: 12px 14px; }

      /* Arrows visible on tablet+ */
      .wvs-arrow {
        display: flex;
        width: 40px;
        height: 40px;
      }
      .wvs-arrow:hover {
        box-shadow: 0 4px 14px rgba(0,0,0,0.22);
        transform: translateY(-50%) scale(1.06);
      }
      .wvs-arrow:active {
        transform: translateY(-50%) scale(0.96);
      }

      .wvs-carousel-wrapper::before,
      .wvs-carousel-wrapper::after { width: 40px; }

      /* Play button avec blur desktop */
      .wvs-card-play-blur {
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        background: rgba(0, 0, 0, 0.4);
      }

      /* Hover lift */
      .wvs-card-item {
        transition: transform 0.25s ease;
      }
      .wvs-card-item:hover {
        transform: translateY(-4px);
      }
      .wvs-card-item:hover .wvs-card-play {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1.1);
      }

      /* Lightbox desktop */
      .wvs-lightbox-inner {
        max-width: 420px;
        height: 85vh;
        max-height: 750px;
        border-radius: 16px;
      }

      .wvs-lightbox-header { padding: 16px; }
      .wvs-lightbox-title { font-size: 15px; }
      .wvs-lightbox-counter { font-size: 12px; }
      .wvs-lightbox-controls { padding: 18px 16px; }
      .wvs-lightbox-time { font-size: 12px; }

      .wvs-lightbox-progress-track { height: 4px; }
      .wvs-lightbox-progress-bar:hover .wvs-lightbox-progress-track { height: 6px; }

      /* Nav arrows visible on desktop */
      .wvs-lightbox-nav { display: flex; }
    }

    /* ============================
       LG — 1024px+ (desktop)
       ============================ */
    @media (min-width: 1024px) {
      .wvs-card-item { flex: 0 0 clamp(200px, 16vw, 240px); }
      .wvs-card-play { width: 52px; height: 52px; }
      .wvs-card-play-icon { width: 24px; height: 24px; }
      .wvs-arrow { width: 44px; height: 44px; }
      .wvs-arrow svg { width: 22px; height: 22px; }
    }

    /* ============================
       XL — 1440px+ (wide desktop)
       ============================ */
    @media (min-width: 1440px) {
      .wvs-card-item { flex: 0 0 260px; }
      .wvs-cards { gap: 24px; }
    }
  `;

  /* ─── INJECT STYLES ─── */
  function injectStyles() {
    if (document.getElementById("wvs-styles")) return;
    const style = document.createElement("style");
    style.id = "wvs-styles";
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  /* ─── SVG ICONS ─── */
  const ICONS = {
    play: `<svg viewBox="0 0 24 24" fill="white" class="wvs-card-play-icon"><path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/></svg>`,
    arrowLeft: `<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`,
    arrowRight: `<svg viewBox="0 0 24 24"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>`,
    close: `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
    pause: `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
    playFill: `<svg viewBox="0 0 24 24"><path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/></svg>`,
    volumeOff: `<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`,
    volumeOn: `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
  };

  /* ─── UTILS ─── */
  function formatTime(seconds) {
    if (!seconds || !isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function getScrollStep() {
    return isTouchDevice() ? CONFIG.scrollStepMobile : CONFIG.scrollStepDesktop;
  }

  /* ─── BUILD CAROUSEL ─── */
  function buildCarousel(container) {
    const cards = container.querySelectorAll(".wvs-card");
    if (!cards.length) return;

    const stories = Array.from(cards).map((card) => ({
      video: card.dataset.video || "",
      poster: card.dataset.poster || "",
      title: card.dataset.title || "",
    }));

    container.innerHTML = "";

    // Detect background color for fade edges
    const bgColor = getComputedStyle(container.parentElement).backgroundColor;

    // Wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "wvs-carousel-wrapper";
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", "Carousel vidéo");
    if (bgColor && bgColor !== "rgba(0, 0, 0, 0)") {
      wrapper.style.setProperty("--wvs-bg", bgColor);
    }

    // Cards container
    const cardsEl = document.createElement("div");
    cardsEl.className = "wvs-cards";
    cardsEl.setAttribute("role", "list");

    let scrollPos = 0;

    // IntersectionObserver for lazy poster loading
    const posterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        const src = img.dataset.lazySrc;
        if (src) {
          img.src = src;
          img.removeAttribute("data-lazy-src");
        }
        posterObserver.unobserve(img);
      });
    }, { rootMargin: "0px 200px 0px 0px" }); // 200px ahead horizontally

    stories.forEach((story, idx) => {
      const item = document.createElement("div");
      item.className = "wvs-card-item";
      item.setAttribute("data-index", idx);
      item.setAttribute("role", "listitem");
      item.setAttribute("tabindex", "0");
      item.setAttribute("aria-label", story.title || `Vidéo ${idx + 1}`);

      const thumbWrap = document.createElement("div");
      thumbWrap.className = "wvs-card-thumb-wrap";

      // Poster image — first 2 eager, rest lazy via IntersectionObserver
      const img = document.createElement("img");
      img.className = "wvs-card-thumb";
      img.alt = story.title;
      if (story.poster) {
        if (idx < 2) {
          img.src = story.poster;
          img.fetchPriority = "high";
        } else {
          img.dataset.lazySrc = story.poster;
          posterObserver.observe(img);
        }
        img.onload = () => thumbWrap.classList.add("wvs-loaded");
        img.onerror = () => thumbWrap.classList.add("wvs-loaded");
      } else {
        thumbWrap.classList.add("wvs-loaded");
      }
      thumbWrap.appendChild(img);

      // Backdrop gradient
      const backdrop = document.createElement("div");
      backdrop.className = "wvs-card-backdrop";
      thumbWrap.appendChild(backdrop);

      // Video preview (desktop only — no preview elements on touch devices)
      let preview = null;
      if (story.video && !prefersReducedMotion && !isTouchDevice()) {
        preview = document.createElement("video");
        preview.className = "wvs-card-preview";
        preview.loop = true;
        preview.playsInline = true;
        preview.muted = true;
        preview.preload = "none";
        thumbWrap.appendChild(preview);
      }

      // Play button
      const playBtn = document.createElement("div");
      playBtn.className = "wvs-card-play";
      playBtn.innerHTML = `<div class="wvs-card-play-blur">${ICONS.play}</div>`;
      thumbWrap.appendChild(playBtn);

      // Title
      if (CONFIG.showTitle && story.title) {
        const title = document.createElement("div");
        title.className = "wvs-card-title" +
          (CONFIG.titlePosition === "below" ? " wvs-card-title--below" : "");
        title.textContent = story.title;
        if (CONFIG.titlePosition === "inside") {
          thumbWrap.appendChild(title);
        } else {
          item.appendChild(thumbWrap);
          item.appendChild(title);
        }
      }

      if (CONFIG.titlePosition === "inside") {
        item.appendChild(thumbWrap);
      }

      cardsEl.appendChild(item);

      // Hover preview (desktop only)
      if (preview) {
        let hoverTimer = null;
        let previewSrcLoaded = false;

        item.addEventListener("mouseenter", () => {
          hoverTimer = setTimeout(() => {
            if (!previewSrcLoaded) {
              preview.src = story.video;
              previewSrcLoaded = true;
            }
            preview.currentTime = 0;
            preview.play().catch(() => {});
          }, CONFIG.hoverDelay);
        });

        item.addEventListener("mouseleave", () => {
          clearTimeout(hoverTimer);
          if (previewSrcLoaded) {
            preview.pause();
            preview.currentTime = 0;
          }
        });
      }

      // Keyboard → lightbox
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (CONFIG.lightbox) openLightbox(stories, idx);
        }
      });
    });

    wrapper.appendChild(cardsEl);

    /* ─── SCROLL & ARROW LOGIC ─── */
    const getCardWidth = () => {
      const firstCard = cardsEl.querySelector(".wvs-card-item");
      if (!firstCard) return 180;
      const gap = parseFloat(getComputedStyle(cardsEl).gap) || CONFIG.gap;
      return firstCard.offsetWidth + gap;
    };

    const getMaxScroll = () => Math.max(0, cardsEl.scrollWidth - wrapper.offsetWidth);

    const updateFadeEdges = () => {
      const max = getMaxScroll();
      wrapper.classList.toggle("wvs-fade-left", scrollPos > 5);
      wrapper.classList.toggle("wvs-fade-right", scrollPos < max - 5);
    };

    let arrowL, arrowR;

    const updateArrows = () => {
      const max = getMaxScroll();
      if (arrowL) arrowL.classList.toggle("wvs-arrow--visible", scrollPos > 0);
      if (arrowR) arrowR.classList.toggle("wvs-arrow--visible", scrollPos < max - 1);
      updateFadeEdges();
    };

    const snapToCard = (pos) => {
      const cardW = getCardWidth();
      return Math.round(pos / cardW) * cardW;
    };

    const scrollTo = (pos, snap) => {
      const max = getMaxScroll();
      let target = Math.max(0, Math.min(pos, max));
      if (snap) target = Math.min(snapToCard(target), max);
      scrollPos = target;
      cardsEl.style.transform = `translateX(-${scrollPos}px)`;
      updateArrows();
    };

    // Arrows
    if (CONFIG.showArrows) {
      arrowL = document.createElement("button");
      arrowL.className = "wvs-arrow wvs-arrow--left";
      arrowL.setAttribute("aria-label", "Précédent");
      arrowL.innerHTML = ICONS.arrowLeft;

      arrowR = document.createElement("button");
      arrowR.className = "wvs-arrow wvs-arrow--right";
      arrowR.setAttribute("aria-label", "Suivant");
      arrowR.innerHTML = ICONS.arrowRight;

      arrowL.addEventListener("click", (e) => {
        e.stopPropagation();
        scrollTo(scrollPos - getCardWidth() * getScrollStep(), true);
      });

      arrowR.addEventListener("click", (e) => {
        e.stopPropagation();
        scrollTo(scrollPos + getCardWidth() * getScrollStep(), true);
      });

      wrapper.appendChild(arrowL);
      wrapper.appendChild(arrowR);
    }

    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(wrapper);
    requestAnimationFrame(updateArrows);

    /* ─── POINTER DRAG + MOMENTUM + RUBBER-BAND ─── */
    let pointerStartX = 0;
    let pointerStartScroll = 0;
    let isDragging = false;
    let hasDragged = false;
    let lastMoveX = 0;
    let lastMoveTime = 0;
    let velocity = 0;

    const onPointerDown = (e) => {
      if (e.type === "mousedown" && e.button !== 0) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      pointerStartX = x;
      lastMoveX = x;
      lastMoveTime = Date.now();
      velocity = 0;
      pointerStartScroll = scrollPos;
      isDragging = true;
      hasDragged = false;
      cardsEl.classList.add("wvs-dragging");
      cardsEl.classList.remove("wvs-momentum");
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const dx = pointerStartX - x;
      const now = Date.now();

      // Track velocity
      const dt = now - lastMoveTime;
      if (dt > 0) {
        velocity = (lastMoveX - x) / dt; // px/ms
      }
      lastMoveX = x;
      lastMoveTime = now;

      if (Math.abs(dx) > CONFIG.dragThreshold) {
        hasDragged = true;
      }

      const max = getMaxScroll();
      let newPos = pointerStartScroll + dx;

      // Rubber-band effect at boundaries
      if (newPos < 0) {
        newPos = newPos * CONFIG.rubberBandFactor;
      } else if (newPos > max) {
        newPos = max + (newPos - max) * CONFIG.rubberBandFactor;
      }

      cardsEl.style.transform = `translateX(-${newPos}px)`;
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      cardsEl.classList.remove("wvs-dragging");

      const x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const dx = pointerStartX - x;
      let targetPos = pointerStartScroll + dx;

      const max = getMaxScroll();

      // If rubber-banded past boundaries, snap back
      if (targetPos < 0 || targetPos > max) {
        cardsEl.classList.add("wvs-momentum");
        scrollTo(Math.max(0, Math.min(targetPos, max)), true);
        setTimeout(() => cardsEl.classList.remove("wvs-momentum"), 600);
        return;
      }

      // Apply momentum
      if (!prefersReducedMotion && Math.abs(velocity) > 0.3) {
        const momentumDistance = velocity * 300 * CONFIG.momentumMultiplier;
        targetPos += momentumDistance;
        cardsEl.classList.add("wvs-momentum");
        scrollTo(targetPos, true);
        setTimeout(() => cardsEl.classList.remove("wvs-momentum"), 600);
      } else {
        scrollTo(targetPos, true);
      }
    };

    // Touch events
    cardsEl.addEventListener("touchstart", onPointerDown, { passive: true });
    cardsEl.addEventListener("touchmove", onPointerMove, { passive: true });
    cardsEl.addEventListener("touchend", onPointerUp, { passive: true });

    // Mouse drag
    cardsEl.addEventListener("mousedown", onPointerDown);
    document.addEventListener("mousemove", onPointerMove);
    document.addEventListener("mouseup", onPointerUp);
    cardsEl.addEventListener("dragstart", (e) => e.preventDefault());

    // Click → lightbox (only if no drag)
    cardsEl.addEventListener("click", (e) => {
      if (hasDragged) { e.preventDefault(); e.stopPropagation(); return; }
      const item = e.target.closest(".wvs-card-item");
      if (!item || !CONFIG.lightbox) return;
      const idx = parseInt(item.dataset.index, 10);
      openLightbox(stories, idx);
    });

    // Auto scroll
    if (CONFIG.autoScroll && !prefersReducedMotion) {
      const autoStep = () => {
        const max = getMaxScroll();
        if (scrollPos >= max - 1) {
          scrollTo(0, false);
        } else {
          scrollTo(scrollPos + getCardWidth(), true);
        }
      };
      let autoTimer = setInterval(autoStep, CONFIG.autoScrollInterval);
      wrapper.addEventListener("mouseenter", () => clearInterval(autoTimer));
      wrapper.addEventListener("mouseleave", () => {
        autoTimer = setInterval(autoStep, CONFIG.autoScrollInterval);
      });
    }

    container.appendChild(wrapper);
  }

  /* ─── LIGHTBOX ─── */
  let lightboxEl = null;
  let lightboxVideo = null;
  let currentStories = [];
  let currentIdx = 0;
  let isMuted = true;
  let progressRAF = null;
  let isProgressRunning = false;

  function createLightbox() {
    if (lightboxEl) return;

    lightboxEl = document.createElement("div");
    lightboxEl.className = "wvs-lightbox";
    lightboxEl.setAttribute("role", "dialog");
    lightboxEl.setAttribute("aria-modal", "true");
    lightboxEl.setAttribute("aria-label", "Lecteur vidéo");
    lightboxEl.innerHTML = `
      <div class="wvs-lightbox-inner">
        <video class="wvs-lightbox-video" playsinline></video>
        <div class="wvs-lightbox-tapzone"></div>
        <div class="wvs-lightbox-header">
          <div class="wvs-lightbox-header-left">
            <span class="wvs-lightbox-title"></span>
            <span class="wvs-lightbox-counter"></span>
          </div>
          <button class="wvs-lightbox-close" aria-label="Fermer">${ICONS.close}</button>
        </div>
        <div class="wvs-lightbox-controls">
          <div class="wvs-lightbox-progress-bar" role="slider" aria-label="Progression vidéo">
            <div class="wvs-lightbox-progress-track">
              <div class="wvs-lightbox-progress-fill"></div>
            </div>
          </div>
          <div class="wvs-lightbox-bottom-row">
            <div class="wvs-lightbox-btn-group">
              <button class="wvs-lightbox-btn wvs-lb-playpause" aria-label="Lecture / Pause">${ICONS.pause}</button>
              <button class="wvs-lightbox-btn wvs-lb-mute" aria-label="Activer / Couper le son">${ICONS.volumeOff}</button>
            </div>
            <span class="wvs-lightbox-time">0:00 / 0:00</span>
          </div>
        </div>
        <button class="wvs-lightbox-nav wvs-lightbox-nav--prev" aria-label="Vidéo précédente">${ICONS.arrowLeft}</button>
        <button class="wvs-lightbox-nav wvs-lightbox-nav--next" aria-label="Vidéo suivante">${ICONS.arrowRight}</button>
      </div>
    `;

    document.body.appendChild(lightboxEl);

    lightboxVideo = lightboxEl.querySelector(".wvs-lightbox-video");
    const closeBtn = lightboxEl.querySelector(".wvs-lightbox-close");
    const playPauseBtn = lightboxEl.querySelector(".wvs-lb-playpause");
    const muteBtn = lightboxEl.querySelector(".wvs-lb-mute");
    const prevBtn = lightboxEl.querySelector(".wvs-lightbox-nav--prev");
    const nextBtn = lightboxEl.querySelector(".wvs-lightbox-nav--next");
    const progressBar = lightboxEl.querySelector(".wvs-lightbox-progress-bar");
    const tapZone = lightboxEl.querySelector(".wvs-lightbox-tapzone");

    // Close via backdrop or button
    closeBtn.addEventListener("click", closeLightbox);
    lightboxEl.addEventListener("click", (e) => {
      if (e.target === lightboxEl) closeLightbox();
    });

    // Tap-to-play/pause (mobile — tap on video area)
    tapZone.addEventListener("click", () => {
      togglePlayPause();
    });

    // Play/Pause button
    playPauseBtn.addEventListener("click", togglePlayPause);

    function togglePlayPause() {
      if (lightboxVideo.paused) {
        lightboxVideo.play();
        playPauseBtn.innerHTML = ICONS.pause;
        playPauseBtn.setAttribute("aria-label", "Pause");
      } else {
        lightboxVideo.pause();
        playPauseBtn.innerHTML = ICONS.playFill;
        playPauseBtn.setAttribute("aria-label", "Lecture");
      }
    }

    // Mute
    muteBtn.addEventListener("click", () => {
      isMuted = !isMuted;
      lightboxVideo.muted = isMuted;
      muteBtn.innerHTML = isMuted ? ICONS.volumeOff : ICONS.volumeOn;
      muteBtn.setAttribute("aria-label", isMuted ? "Activer le son" : "Couper le son");
    });

    // Navigation
    prevBtn.addEventListener("click", () => navigateLightbox(-1));
    nextBtn.addEventListener("click", () => navigateLightbox(1));

    // Progress bar seek
    progressBar.addEventListener("click", (e) => {
      const track = progressBar.querySelector(".wvs-lightbox-progress-track");
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      if (lightboxVideo.duration) {
        lightboxVideo.currentTime = pct * lightboxVideo.duration;
      }
    });

    // Auto next
    lightboxVideo.addEventListener("ended", () => {
      if (currentIdx < currentStories.length - 1) navigateLightbox(1);
    });

    // Keyboard
    const keydownHandler = (e) => {
      if (!lightboxEl.classList.contains("wvs-lightbox--open")) return;
      if (e.key === "Escape") { closeLightbox(); return; }
      if (e.key === "ArrowLeft") { navigateLightbox(-1); return; }
      if (e.key === "ArrowRight") { navigateLightbox(1); return; }
      if (e.key === " ") { e.preventDefault(); togglePlayPause(); }
    };
    document.addEventListener("keydown", keydownHandler);

    // Swipe in lightbox
    let lbTouchX = 0;
    let lbTouchY = 0;
    const inner = lightboxEl.querySelector(".wvs-lightbox-inner");
    inner.addEventListener("touchstart", (e) => {
      lbTouchX = e.touches[0].clientX;
      lbTouchY = e.touches[0].clientY;
    }, { passive: true });
    inner.addEventListener("touchend", (e) => {
      const dx = lbTouchX - e.changedTouches[0].clientX;
      const dy = lbTouchY - e.changedTouches[0].clientY;
      if (Math.abs(dx) > CONFIG.swipeThreshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
        navigateLightbox(dx > 0 ? 1 : -1);
      }
    }, { passive: true });
  }

  function openLightbox(stories, idx) {
    createLightbox();
    currentStories = stories;
    currentIdx = idx;
    loadLightboxVideo(idx);
    lightboxEl.classList.add("wvs-lightbox--open");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      lightboxEl.querySelector(".wvs-lightbox-close").focus();
    });
  }

  function closeLightbox() {
    if (!lightboxEl) return;
    lightboxEl.classList.remove("wvs-lightbox--open");
    document.body.style.overflow = "";
    lightboxVideo.pause();
    lightboxVideo.removeAttribute("src");
    lightboxVideo.load();
    stopProgress();
  }

  function startProgress() {
    const fill = lightboxEl.querySelector(".wvs-lightbox-progress-fill");
    const timeEl = lightboxEl.querySelector(".wvs-lightbox-time");
    stopProgress();
    isProgressRunning = true;
    const tick = () => {
      if (!isProgressRunning) return;
      if (lightboxVideo.duration) {
        const pct = (lightboxVideo.currentTime / lightboxVideo.duration) * 100;
        fill.style.width = pct + "%";
        timeEl.textContent = formatTime(lightboxVideo.currentTime) + " / " + formatTime(lightboxVideo.duration);
      }
      progressRAF = requestAnimationFrame(tick);
    };
    tick();
  }

  function stopProgress() {
    isProgressRunning = false;
    cancelAnimationFrame(progressRAF);
    progressRAF = null;
  }

  function loadLightboxVideo(idx) {
    const story = currentStories[idx];
    if (!story) return;

    stopProgress();
    currentIdx = idx;

    lightboxVideo.poster = story.poster;
    lightboxVideo.src = story.video;
    lightboxVideo.muted = isMuted;
    lightboxVideo.play().catch(() => {});

    lightboxEl.querySelector(".wvs-lightbox-title").textContent = story.title;
    lightboxEl.querySelector(".wvs-lightbox-counter").textContent =
      (idx + 1) + " / " + currentStories.length;
    lightboxEl.querySelector(".wvs-lb-playpause").innerHTML = ICONS.pause;
    lightboxEl.querySelector(".wvs-lb-mute").innerHTML = isMuted ? ICONS.volumeOff : ICONS.volumeOn;

    lightboxEl.querySelector(".wvs-lightbox-nav--prev")
      .classList.toggle("wvs-lightbox-nav--visible", idx > 0);
    lightboxEl.querySelector(".wvs-lightbox-nav--next")
      .classList.toggle("wvs-lightbox-nav--visible", idx < currentStories.length - 1);

    lightboxEl.querySelector(".wvs-lightbox-time").textContent = "0:00 / 0:00";
    lightboxEl.querySelector(".wvs-lightbox-progress-fill").style.width = "0%";

    startProgress();
  }

  function navigateLightbox(dir) {
    const next = currentIdx + dir;
    if (next < 0 || next >= currentStories.length) return;
    loadLightboxVideo(next);
  }

  /* ─── INIT ─── */
  function init() {
    injectStyles();
    document.querySelectorAll("[data-wp-video-shorts]").forEach(buildCarousel);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
