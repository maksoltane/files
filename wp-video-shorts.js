/**
 * WP Video Shorts — Carousel Slider + Lightbox Stories-style
 * ===========================================================
 * Mobile-first, responsive, performant
 *
 * FONCTIONNALITÉS CAROUSEL :
 * - Mobile-first CSS (base = mobile, min-width = scale up)
 * - Carousel horizontal avec inertie/momentum physique
 * - Snap magnétique sur les cartes
 * - Rubber-band aux bornes du carousel
 * - Cartes fluides (clamp) — pas de px fixe
 * - Thumbnail image + vidéo preview au hover (desktop)
 * - Lazy loading IntersectionObserver (horizontal)
 * - touch-action: pan-y sur le carousel
 * - prefers-reduced-motion respecté
 * - Accessibilité : focus visible, aria, rôles
 *
 * FONCTIONNALITÉS PLAYER (identique WP Video Stories) :
 * - Lightbox plein écran avec slider horizontal scroll-snap
 * - Wrapper aspect-ratio 9/16 avec border-radius + scale animation
 * - Backdrop blur sur fond lightbox
 * - Barre de progression multi-segments en haut
 * - Header avec thumbnail + titre + compteur + bouton fermer
 * - Contrôles latéraux droite (play/pause, mute)
 * - Zones tap gauche/droite pour navigation
 * - Play indicator overlay animé au centre
 * - Swipe down pour fermer
 * - Long press pour pause (Instagram-style)
 * - Spinner chargement + error state avec retry
 * - Auto-avance en fin de vidéo
 * - Page Visibility API (pause quand onglet masqué)
 * - Safe-area-inset pour iPhone notch/Dynamic Island
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
    // Carousel
    gap: 12,
    gapDesktop: 20,
    scrollStepMobile: 1,
    scrollStepDesktop: 3,
    hoverDelay: 200,
    autoScroll: false,
    autoScrollInterval: 4000,
    borderRadius: 14,
    showArrows: true,
    showTitle: true,
    titlePosition: "inside",
    lightbox: true,
    dragThreshold: 8,
    momentumMultiplier: 0.8,
    rubberBandFactor: 0.35,
    // Player (stories-style)
    autoplay: true,
    muted: true,
    autoAdvance: true,
    autoAdvanceMs: 15000,
    showProgress: true,
    swipeThreshold: 80,
  };

  /* ─── DETECT ─── */
  const prefersReducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouchDevice = () => window.matchMedia("(pointer: coarse)").matches;

  /* ─── SVG ICONS ─── */
  const ICONS = {
    play: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    pause: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
    mute: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
    unmute: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
    close: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    cardPlay: `<svg viewBox="0 0 24 24" fill="white" class="wvs-card-play-icon"><path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/></svg>`,
    arrowLeft: `<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`,
    arrowRight: `<svg viewBox="0 0 24 24"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>`,
  };

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
    .wvs-lb-close:focus-visible,
    .wvs-lb-side-btn:focus-visible {
      outline: 2px solid #7c6cff;
      outline-offset: 2px;
    }


    /* ══════════════════════════════════════════
       LIGHTBOX — Stories-style player
       ══════════════════════════════════════════ */

    .wvs-lightbox {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.72);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity .25s ease;
    }
    .wvs-lightbox.wvs-lb-open {
      opacity: 1;
      pointer-events: auto;
    }

    /* Wrapper slider (aspect-ratio 9/16) */
    .wvs-lb-wrapper {
      position: relative;
      width: 88vw;
      max-width: calc(85svh * 9 / 16);
      max-width: calc(85vh  * 9 / 16);
      aspect-ratio: 9/16;
      background: #000;
      overflow: hidden;
      border-radius: 16px;
      box-shadow: 0 16px 48px rgba(0,0,0,.7);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transform: scale(0.18);
      opacity: 0;
      transition: transform .4s cubic-bezier(.34,1.4,.64,1), opacity .22s ease;
    }
    .wvs-lightbox.wvs-lb-open .wvs-lb-wrapper {
      transform: scale(1);
      opacity: 1;
    }

    /* Track (scroll-snap) */
    .wvs-lb-track {
      position: absolute;
      inset: 0;
      display: flex;
      overflow-x: scroll;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
      touch-action: pan-x;
    }
    .wvs-lb-track::-webkit-scrollbar { display: none; }

    /* Slide */
    .wvs-lb-slide {
      position: relative;
      flex: 0 0 100%;
      width: 100%;
      height: 100%;
      scroll-snap-align: start;
      scroll-snap-stop: always;
      overflow: hidden;
      cursor: pointer;
    }

    .wvs-lb-video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Overlay gradient */
    .wvs-lb-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(0,0,0,.25) 0%,
        transparent 30%,
        transparent 55%,
        rgba(0,0,0,.75) 100%
      );
      pointer-events: none;
    }

    /* Caption */
    .wvs-lb-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 14px 14px 28px;
      color: #fff;
      pointer-events: none;
    }
    .wvs-lb-caption {
      font-size: 13px;
      line-height: 1.45;
      text-shadow: 0 1px 5px rgba(0,0,0,.55);
      margin: 0;
    }

    /* Play indicator (centre) */
    .wvs-lb-play-indicator {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%,-50%) scale(0);
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(0,0,0,.5);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      opacity: 0;
      transition: transform .12s, opacity .25s;
      z-index: 5;
    }
    .wvs-lb-play-indicator svg { width: 26px; height: 26px; }
    .wvs-lb-play-indicator.wvs-lb-show {
      transform: translate(-50%,-50%) scale(1);
      opacity: 1;
    }

    /* Shadow top */
    .wvs-lb-shadow {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 100px;
      background: linear-gradient(to bottom, rgba(0,0,0,.6) 0%, transparent 100%);
      pointer-events: none;
      z-index: 9;
    }

    /* Progress bar (multi-segments, top) */
    .wvs-lb-progress {
      position: absolute;
      top: 10px; left: 10px; right: 10px;
      display: flex; gap: 3px;
      z-index: 15; pointer-events: auto;
    }
    .wvs-lb-progress-seg { flex: 1; height: 2px; background: rgba(255,255,255,.3); border-radius: 2px; position: relative; cursor: pointer; }
    .wvs-lb-progress-seg::before { content: ''; position: absolute; inset: -6px 0; }
    .wvs-lb-progress-fill { height: 100%; width: 0%; background: #fff; border-radius: 2px; }

    /* Header */
    .wvs-lb-header {
      position: absolute;
      top: 22px; left: 0; right: 0;
      z-index: 15;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      pointer-events: none;
    }
    .wvs-lb-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      pointer-events: none;
    }
    .wvs-lb-header-thumb {
      width: 32px; height: 32px;
      border-radius: 50%;
      overflow: hidden;
      border: 1.5px solid rgba(255,255,255,.55);
      flex-shrink: 0;
      background: #444;
    }
    .wvs-lb-header-thumb img {
      width: 100%; height: 100%; object-fit: cover; display: block;
    }
    .wvs-lb-header-name {
      font-size: 12px; font-weight: 700;
      color: #fff;
      text-shadow: 0 1px 4px rgba(0,0,0,.65);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .wvs-lb-header-count {
      font-size: 11px;
      font-weight: 400;
      color: rgba(255,255,255,.55);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .wvs-lb-header-right { pointer-events: auto; }

    /* Close button */
    .wvs-lb-close {
      width: 34px; height: 34px;
      border-radius: 50%; border: none;
      background: rgba(0,0,0,.4);
      color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    }

    /* Side controls (right) */
    .wvs-lb-side-controls {
      position: absolute;
      right: 8px; top: 50%; transform: translateY(-50%);
      z-index: 15;
      display: flex; flex-direction: column; gap: 10px;
    }
    .wvs-lb-side-btn {
      width: 34px; height: 34px;
      border-radius: 50%; border: none;
      background: rgba(0,0,0,.45);
      color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    }

    /* Tap navigation zones */
    .wvs-lb-nav-prev,
    .wvs-lb-nav-next {
      position: absolute;
      top: 0; bottom: 0;
      width: 35%;
      z-index: 5;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .wvs-lb-nav-prev { left: 0; }
    .wvs-lb-nav-next { right: 0; }

    /* Spinner */
    .wvs-lb-spinner {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 36px; height: 36px;
      border: 3px solid rgba(255,255,255,.2);
      border-top-color: #fff;
      border-radius: 50%;
      animation: wvsLbSpin .75s linear infinite;
      z-index: 6;
      pointer-events: none;
      opacity: 0;
      transition: opacity .2s;
    }
    .wvs-lb-slide.wvs-lb-loading .wvs-lb-spinner { opacity: 1; }
    @keyframes wvsLbSpin { to { transform: translate(-50%, -50%) rotate(360deg); } }

    /* Error state */
    .wvs-lb-error-overlay {
      position: absolute;
      inset: 0;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: rgba(0,0,0,.78);
      color: #fff;
      z-index: 7;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      text-align: center;
      padding: 20px;
    }
    .wvs-lb-slide.wvs-lb-error .wvs-lb-error-overlay { display: flex; }
    .wvs-lb-error-msg { font-size: 13px; opacity: .7; line-height: 1.4; margin: 0; }
    .wvs-lb-error-retry {
      margin-top: 4px;
      padding: 7px 18px !important;
      border: 1.5px solid rgba(255,255,255,.55) !important;
      border-radius: 20px !important;
      background: transparent !important;
      color: #fff !important;
      font-size: 13px !important;
      cursor: pointer;
      font-family: inherit !important;
      box-sizing: border-box !important;
      -webkit-appearance: none !important;
      appearance: none !important;
      text-transform: none !important;
      letter-spacing: 0 !important;
      line-height: 1.4 !important;
    }
    .wvs-lb-error-retry:hover { background: rgba(255,255,255,.15) !important; }

    /* WordPress theme resets */
    .wvs-lb-close,
    .wvs-lb-side-btn {
      box-sizing: border-box !important;
      line-height: 1 !important;
      text-transform: none !important;
      letter-spacing: 0 !important;
      font-size: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      color: #fff !important;
      width: 34px !important;
      height: 34px !important;
      background: rgba(0,0,0,.45) !important;
      border: none !important;
      outline: none !important;
      -webkit-appearance: none !important;
      appearance: none !important;
    }
    .wvs-lb-close svg,
    .wvs-lb-side-btn svg {
      display: block !important;
      width: 16px !important;
      height: 16px !important;
      min-width: 16px !important;
      min-height: 16px !important;
      max-width: 16px !important;
      max-height: 16px !important;
      pointer-events: none !important;
      fill: currentColor;
    }
    .wvs-lb-play-indicator svg {
      display: block !important;
      width: 26px !important;
      height: 26px !important;
      pointer-events: none !important;
      fill: currentColor;
    }


    /* ══ Reduced motion ══ */
    @media (prefers-reduced-motion: reduce) {
      .wvs-cards,
      .wvs-card-item,
      .wvs-card-play,
      .wvs-card-thumb-wrap img,
      .wvs-card-thumb-wrap video,
      .wvs-arrow {
        transition: none !important;
        animation: none !important;
      }
      .wvs-cards { opacity: 1; }
      .wvs-card-thumb-wrap::before { animation: none; }
      .wvs-lb-wrapper { transition: opacity .15s ease; }
      .wvs-lightbox { transition: opacity .15s ease; }
      .wvs-lb-spinner { animation: none; border-color: rgba(255,255,255,.4); border-top-color: #fff; }
    }


    /* ══ SM — 640px+ ══ */
    @media (min-width: 640px) {
      .wvs-cards { gap: 16px; }
      .wvs-card-item { flex: 0 0 clamp(160px, 28vw, 200px); }
      .wvs-card-title { font-size: 13px; padding: 12px 12px; }
      .wvs-card-play { width: 48px; height: 48px; }
      .wvs-card-play-icon { width: 22px; height: 22px; }
      .wvs-carousel-wrapper::before,
      .wvs-carousel-wrapper::after { width: 30px; }

      .wvs-lightbox { padding: 20px; }
      .wvs-lb-wrapper {
        width: calc(85svh * 9 / 16);
        width: calc(85vh  * 9 / 16);
        max-width: 360px;
        border-radius: 20px;
      }
      .wvs-lb-caption { font-size: 13px; }
    }


    /* ══ MD — 768px+ ══ */
    @media (min-width: 768px) {
      .wvs-carousel-wrapper { padding: 10px 0; }
      .wvs-cards { gap: ${CONFIG.gapDesktop}px; }
      .wvs-card-item { flex: 0 0 clamp(180px, 20vw, 220px); }
      .wvs-card-title { font-size: 14px; padding: 12px 14px; }

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

      .wvs-card-play-blur {
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        background: rgba(0, 0, 0, 0.4);
      }

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
    }


    /* ══ LG — 1024px+ ══ */
    @media (min-width: 1024px) {
      .wvs-card-item { flex: 0 0 clamp(200px, 16vw, 240px); }
      .wvs-card-play { width: 52px; height: 52px; }
      .wvs-card-play-icon { width: 24px; height: 24px; }
      .wvs-arrow { width: 44px; height: 44px; }
      .wvs-arrow svg { width: 22px; height: 22px; }

      .wvs-lb-wrapper {
        max-width: 420px;
        border-radius: 24px;
        box-shadow: 0 24px 70px rgba(0,0,0,.7);
      }
    }


    /* ══ XL — 1440px+ ══ */
    @media (min-width: 1440px) {
      .wvs-card-item { flex: 0 0 260px; }
      .wvs-cards { gap: 24px; }
    }


    /* ══ WordPress admin bar ══ */
    .admin-bar .wvs-lightbox { top: 32px; }
    @media screen and (max-width: 782px) {
      .admin-bar .wvs-lightbox { top: 46px; }
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

  /* ─── UTILS ─── */
  function getScrollStep() {
    return isTouchDevice() ? CONFIG.scrollStepMobile : CONFIG.scrollStepDesktop;
  }


  /* ═══════════════════════════════════════════
     CAROUSEL (inchangé)
  ═══════════════════════════════════════════ */
  function buildCarousel(container) {
    const cards = container.querySelectorAll(".wvs-card");
    if (!cards.length) return;

    const stories = Array.from(cards).map((card) => ({
      video: card.dataset.video || "",
      poster: card.dataset.poster || "",
      title: card.dataset.title || "",
    }));

    container.innerHTML = "";

    const bgColor = getComputedStyle(container.parentElement).backgroundColor;

    const wrapper = document.createElement("div");
    wrapper.className = "wvs-carousel-wrapper";
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", "Carousel vidéo");
    if (bgColor && bgColor !== "rgba(0, 0, 0, 0)") {
      wrapper.style.setProperty("--wvs-bg", bgColor);
    }

    const cardsEl = document.createElement("div");
    cardsEl.className = "wvs-cards";
    cardsEl.setAttribute("role", "list");

    let scrollPos = 0;

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
    }, { rootMargin: "0px 200px 0px 0px" });

    stories.forEach((story, idx) => {
      const item = document.createElement("div");
      item.className = "wvs-card-item";
      item.setAttribute("data-index", idx);
      item.setAttribute("role", "listitem");
      item.setAttribute("tabindex", "0");
      item.setAttribute("aria-label", story.title || `Vidéo ${idx + 1}`);

      const thumbWrap = document.createElement("div");
      thumbWrap.className = "wvs-card-thumb-wrap";

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

      const backdrop = document.createElement("div");
      backdrop.className = "wvs-card-backdrop";
      thumbWrap.appendChild(backdrop);

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

      const playBtn = document.createElement("div");
      playBtn.className = "wvs-card-play";
      playBtn.innerHTML = `<div class="wvs-card-play-blur">${ICONS.cardPlay}</div>`;
      thumbWrap.appendChild(playBtn);

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

      const dt = now - lastMoveTime;
      if (dt > 0) {
        velocity = (lastMoveX - x) / dt;
      }
      lastMoveX = x;
      lastMoveTime = now;

      if (Math.abs(dx) > CONFIG.dragThreshold) {
        hasDragged = true;
      }

      const max = getMaxScroll();
      let newPos = pointerStartScroll + dx;

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

      if (targetPos < 0 || targetPos > max) {
        cardsEl.classList.add("wvs-momentum");
        scrollTo(Math.max(0, Math.min(targetPos, max)), true);
        setTimeout(() => cardsEl.classList.remove("wvs-momentum"), 600);
        return;
      }

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

    cardsEl.addEventListener("touchstart", onPointerDown, { passive: true });
    cardsEl.addEventListener("touchmove", onPointerMove, { passive: true });
    cardsEl.addEventListener("touchend", onPointerUp, { passive: true });

    cardsEl.addEventListener("mousedown", onPointerDown);
    document.addEventListener("mousemove", onPointerMove);
    document.addEventListener("mouseup", onPointerUp);
    cardsEl.addEventListener("dragstart", (e) => e.preventDefault());

    cardsEl.addEventListener("click", (e) => {
      if (hasDragged) { e.preventDefault(); e.stopPropagation(); return; }
      const item = e.target.closest(".wvs-card-item");
      if (!item || !CONFIG.lightbox) return;
      const idx = parseInt(item.dataset.index, 10);
      openLightbox(stories, idx);
    });

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


  /* ═══════════════════════════════════════════
     LIGHTBOX — Stories-style player
  ═══════════════════════════════════════════ */
  let lightboxEl = null;
  let currentStories = [];
  let currentIdx = 0;
  let isMuted = CONFIG.muted;
  let autoTimer = null;
  let progCleanup = null;
  let lightboxOpen = false;
  let programmaticScroll = false;
  let swiping = false;
  let focusBefore = null;

  // DOM refs (set once in buildLightbox)
  let lbTrack = null;
  let lbProgress = null;
  let lbWrapper = null;
  let lbHeaderThumb = null;
  let lbHeaderName = null;
  let lbHeaderCount = null;
  let lbPlayBtn = null;
  let lbMuteBtn = null;

  function buildLightbox() {
    if (lightboxEl) return;

    /* Overlay */
    lightboxEl = document.createElement("div");
    lightboxEl.className = "wvs-lightbox";
    lightboxEl.setAttribute("role", "dialog");
    lightboxEl.setAttribute("aria-modal", "true");

    lightboxEl.addEventListener("click", (e) => {
      if (e.target === lightboxEl) closeLightbox();
    });

    /* Wrapper */
    lbWrapper = document.createElement("div");
    lbWrapper.className = "wvs-lb-wrapper";

    /* Track */
    lbTrack = document.createElement("div");
    lbTrack.className = "wvs-lb-track";
    lbWrapper.appendChild(lbTrack);

    /* Shadow top */
    const shadow = document.createElement("div");
    shadow.className = "wvs-lb-shadow";
    lbWrapper.appendChild(shadow);

    /* Progress bar */
    if (CONFIG.showProgress) {
      lbProgress = document.createElement("div");
      lbProgress.className = "wvs-lb-progress";
      lbWrapper.appendChild(lbProgress);
    }

    /* Header */
    const header = document.createElement("div");
    header.className = "wvs-lb-header";

    const headerLeft = document.createElement("div");
    headerLeft.className = "wvs-lb-header-left";

    lbHeaderThumb = document.createElement("div");
    lbHeaderThumb.className = "wvs-lb-header-thumb";
    const thumbImg = document.createElement("img");
    thumbImg.src = "";
    thumbImg.alt = "";
    lbHeaderThumb.appendChild(thumbImg);
    headerLeft.appendChild(lbHeaderThumb);

    lbHeaderName = document.createElement("span");
    lbHeaderName.className = "wvs-lb-header-name";
    headerLeft.appendChild(lbHeaderName);

    lbHeaderCount = document.createElement("span");
    lbHeaderCount.className = "wvs-lb-header-count";
    headerLeft.appendChild(lbHeaderCount);

    header.appendChild(headerLeft);

    const headerRight = document.createElement("div");
    headerRight.className = "wvs-lb-header-right";

    const closeBtn = document.createElement("button");
    closeBtn.className = "wvs-lb-close";
    closeBtn.setAttribute("aria-label", "Fermer");
    closeBtn.innerHTML = ICONS.close;
    closeBtn.addEventListener("click", () => closeLightbox());
    headerRight.appendChild(closeBtn);

    header.appendChild(headerRight);
    lbWrapper.appendChild(header);

    /* Side controls */
    const sideControls = document.createElement("div");
    sideControls.className = "wvs-lb-side-controls";

    lbPlayBtn = document.createElement("button");
    lbPlayBtn.className = "wvs-lb-side-btn wvs-lb-play-btn";
    lbPlayBtn.setAttribute("aria-label", "Lecture / Pause");
    lbPlayBtn.innerHTML = ICONS.play;
    sideControls.appendChild(lbPlayBtn);

    lbMuteBtn = document.createElement("button");
    lbMuteBtn.className = "wvs-lb-side-btn wvs-lb-mute-btn";
    lbMuteBtn.setAttribute("aria-label", "Son");
    lbMuteBtn.innerHTML = isMuted ? ICONS.mute : ICONS.unmute;
    sideControls.appendChild(lbMuteBtn);

    lbWrapper.appendChild(sideControls);

    /* Nav tap zones */
    const navPrev = document.createElement("div");
    navPrev.className = "wvs-lb-nav-prev";
    lbWrapper.appendChild(navPrev);

    const navNext = document.createElement("div");
    navNext.className = "wvs-lb-nav-next";
    lbWrapper.appendChild(navNext);

    lightboxEl.appendChild(lbWrapper);
    document.body.appendChild(lightboxEl);

    setupScrollSnap();
    setupLightboxEvents();
  }


  /* ─── SCROLL SNAP ─── */
  function setupScrollSnap() {
    const onSnapDone = () => {
      if (programmaticScroll) return;
      const idx = Math.round(lbTrack.scrollLeft / lbTrack.clientWidth);
      if (idx !== currentIdx) {
        pauseCurrent();
        currentIdx = idx;
        loadVideoSrc(idx);
        loadVideoSrc(idx + 1);
        updateLbUI();
        playStory(idx);
      }
    };

    if ("onscrollend" in window) {
      lbTrack.addEventListener("scrollend", onSnapDone);
    } else {
      let t;
      lbTrack.addEventListener("scroll", () => {
        if (programmaticScroll) return;
        clearTimeout(t);
        t = setTimeout(onSnapDone, 350);
      });
    }
  }


  /* ─── EVENTS ─── */
  function setupLightboxEvents() {
    /* Swipe detection */
    swiping = false;
    lbTrack.addEventListener("touchstart", () => { swiping = false; }, { passive: true });
    lbTrack.addEventListener("touchmove", () => { swiping = true; }, { passive: true });

    /* Mute */
    lbMuteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      isMuted = !isMuted;
      lbMuteBtn.innerHTML = isMuted ? ICONS.mute : ICONS.unmute;
      lbTrack.querySelectorAll(".wvs-lb-video").forEach(v => { v.muted = isMuted; });
    });

    /* Play/Pause button */
    lbPlayBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const video = videoAt(currentIdx);
      if (!video) return;
      const slide = lbTrack.querySelectorAll(".wvs-lb-slide")[currentIdx];
      const pi = slide ? slide.querySelector(".wvs-lb-play-indicator") : null;
      if (video.paused) {
        video.play().catch(() => {});
        if (pi) pi.classList.remove("wvs-lb-show");
        startProgTimer();
        if (CONFIG.autoAdvance) startAutoTimer();
      } else {
        video.pause();
        if (pi) { pi.innerHTML = ICONS.play; pi.classList.add("wvs-lb-show"); }
        clearAutoTimer();
        clearProgTimer();
      }
      lbPlayBtn.innerHTML = video.paused ? ICONS.play : ICONS.pause;
    });

    /* Nav tap zones */
    const navPrev = lightboxEl.querySelector(".wvs-lb-nav-prev");
    const navNext = lightboxEl.querySelector(".wvs-lb-nav-next");
    if (navPrev) navPrev.addEventListener("click", (e) => { e.stopPropagation(); goPrev(); });
    if (navNext) navNext.addEventListener("click", (e) => { e.stopPropagation(); goNext(); });

    /* Tap slide → play/pause */
    lbTrack.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      if (swiping) return;
      const slide = e.target.closest(".wvs-lb-slide");
      if (!slide) return;
      if (parseInt(slide.dataset.index) !== currentIdx) return;

      const video = slide.querySelector(".wvs-lb-video");
      const pi = slide.querySelector(".wvs-lb-play-indicator");
      if (video.paused) {
        video.play().catch(() => {});
        pi.classList.remove("wvs-lb-show");
        startProgTimer();
        if (CONFIG.autoAdvance) startAutoTimer();
      } else {
        video.pause();
        pi.innerHTML = ICONS.play;
        pi.classList.add("wvs-lb-show");
        clearAutoTimer();
        clearProgTimer();
      }
      if (lbPlayBtn) lbPlayBtn.innerHTML = video.paused ? ICONS.play : ICONS.pause;
    });

    /* Long press → pause (Instagram-style) */
    let longPressTimer = null;
    let longPressActive = false;

    lbTrack.addEventListener("touchstart", () => {
      longPressActive = false;
      longPressTimer = setTimeout(() => {
        longPressActive = true;
        pauseCurrent();
      }, 350);
    }, { passive: true });

    lbTrack.addEventListener("touchmove", () => {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }, { passive: true });

    lbTrack.addEventListener("touchend", (e) => {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      if (longPressActive) {
        longPressActive = false;
        e.preventDefault();
        const v = videoAt(currentIdx);
        if (v) {
          v.play().catch(() => {});
          startProgTimer();
          if (CONFIG.autoAdvance) startAutoTimer();
        }
        if (lbPlayBtn) lbPlayBtn.innerHTML = ICONS.pause;
      }
    }, { passive: false });

    /* Progress bar cliquable */
    if (CONFIG.showProgress && lbProgress) {
      lbProgress.addEventListener("click", (e) => {
        e.stopPropagation();
        const seg = e.target.closest(".wvs-lb-progress-seg");
        if (!seg) return;
        const idx = parseInt(seg.dataset.index);
        if (!isNaN(idx)) goTo(idx);
      });
    }

    /* Swipe down → close */
    if (lbWrapper) {
      let swipeStartY = 0;
      let swipeStartX = 0;
      let swipeDownActive = false;

      lbWrapper.addEventListener("touchstart", (e) => {
        swipeStartY = e.touches[0].clientY;
        swipeStartX = e.touches[0].clientX;
        swipeDownActive = false;
      }, { passive: true });

      lbWrapper.addEventListener("touchmove", (e) => {
        const dy = e.touches[0].clientY - swipeStartY;
        const dx = e.touches[0].clientX - swipeStartX;
        if (!swipeDownActive && Math.abs(dy) > Math.abs(dx) && dy > 8) {
          swipeDownActive = true;
        }
        if (swipeDownActive && dy > 0) {
          lbWrapper.style.transform = `scale(1) translateY(${dy}px)`;
          lbWrapper.style.opacity = String(Math.max(0, 1 - dy / 300));
        }
      }, { passive: true });

      lbWrapper.addEventListener("touchend", (e) => {
        if (!swipeDownActive) return;
        const dy = e.changedTouches[0].clientY - swipeStartY;
        swipeDownActive = false;
        if (dy > 100) {
          lbWrapper.style.transform = "";
          lbWrapper.style.opacity = "";
          closeLightbox();
        } else {
          lbWrapper.style.transition = "transform .3s cubic-bezier(.34,1.4,.64,1), opacity .3s";
          lbWrapper.style.transform = "scale(1)";
          lbWrapper.style.opacity = "1";
          setTimeout(() => {
            lbWrapper.style.transition = "";
            lbWrapper.style.transform = "";
            lbWrapper.style.opacity = "";
          }, 320);
        }
      }, { passive: true });
    }

    /* Keyboard */
    document.addEventListener("keydown", (e) => {
      if (!lightboxOpen) return;
      if (e.key === "Escape") { closeLightbox(); return; }
      if (e.key === "ArrowRight") { goNext(); return; }
      if (e.key === "ArrowLeft") { goPrev(); return; }
    });

    /* Page Visibility API */
    document.addEventListener("visibilitychange", () => {
      if (!lightboxOpen) return;
      if (document.hidden) {
        pauseCurrent();
      } else {
        const v = videoAt(currentIdx);
        if (v) v.play().catch(() => {});
      }
    });
  }


  /* ─── BUILD SLIDES ─── */
  function buildSlides(stories) {
    lbTrack.querySelectorAll(".wvs-lb-video").forEach(v => { v.pause(); v.src = ""; });
    lbTrack.innerHTML = "";

    stories.forEach((story, i) => {
      const slide = document.createElement("div");
      slide.className = "wvs-lb-slide";
      slide.dataset.index = i;

      const video = document.createElement("video");
      video.className = "wvs-lb-video";
      video.poster = story.poster;
      video.muted = isMuted;
      video.loop = false;
      video.playsInline = true;
      video.preload = "none";
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      slide.appendChild(video);

      const overlay = document.createElement("div");
      overlay.className = "wvs-lb-overlay";
      slide.appendChild(overlay);

      if (story.title) {
        const info = document.createElement("div");
        info.className = "wvs-lb-info";
        const p = document.createElement("p");
        p.className = "wvs-lb-caption";
        p.textContent = story.title;
        info.appendChild(p);
        slide.appendChild(info);
      }

      const pi = document.createElement("div");
      pi.className = "wvs-lb-play-indicator";
      pi.innerHTML = ICONS.play;
      slide.appendChild(pi);

      const spinner = document.createElement("div");
      spinner.className = "wvs-lb-spinner";
      slide.appendChild(spinner);

      const errorDiv = document.createElement("div");
      errorDiv.className = "wvs-lb-error-overlay";
      const errorMsg = document.createElement("p");
      errorMsg.className = "wvs-lb-error-msg";
      errorMsg.textContent = "Impossible de charger la vidéo";
      errorDiv.appendChild(errorMsg);
      const retryBtn = document.createElement("button");
      retryBtn.className = "wvs-lb-error-retry";
      retryBtn.textContent = "Réessayer";
      retryBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        slide.classList.remove("wvs-lb-error");
        slide.classList.add("wvs-lb-loading");
        video.src = story.video;
        video.load();
        video.play().catch(() => {});
      });
      errorDiv.appendChild(retryBtn);
      slide.appendChild(errorDiv);

      /* Video loading events */
      video.addEventListener("waiting", () => slide.classList.add("wvs-lb-loading"));
      video.addEventListener("playing", () => slide.classList.remove("wvs-lb-loading"));
      video.addEventListener("canplay", () => slide.classList.remove("wvs-lb-loading"));
      video.addEventListener("error", () => {
        slide.classList.remove("wvs-lb-loading");
        slide.classList.add("wvs-lb-error");
        clearAutoTimer();
        clearProgTimer();
      });

      video.addEventListener("ended", () => {
        if (parseInt(slide.dataset.index) === currentIdx) goNext();
      });

      lbTrack.appendChild(slide);
    });

    /* Rebuild progress segments */
    if (CONFIG.showProgress && lbProgress) {
      lbProgress.innerHTML = "";
      stories.forEach((_, i) => {
        const seg = document.createElement("div");
        seg.className = "wvs-lb-progress-seg";
        seg.dataset.index = i;
        const fill = document.createElement("div");
        fill.className = "wvs-lb-progress-fill";
        seg.appendChild(fill);
        lbProgress.appendChild(seg);
      });
    }
  }


  /* ─── OPEN / CLOSE ─── */
  function openLightbox(stories, idx) {
    buildLightbox();

    clearAutoTimer();
    clearProgTimer();

    currentStories = stories;
    buildSlides(stories);
    currentIdx = idx;

    loadVideoSrc(idx);
    loadVideoSrc(idx + 1);

    focusBefore = document.activeElement;
    lightboxOpen = true;
    lightboxEl.classList.add("wvs-lb-open");
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      lbTrack.scrollLeft = lbTrack.clientWidth * idx;
      updateLbUI();
      playStory(idx);
      lightboxEl.querySelector(".wvs-lb-close")?.focus();
    });
  }

  function closeLightbox() {
    if (!lightboxOpen) return;
    pauseCurrent();
    lightboxOpen = false;
    lightboxEl.classList.remove("wvs-lb-open");
    document.body.style.overflow = "";
    if (lbProgress) {
      lbProgress.querySelectorAll(".wvs-lb-progress-fill")
        .forEach(f => { f.style.width = "0%"; });
    }
    focusBefore?.focus();
    focusBefore = null;
  }


  /* ─── LOAD VIDEO SRC ─── */
  function loadVideoSrc(i) {
    if (i < 0 || i >= currentStories.length) return;
    const video = videoAt(i);
    if (video && !video.src) {
      video.src = currentStories[i].video;
      video.preload = "auto";
      video.load();
    }
  }


  /* ─── NAVIGATION ─── */
  function goTo(index) {
    if (index < 0 || index >= currentStories.length) return;
    pauseCurrent();
    currentIdx = index;

    programmaticScroll = true;
    const unlock = () => { programmaticScroll = false; };
    if ("onscrollend" in window) {
      lbTrack.addEventListener("scrollend", unlock, { once: true });
    }
    setTimeout(unlock, 500);

    lbTrack.scrollTo({ left: lbTrack.clientWidth * index, behavior: "smooth" });
    loadVideoSrc(index);
    loadVideoSrc(index + 1);
    updateLbUI();
    playStory(index);
  }

  function goNext() { if (currentIdx + 1 < currentStories.length) goTo(currentIdx + 1); }
  function goPrev() { if (currentIdx - 1 >= 0) goTo(currentIdx - 1); }


  /* ─── PLAY STORY ─── */
  function playStory(index) {
    const video = videoAt(index);
    if (!video) return;

    if (CONFIG.showProgress && lbProgress) {
      const fill = lbProgress.querySelector(`.wvs-lb-progress-seg[data-index="${index}"] .wvs-lb-progress-fill`);
      if (fill) fill.style.width = "0%";
    }

    video.muted = isMuted;
    video.currentTime = 0;

    if (CONFIG.autoplay) {
      const tryPlay = () => {
        video.play().catch((err) => {
          console.warn(`[WVS] play() bloqué (story ${index}) :`, err.name, err.message);
        });
      };
      if (video.readyState >= 3) {
        tryPlay();
      } else {
        video.addEventListener("canplay", tryPlay, { once: true });
      }
    }

    startProgTimer();
    if (CONFIG.autoAdvance) startAutoTimer();
  }


  /* ─── UPDATE UI ─── */
  function updateLbUI() {
    if (CONFIG.showProgress && lbProgress) {
      lbProgress.querySelectorAll(".wvs-lb-progress-seg").forEach((seg) => {
        const i = parseInt(seg.dataset.index);
        const fill = seg.querySelector(".wvs-lb-progress-fill");
        if (i < currentIdx) fill.style.width = "100%";
        else if (i > currentIdx) fill.style.width = "0%";
      });
    }

    if (lbTrack) {
      lbTrack.querySelectorAll(".wvs-lb-play-indicator").forEach(pi => pi.classList.remove("wvs-lb-show"));
    }

    const story = currentStories[currentIdx];
    if (lbHeaderThumb && story) {
      const img = lbHeaderThumb.querySelector("img");
      if (img) img.src = story.poster || "";
    }
    if (lbHeaderName && story) {
      lbHeaderName.textContent = story.title || "";
    }
    if (lbHeaderCount) {
      lbHeaderCount.textContent = currentStories.length > 1
        ? `${currentIdx + 1} / ${currentStories.length}`
        : "";
    }

    if (lbPlayBtn) {
      const v = videoAt(currentIdx);
      lbPlayBtn.innerHTML = (v && !v.paused) ? ICONS.pause : ICONS.play;
    }
  }


  /* ─── TIMERS ─── */
  function startAutoTimer() {
    clearAutoTimer();
    if (!CONFIG.autoAdvance) return;
    autoTimer = setTimeout(() => {
      const v = videoAt(currentIdx);
      if (!v || !v.paused) goNext();
    }, CONFIG.autoAdvanceMs);
  }
  function clearAutoTimer() { clearTimeout(autoTimer); autoTimer = null; }

  function startProgTimer() {
    clearProgTimer();
    if (!CONFIG.showProgress || !lbProgress) return;
    const video = videoAt(currentIdx);
    const seg = lbProgress.querySelector(`.wvs-lb-progress-seg[data-index="${currentIdx}"]`);
    if (!seg || !video) return;
    const fill = seg.querySelector(".wvs-lb-progress-fill");

    const onTime = () => {
      if (!video.duration) return;
      fill.style.width = Math.min((video.currentTime / video.duration) * 100, 100) + "%";
    };
    video.addEventListener("timeupdate", onTime);
    progCleanup = () => video.removeEventListener("timeupdate", onTime);
  }
  function clearProgTimer() {
    if (progCleanup) { progCleanup(); progCleanup = null; }
  }


  /* ─── HELPERS ─── */
  function pauseCurrent() {
    const v = videoAt(currentIdx);
    if (v) v.pause();
    clearAutoTimer();
    clearProgTimer();
  }

  function videoAt(i) {
    return lbTrack ? lbTrack.querySelectorAll(".wvs-lb-video")[i] || null : null;
  }


  /* ═══════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════ */
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
