/**
 * WP Video Stories — Cercles + Lightbox slider
 * =============================================
 * Insertion : via un bloc HTML personnalisé WordPress
 *
 * FONCTIONNALITÉS :
 * - Affichage initial léger : rangée de cercles cliquables (poster + titre)
 * - Clic → lightbox plein écran avec slider horizontal
 * - Vidéos chargées uniquement à l'ouverture (lazy load total)
 * - Navigation manuelle (swipe + zones tap gauche/droite)
 * - Auto-avance en fin de vidéo
 * - Barre de progression calée sur la durée réelle
 * - Bouton mute/unmute + bouton play/pause (contrôles latéraux droite)
 * - Header avec thumbnail + nom de la story + bouton fermer
 * - Fermeture lightbox par bouton X ou touche Escape
 * - Mobile-first responsive
 *
 * UTILISATION — un bloc WordPress par story :
 * <div data-wp-video-stories>
 *   <div class="vs-circle-item">          ← cercle affiché sur la page
 *     <div class="vs-circle-ring">
 *       <div class="vs-circle-inner">
 *         <img class="vs-circle-img" src="thumb.jpg" alt="Titre">
 *       </div>
 *     </div>
 *     <span class="vs-circle-label">Titre</span>
 *   </div>
 *   <!-- une ou plusieurs vidéos pour ce cercle -->
 *   <div class="vs-story-data"
 *     data-video="url.mp4"
 *     data-poster="url.jpg"
 *     data-title="Titre"
 *     data-caption="Texte affiché dans la lightbox">
 *   </div>
 * </div>
 * Le JS fusionne tous les blocs en un seul player.
 */

(function () {
  "use strict";

  console.log("[VS] Script chargé — WP Video Stories");

  /* ─── CONFIGURATION ─── */
  const CONFIG = {
    autoplay      : true,   // Lecture auto à l'ouverture
    muted         : true,   // Muet au démarrage (requis pour autoplay)
    autoAdvance   : true,   // Avancer auto en fin de vidéo
    autoAdvanceMs : 15000,  // Fallback si la vidéo ne se charge pas
    showProgress  : true,   // Barre de progression
  };

  /* ─── ICÔNES SVG ─── */
  const ICONS = {
    play   : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    pause  : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
    mute   : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM11 5L8.43 7.57 11 10.14V5z"/></svg>',
    unmute : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
    close  : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  };

  /* ─── CSS (injecté une seule fois) ─── */
  const CSS = `

    /* ══ CERCLES ══ */

    .vs-circles-wrapper {
      width: 100%;
    }

    .vs-circles {
      display: flex;
      justify-content: center;
      gap: 14px;
      overflow-x: auto;
      overflow-y: visible;
      scrollbar-width: none;
      padding: 28px 28px 24px; /* bas augmenté pour que le label ne soit jamais coupé */
      -webkit-overflow-scrolling: touch;
    }
    .vs-circles::-webkit-scrollbar { display: none; }

    .vs-circle-item {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      gap: 6px !important;
      flex-shrink: 0 !important;
      cursor: pointer !important;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }

    /* Anneau avec animation pulse (effet sonar) */
    .vs-circle-ring {
      width: 144px;
      height: 144px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
      transition: transform .15s;
      animation: vs-ring-pulse 2.4s ease-out infinite;
    }
    .vs-circle-item:active .vs-circle-ring { transform: scale(.92); }

    /* Icône play au centre (triangle CSS) */
    .vs-circle-ring::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 53%;
      transform: translate(-50%, -50%);
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 14px 0 14px 26px;
      border-color: transparent transparent transparent rgba(255,255,255,.95);
      filter: drop-shadow(0 1px 4px rgba(0,0,0,.7));
      z-index: 3;
      pointer-events: none;
    }

    /* Keyframes pulse : box-shadow expand + fade (identique PlayShorts) */
    @keyframes vs-ring-pulse {
      0% {
        box-shadow:
          0 0 0 0 rgba(220, 39, 67, .55),
          0 0 0 0 rgba(188, 24, 136, .38);
      }
      65% {
        box-shadow:
          0 0 0 24px rgba(220, 39, 67, 0),
          0 0 0 14px rgba(188, 24, 136, 0);
      }
      100% {
        box-shadow:
          0 0 0 0 rgba(220, 39, 67, 0),
          0 0 0 0 rgba(188, 24, 136, 0);
      }
    }

    /* État "vu" — gradient gris, pulse stoppé */
    .vs-circle-ring.vs-watched {
      background: rgba(255,255,255,.18) !important;
      animation: none !important;
      box-shadow: none !important;
    }
    .vs-circle-item.vs-watched .vs-circle-label {
      opacity: .45;
    }

    /* Zone image à l'intérieur de l'anneau */
    .vs-circle-inner {
      width: 122px;
      height: 122px;
      border-radius: 50%;
      overflow: hidden;
      background: #333;
      position: relative;
      z-index: 1;
    }
    .vs-circle-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* Titre sous le cercle */
    .vs-circle-label {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      font-size: 18px !important;
      font-weight: 600 !important;
      color: #1a1a1a !important;
      text-shadow: none !important;
      text-align: center !important;
      max-width: 144px !important;
      width: 144px !important;
      height: auto !important;
      min-height: 1em !important;
      max-height: none !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      line-height: 1.4 !important;
      margin: 0 !important;
      margin-top: 8px !important;
      padding: 0 4px !important;
      background: none !important;
      text-decoration: none !important;
      text-transform: none !important;
      letter-spacing: 0 !important;
      position: static !important;
      clip: auto !important;
      clip-path: none !important;
      -webkit-clip-path: none !important;
      pointer-events: none !important;
      flex-shrink: 0 !important;
    }

    /* Renforcement mobile — certains thèmes cachent les spans sur petits écrans */
    @media (max-width: 768px) {
      .vs-circle-label {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        height: auto !important;
        font-size: 13px !important;
        color: #1a1a1a !important;
        overflow: hidden !important;
        clip: auto !important;
        clip-path: none !important;
        -webkit-clip-path: none !important;
      }
      .vs-circle-item.vs-watched .vs-circle-label {
        opacity: .45 !important;
      }
    }


    /* ══ LIGHTBOX ══ */

    .vs-lightbox {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.72);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      z-index: 999999; /* au-dessus de la barre admin WordPress (99999) */
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity .25s ease;
    }
    .vs-lightbox.vs-open {
      opacity: 1;
      pointer-events: auto;
    }


    /* ══ SLIDER (dans la lightbox) ══ */

    .vs-wrapper {
      position: relative;
      width: 88vw;
      max-width: calc(85svh * 9 / 16);
      max-width: calc(85vh  * 9 / 16);  /* fallback */
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
    .vs-lightbox.vs-open .vs-wrapper {
      transform: scale(1);
      opacity: 1;
    }

    /* Position absolue : évite le bug height:100% avec aspect-ratio */
    .vs-track {
      position: absolute;
      inset: 0;
      display: flex;
      overflow-x: scroll;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
      touch-action: pan-x;
    }
    .vs-track::-webkit-scrollbar { display: none; }

    .vs-slide {
      position: relative;
      flex: 0 0 100%;
      width: 100%;
      height: 100%;
      scroll-snap-align: start;
      scroll-snap-stop: always;
      overflow: hidden;
      cursor: pointer;
    }

    .vs-video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .vs-overlay {
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

    .vs-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 14px 14px 28px;
      color: #fff;
      pointer-events: none;
    }
    .vs-caption {
      font-size: 13px;
      line-height: 1.45;
      text-shadow: 0 1px 5px rgba(0,0,0,.55);
      margin: 0;
    }

    /* Indicateur play/pause */
    .vs-play-indicator {
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
    .vs-play-indicator svg { width: 26px; height: 26px; }
    .vs-play-indicator.vs-show {
      transform: translate(-50%,-50%) scale(1);
      opacity: 1;
    }

    /* Ombre haut */
    .vs-player-shadow {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 100px;
      background: linear-gradient(to bottom, rgba(0,0,0,.6) 0%, transparent 100%);
      pointer-events: none;
      z-index: 9;
    }

    /* Barre de progression multi-segments */
    .vs-progress-bar {
      position: absolute;
      top: 10px; left: 10px; right: 10px;
      display: flex; gap: 3px;
      z-index: 15; pointer-events: auto;
    }
    .vs-progress-seg { flex: 1; height: 2px; background: rgba(255,255,255,.3); border-radius: 2px; position: relative; cursor: pointer; }
    .vs-progress-seg::before { content: ''; position: absolute; inset: -6px 0; }
    .vs-progress-fill { height: 100%; width: 0%; background: #fff; border-radius: 2px; }

    /* Header (sous la barre de progression) */
    .vs-player-header {
      position: absolute;
      top: 22px; left: 0; right: 0;
      z-index: 15;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      pointer-events: none;
    }
    .vs-player-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      pointer-events: none;
    }
    .vs-player-header-thumb {
      width: 32px; height: 32px;
      border-radius: 50%;
      overflow: hidden;
      border: 1.5px solid rgba(255,255,255,.55);
      flex-shrink: 0;
      background: #444;
    }
    .vs-player-header-thumb img {
      width: 100%; height: 100%; object-fit: cover; display: block;
    }
    .vs-player-header-name {
      font-size: 12px; font-weight: 700;
      color: #fff;
      text-shadow: 0 1px 4px rgba(0,0,0,.65);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .vs-player-header-right { pointer-events: auto; }

    /* Bouton fermer (dans header) */
    .vs-close-btn {
      width: 34px; height: 34px;
      border-radius: 50%; border: none;
      background: rgba(0,0,0,.4);
      color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    }

    /* Contrôles latéraux droite */
    .vs-side-controls {
      position: absolute;
      right: 8px; top: 50%; transform: translateY(-50%);
      z-index: 15;
      display: flex; flex-direction: column; gap: 10px;
    }
    .vs-side-btn {
      width: 34px; height: 34px;
      border-radius: 50%; border: none;
      background: rgba(0,0,0,.45);
      color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    }

    /* Zones de navigation tap (gauche/droite) */
    .vs-nav-prev,
    .vs-nav-next {
      position: absolute;
      top: 0; bottom: 0;
      width: 35%;
      z-index: 5;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .vs-nav-prev { left: 0; }
    .vs-nav-next { right: 0; }


    /* ══ TABLET 640px ══ */
    @media (min-width: 640px) {
      .vs-lightbox { padding: 20px; }

      .vs-wrapper {
        width: calc(85svh * 9 / 16);
        width: calc(85vh  * 9 / 16);
        max-width: 360px;
        border-radius: 20px;
      }

      .vs-caption { font-size: 13px; }
    }

    /* ══ DESKTOP 1024px ══ */
    @media (min-width: 1024px) {
      .vs-wrapper {
        max-width: 420px;
        border-radius: 24px;
        box-shadow: 0 24px 70px rgba(0,0,0,.7);
      }
    }

    /* ══ RESET THÈME WORDPRESS / FLATSOME ══ */
    /* Neutralise les styles de boutons injectés par le thème */
    .vs-close-btn,
    .vs-side-btn {
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
    /* SVG : taille fixe en pixels pour garantir le padding visible dans le cercle */
    .vs-close-btn svg,
    .vs-side-btn svg {
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
    .vs-play-indicator svg {
      display: block !important;
      width: 26px !important;
      height: 26px !important;
      pointer-events: none !important;
      fill: currentColor;
    }

    /* ══ SPINNER CHARGEMENT ══ */
    .vs-spinner {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 36px; height: 36px;
      border: 3px solid rgba(255,255,255,.2);
      border-top-color: #fff;
      border-radius: 50%;
      animation: vs-spin .75s linear infinite;
      z-index: 6;
      pointer-events: none;
      opacity: 0;
      transition: opacity .2s;
    }
    .vs-slide.vs-loading .vs-spinner { opacity: 1; }
    @keyframes vs-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }

    /* ══ ERROR STATE ══ */
    .vs-error-overlay {
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
    .vs-slide.vs-error-state .vs-error-overlay { display: flex; }
    .vs-error-msg { font-size: 13px; opacity: .7; line-height: 1.4; margin: 0; }
    .vs-error-retry {
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
    .vs-error-retry:hover { background: rgba(255,255,255,.15) !important; }

    /* ══ SHIMMER CERCLES ══ */
    @keyframes vs-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .vs-circle-inner.vs-shimmer {
      background: linear-gradient(90deg, #2a2a2a 25%, #3d3d3d 50%, #2a2a2a 75%);
      background-size: 200% 100%;
      animation: vs-shimmer 1.5s linear infinite;
    }

    /* ══ COMPTEUR STORIES ══ */
    .vs-player-header-count {
      font-size: 11px;
      font-weight: 400;
      color: rgba(255,255,255,.55);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* ══ REDUCED MOTION ══ */
    @media (prefers-reduced-motion: reduce) {
      .vs-circle-ring             { animation: none; box-shadow: none; }
      .vs-wrapper                 { transition: opacity .15s ease; }
      .vs-lightbox                { transition: opacity .15s ease; }
      .vs-circle-inner.vs-shimmer { animation: none; background: #2a2a2a; }
      .vs-spinner                 { animation: none; border-color: rgba(255,255,255,.4); border-top-color: #fff; }
    }

    /* ══ WORDPRESS ADMIN BAR ══ */
    .admin-bar .vs-lightbox { top: 32px; }
    @media screen and (max-width: 782px) {
      .admin-bar .vs-lightbox { top: 46px; }
    }
  `;

  if (!document.getElementById("vs-styles")) {
    const s = document.createElement("style");
    s.id = "vs-styles";
    s.textContent = CSS;
    document.head.appendChild(s);
    console.log("[VS] CSS injecté dans <head>");
  } else {
    console.log("[VS] CSS déjà présent — injection ignorée");
  }


  /* ═══════════════════════════════════════════
     CLASSE PRINCIPALE
  ═══════════════════════════════════════════ */
  class WPVideoStories {
    constructor(container, groups) {
      this.container           = container;
      this.groups              = groups || [];
      this.activeStories       = [];
      this.currentIndex        = 0;
      this.isMuted             = CONFIG.muted;
      this.autoTimer           = null;
      this._progCleanup        = null;
      this._programmaticScroll = false;
      this._swiping            = false;
      this._lightbox           = null;
      this._lightboxOpen       = false;
      this._focusBeforeLightbox = null;
      this._onKeyDown          = null;
      this.track               = null;
      this.progressBar         = null;
      this.headerThumb         = null;
      this.headerName          = null;
      this.playBtn             = null;
      this.muteBtn             = null;
      this._watchedGroups      = new Set();
      this._visibilityHandler  = null;
      this.wrapper             = null;
      this.headerCount         = null;

      this.init();
    }

    init() {
      if (this.groups.length === 0) {
        console.warn("[VS] Aucun groupe trouvé — vérifier les blocs [data-wp-video-stories]");
        return;
      }
      console.log(`[VS] Instance créée — ${this.groups.length} groupe(s) chargé(s)`);
      this.buildCircles();
    }



    /* ══════════════════════════════════════════
       CERCLES D'APERÇU
    ══════════════════════════════════════════ */
    buildCircles() {
      const row = this.container.querySelector(".vs-circles");
      if (!row) return;

      this.groups.forEach((group, i) => {
        const item = group.circleItem;
        if (!item) return;

        /* Shimmer pendant le chargement de l'image */
        const img   = item.querySelector(".vs-circle-img");
        const inner = item.querySelector(".vs-circle-inner");
        if (img && inner && !img.complete) {
          inner.classList.add("vs-shimmer");
          img.addEventListener("load",  () => inner.classList.remove("vs-shimmer"), { once: true });
          img.addEventListener("error", () => inner.classList.remove("vs-shimmer"), { once: true });
        }

        item.style.cursor = "pointer";
        item.addEventListener("click", () => this.openLightboxGroup(i));
        row.appendChild(item);
      });
    }


    /* ══════════════════════════════════════════
       LIGHTBOX + SLIDER (créés une seule fois)
    ══════════════════════════════════════════ */
    buildLightbox() {
      if (this._lightbox) return;

      /* Overlay */
      const lb = document.createElement("div");
      lb.className = "vs-lightbox";
      lb.setAttribute("role", "dialog");
      lb.setAttribute("aria-modal", "true");

      /* Fermer au clic sur le fond */
      lb.addEventListener("click", (e) => {
        if (e.target === lb) this.closeLightbox();
      });

      /* Clavier : Escape ferme, flèches naviguent */
      this._onKeyDown = (e) => {
        if (!this._lightboxOpen) return;
        if (e.key === "Escape")     this.closeLightbox();
        if (e.key === "ArrowRight") this.next();
        if (e.key === "ArrowLeft")  this.prev();
      };
      document.addEventListener("keydown", this._onKeyDown);

      /* Page Visibility API — pause quand l'onglet est masqué */
      this._visibilityHandler = () => {
        if (!this._lightboxOpen) return;
        if (document.hidden) {
          this._pauseCurrent();
        } else {
          const v = this._videoAt(this.currentIndex);
          if (v) v.play().catch(() => {});
        }
      };
      document.addEventListener("visibilitychange", this._visibilityHandler);

      /* Wrapper slider */
      const wrapper = document.createElement("div");
      wrapper.className = "vs-wrapper";

      /* Piste */
      this.track = document.createElement("div");
      this.track.className = "vs-track";
      wrapper.appendChild(this.track);

      /* 1. Ombre haut */
      const shadow = document.createElement("div");
      shadow.className = "vs-player-shadow";
      wrapper.appendChild(shadow);

      /* 2. Barre de progression — segments remplis à l'ouverture */
      if (CONFIG.showProgress) {
        this.progressBar = document.createElement("div");
        this.progressBar.className = "vs-progress-bar";
        wrapper.appendChild(this.progressBar);
      }

      /* 3. Header */
      const header = document.createElement("div");
      header.className = "vs-player-header";

      /* Header gauche : thumbnail + nom */
      const headerLeft = document.createElement("div");
      headerLeft.className = "vs-player-header-left";

      this.headerThumb = document.createElement("div");
      this.headerThumb.className = "vs-player-header-thumb";
      const thumbImg = document.createElement("img");
      thumbImg.src = "";
      thumbImg.alt = "";
      this.headerThumb.appendChild(thumbImg);
      headerLeft.appendChild(this.headerThumb);

      this.headerName = document.createElement("span");
      this.headerName.className = "vs-player-header-name";
      headerLeft.appendChild(this.headerName);

      this.headerCount = document.createElement("span");
      this.headerCount.className = "vs-player-header-count";
      headerLeft.appendChild(this.headerCount);

      header.appendChild(headerLeft);

      /* Header droite : bouton fermer */
      const headerRight = document.createElement("div");
      headerRight.className = "vs-player-header-right";

      const closeBtn = document.createElement("button");
      closeBtn.className = "vs-close-btn";
      closeBtn.setAttribute("aria-label", "Fermer");
      closeBtn.innerHTML = ICONS.close;
      closeBtn.addEventListener("click", () => this.closeLightbox());
      headerRight.appendChild(closeBtn);

      header.appendChild(headerRight);
      wrapper.appendChild(header);

      /* 4. Contrôles latéraux droite */
      const sideControls = document.createElement("div");
      sideControls.className = "vs-side-controls";

      /* Bouton play/pause */
      this.playBtn = document.createElement("button");
      this.playBtn.className = "vs-side-btn vs-play-btn";
      this.playBtn.setAttribute("aria-label", "Lecture / Pause");
      this.playBtn.innerHTML = ICONS.play;
      sideControls.appendChild(this.playBtn);

      /* Bouton mute */
      this.muteBtn = document.createElement("button");
      this.muteBtn.className = "vs-side-btn vs-mute-btn";
      this.muteBtn.setAttribute("aria-label", "Son");
      this.muteBtn.innerHTML = this.isMuted ? ICONS.mute : ICONS.unmute;
      sideControls.appendChild(this.muteBtn);

      wrapper.appendChild(sideControls);

      /* 5. Zones de navigation tap */
      const navPrev = document.createElement("div");
      navPrev.className = "vs-nav-prev";
      wrapper.appendChild(navPrev);

      const navNext = document.createElement("div");
      navNext.className = "vs-nav-next";
      wrapper.appendChild(navNext);

      lb.appendChild(wrapper);
      document.body.appendChild(lb);
      this._lightbox = lb;
      this.wrapper   = wrapper;

      this.setupScrollSnap();
      this.setupEventListeners();
    }


    /* ══════════════════════════════════════════
       CONSTRUCTION DES SLIDES PAR GROUPE
    ══════════════════════════════════════════ */
    _buildGroupSlides(stories) {
      console.log(`[VS] Construction de ${stories.length} slide(s)`);
      /* Vider les slides et vidéos précédentes */
      this.track.querySelectorAll(".vs-video").forEach(v => { v.pause(); v.src = ""; });
      this.track.innerHTML = "";

      stories.forEach((story, i) => {
        const slide = document.createElement("div");
        slide.className     = "vs-slide";
        slide.dataset.index = i;

        const video = document.createElement("video");
        video.className   = "vs-video";
        video.poster      = story.posterSrc;
        video.muted       = this.isMuted;
        video.loop        = false;
        video.playsInline = true;
        video.preload     = "none";
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        slide.appendChild(video);

        const overlay = document.createElement("div");
        overlay.className = "vs-overlay";
        slide.appendChild(overlay);

        if (story.caption) {
          const info = document.createElement("div");
          info.className = "vs-info";
          const p = document.createElement("p");
          p.className   = "vs-caption";
          p.textContent = story.caption;
          info.appendChild(p);
          slide.appendChild(info);
        }

        const pi = document.createElement("div");
        pi.className = "vs-play-indicator";
        pi.innerHTML = ICONS.play;
        slide.appendChild(pi);

        /* Spinner de chargement */
        const spinner = document.createElement("div");
        spinner.className = "vs-spinner";
        slide.appendChild(spinner);

        /* Overlay d'erreur avec bouton retry */
        const errorDiv = document.createElement("div");
        errorDiv.className = "vs-error-overlay";
        const errorMsg = document.createElement("p");
        errorMsg.className   = "vs-error-msg";
        errorMsg.textContent = "Impossible de charger la vidéo";
        errorDiv.appendChild(errorMsg);
        const retryBtn = document.createElement("button");
        retryBtn.className   = "vs-error-retry";
        retryBtn.textContent = "Réessayer";
        retryBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          slide.classList.remove("vs-error-state");
          slide.classList.add("vs-loading");
          video.src = story.videoSrc;
          video.load();
          video.play().catch(() => {});
        });
        errorDiv.appendChild(retryBtn);
        slide.appendChild(errorDiv);

        /* Événements chargement vidéo */
        video.addEventListener("waiting", () => slide.classList.add("vs-loading"));
        video.addEventListener("playing", () => slide.classList.remove("vs-loading"));
        video.addEventListener("canplay", () => slide.classList.remove("vs-loading"));
        video.addEventListener("error", () => {
          slide.classList.remove("vs-loading");
          slide.classList.add("vs-error-state");
          this._clearAutoTimer();
          this._clearProgTimer();
        });

        /* Fin de vidéo → story suivante (ended ne bulle pas, listener direct) */
        video.addEventListener("ended", () => {
          if (parseInt(slide.dataset.index) === this.currentIndex) this.next();
        });

        this.track.appendChild(slide);
      });

      /* Reconstruire les segments de progression */
      if (CONFIG.showProgress && this.progressBar) {
        this.progressBar.innerHTML = "";
        stories.forEach((_, i) => {
          const seg  = document.createElement("div");
          seg.className     = "vs-progress-seg";
          seg.dataset.index = i;
          const fill = document.createElement("div");
          fill.className = "vs-progress-fill";
          seg.appendChild(fill);
          this.progressBar.appendChild(seg);
        });
      }
    }


    /* ══════════════════════════════════════════
       OUVRIR / FERMER LIGHTBOX
    ══════════════════════════════════════════ */
    openLightboxGroup(groupIndex) {
      console.log(`[VS] Ouverture groupe ${groupIndex} — "${this.groups[groupIndex]?.circleItem?.querySelector(".vs-circle-label")?.textContent || groupIndex}"`);
      this.buildLightbox(); // no-op si déjà construite

      this._clearAutoTimer();
      this._clearProgTimer();

      /* Charger les stories du groupe actif */
      this.activeStories = this.groups[groupIndex].stories;
      this._buildGroupSlides(this.activeStories);
      this.currentIndex = 0;

      /* Charger les deux premières vidéos */
      this._loadVideoSrc(0);
      this._loadVideoSrc(1);

      /* Marquer le groupe comme "vu" + mettre à jour l'anneau */
      this._watchedGroups.add(groupIndex);
      const circleItem = this.groups[groupIndex]?.circleItem;
      if (circleItem) {
        circleItem.classList.add("vs-watched");
        circleItem.querySelector(".vs-circle-ring")?.classList.add("vs-watched");
      }

      /* Afficher */
      this._focusBeforeLightbox = document.activeElement;
      this._lightboxOpen = true;
      this._lightbox.classList.add("vs-open");
      document.body.style.overflow = "hidden";

      requestAnimationFrame(() => {
        this.track.scrollLeft = 0;
        this.updateUI();
        this.playStory(0);
        /* Déplacer le focus dans la lightbox pour les lecteurs d'écran */
        this._lightbox.querySelector(".vs-close-btn")?.focus();
      });
    }

    closeLightbox() {
      if (!this._lightboxOpen) return;
      console.log("[VS] Fermeture lightbox");
      this._pauseCurrent();
      this._lightboxOpen = false;
      this._lightbox.classList.remove("vs-open");
      document.body.style.overflow = "";
      /* Reset visuel de la barre de progression */
      if (this.progressBar) {
        this.progressBar.querySelectorAll(".vs-progress-fill")
          .forEach(f => { f.style.width = "0%"; });
      }
      /* Restaurer le focus sur l'élément qui a ouvert la lightbox */
      this._focusBeforeLightbox?.focus();
      this._focusBeforeLightbox = null;
    }

    /* Charge le src d'une vidéo si pas encore fait */
    _loadVideoSrc(i) {
      if (i < 0 || i >= this.activeStories.length) return;
      const video = this._videoAt(i);
      if (video && !video.src) {
        video.src     = this.activeStories[i].videoSrc;
        video.preload = "auto";
        video.load(); // démarre le téléchargement immédiatement
        console.log(`[VS] Vidéo ${i} — load() déclenché : ${this.activeStories[i].videoSrc}`);
      }
    }


    /* ══════════════════════════════════════════
       SCROLL SNAP (swipe mobile)
    ══════════════════════════════════════════ */
    setupScrollSnap() {
      const onSnapDone = () => {
        if (this._programmaticScroll) return;
        const idx = Math.round(this.track.scrollLeft / this.track.clientWidth);
        if (idx !== this.currentIndex) {
          this._pauseCurrent();
          this.currentIndex = idx;
          this._loadVideoSrc(idx);
          this._loadVideoSrc(idx + 1);
          this.updateUI();
          this.playStory(idx);
        }
      };

      if ("onscrollend" in window) {
        this.track.addEventListener("scrollend", onSnapDone);
      } else {
        let t;
        this.track.addEventListener("scroll", () => {
          if (this._programmaticScroll) return;
          clearTimeout(t);
          t = setTimeout(onSnapDone, 350);
        });
      }
    }


    /* ══════════════════════════════════════════
       ÉVÉNEMENTS
    ══════════════════════════════════════════ */
    setupEventListeners() {
      /* Détection swipe → empêche le click post-swipe */
      this._swiping = false;
      this.track.addEventListener("touchstart", () => { this._swiping = false; }, { passive: true });
      this.track.addEventListener("touchmove",  () => { this._swiping = true;  }, { passive: true });

      /* Mute */
      this.muteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.isMuted = !this.isMuted;
        this.muteBtn.innerHTML = this.isMuted ? ICONS.mute : ICONS.unmute;
        this.track.querySelectorAll(".vs-video").forEach(v => { v.muted = this.isMuted; });
      });

      /* Play/Pause (bouton latéral) */
      this.playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const video = this._videoAt(this.currentIndex);
        if (!video) return;
        const slide = this.track.querySelectorAll(".vs-slide")[this.currentIndex];
        const pi    = slide ? slide.querySelector(".vs-play-indicator") : null;
        if (video.paused) {
          video.play().catch(() => {});
          if (pi) pi.classList.remove("vs-show");
          this._startProgTimer();
          if (CONFIG.autoAdvance) this._startAutoTimer();
        } else {
          video.pause();
          if (pi) { pi.innerHTML = ICONS.play; pi.classList.add("vs-show"); }
          this._clearAutoTimer();
          this._clearProgTimer();
        }
        /* Mettre à jour l'icône du bouton play après toggle */
        this.playBtn.innerHTML = video.paused ? ICONS.play : ICONS.pause;
      });

      /* Zones de navigation tap */
      const navPrev = this._lightbox.querySelector(".vs-nav-prev");
      const navNext = this._lightbox.querySelector(".vs-nav-next");
      if (navPrev) {
        navPrev.addEventListener("click", (e) => {
          e.stopPropagation();
          this.prev();
        });
      }
      if (navNext) {
        navNext.addEventListener("click", (e) => {
          e.stopPropagation();
          this.next();
        });
      }

      /* Tap slide → play/pause (délégation : fonctionne après chaque rebuild) */
      this.track.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        if (this._swiping) return;
        const slide = e.target.closest(".vs-slide");
        if (!slide) return;
        if (parseInt(slide.dataset.index) !== this.currentIndex) return;

        const video = slide.querySelector(".vs-video");
        const pi    = slide.querySelector(".vs-play-indicator");
        if (video.paused) {
          video.play().catch(() => {});
          pi.classList.remove("vs-show");
          this._startProgTimer();
          if (CONFIG.autoAdvance) this._startAutoTimer();
        } else {
          video.pause();
          pi.innerHTML = ICONS.play;
          pi.classList.add("vs-show");
          this._clearAutoTimer();
          this._clearProgTimer();
        }
        /* Synchroniser l'icône du bouton play */
        if (this.playBtn) {
          this.playBtn.innerHTML = video.paused ? ICONS.play : ICONS.pause;
        }
      });

      /* ── Long press pour mettre en pause (Instagram-style) ── */
      let longPressTimer  = null;
      let longPressActive = false;

      this.track.addEventListener("touchstart", () => {
        longPressActive = false;
        longPressTimer  = setTimeout(() => {
          longPressActive = true;
          this._pauseCurrent();
        }, 350);
      }, { passive: true });

      this.track.addEventListener("touchmove", () => {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }, { passive: true });

      this.track.addEventListener("touchend", (e) => {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        if (longPressActive) {
          longPressActive = false;
          e.preventDefault(); // Bloque le click synthétique post-long-press
          const v = this._videoAt(this.currentIndex);
          if (v) {
            v.play().catch(() => {});
            this._startProgTimer();
            if (CONFIG.autoAdvance) this._startAutoTimer();
          }
          if (this.playBtn) this.playBtn.innerHTML = ICONS.pause;
        }
      }, { passive: false });

      /* ── Barre de progression cliquable ── */
      if (CONFIG.showProgress && this.progressBar) {
        this.progressBar.addEventListener("click", (e) => {
          e.stopPropagation();
          const seg = e.target.closest(".vs-progress-seg");
          if (!seg) return;
          const idx = parseInt(seg.dataset.index);
          if (!isNaN(idx)) this.goTo(idx);
        });
      }

      /* ── Swipe vers le bas pour fermer ── */
      if (this.wrapper) {
        let swipeStartY    = 0;
        let swipeStartX    = 0;
        let swipeDownActive = false;

        this.wrapper.addEventListener("touchstart", (e) => {
          swipeStartY     = e.touches[0].clientY;
          swipeStartX     = e.touches[0].clientX;
          swipeDownActive = false;
        }, { passive: true });

        this.wrapper.addEventListener("touchmove", (e) => {
          const dy = e.touches[0].clientY - swipeStartY;
          const dx = e.touches[0].clientX - swipeStartX;
          if (!swipeDownActive && Math.abs(dy) > Math.abs(dx) && dy > 8) {
            swipeDownActive = true;
          }
          if (swipeDownActive && dy > 0) {
            this.wrapper.style.transform = `scale(1) translateY(${dy}px)`;
            this.wrapper.style.opacity   = String(Math.max(0, 1 - dy / 300));
          }
        }, { passive: true });

        this.wrapper.addEventListener("touchend", (e) => {
          if (!swipeDownActive) return;
          const dy = e.changedTouches[0].clientY - swipeStartY;
          swipeDownActive = false;
          if (dy > 100) {
            this.wrapper.style.transform = "";
            this.wrapper.style.opacity   = "";
            this.closeLightbox();
          } else {
            this.wrapper.style.transition = "transform .3s cubic-bezier(.34,1.4,.64,1), opacity .3s";
            this.wrapper.style.transform  = "scale(1)";
            this.wrapper.style.opacity    = "1";
            setTimeout(() => {
              this.wrapper.style.transition = "";
              this.wrapper.style.transform  = "";
              this.wrapper.style.opacity    = "";
            }, 320);
          }
        }, { passive: true });
      }
    }


    /* ══════════════════════════════════════════
       NAVIGATION
    ══════════════════════════════════════════ */
    goTo(index) {
      if (index < 0 || index >= this.activeStories.length) return;
      this._pauseCurrent();
      this.currentIndex = index;

      this._programmaticScroll = true;
      const unlock = () => { this._programmaticScroll = false; };
      if ("onscrollend" in window) {
        this.track.addEventListener("scrollend", unlock, { once: true });
      }
      setTimeout(unlock, 500);

      this.track.scrollTo({ left: this.track.clientWidth * index, behavior: "smooth" });
      this._loadVideoSrc(index);
      this._loadVideoSrc(index + 1);
      this.updateUI();
      this.playStory(index);
    }

    next() { if (this.currentIndex + 1 < this.activeStories.length) this.goTo(this.currentIndex + 1); }
    prev() { if (this.currentIndex - 1 >= 0) this.goTo(this.currentIndex - 1); }


    /* ══════════════════════════════════════════
       LECTURE
    ══════════════════════════════════════════ */
    playStory(index) {
      const video = this._videoAt(index);
      if (!video) return;
      console.log(`[VS] Lecture story ${index} — "${this.activeStories[index]?.title || index}"`);

      if (CONFIG.showProgress) {
        const fill = this.progressBar.querySelector(`.vs-progress-seg[data-index="${index}"] .vs-progress-fill`);
        if (fill) fill.style.width = "0%";
      }

      video.muted       = this.isMuted;
      video.currentTime = 0;

      if (CONFIG.autoplay) {
        const tryPlay = () => {
          video.play().catch((err) => {
            console.warn(`[VS] play() bloqué (story ${index}) :`, err.name, err.message);
          });
        };
        /* Attendre que la vidéo ait assez de données avant de lancer */
        if (video.readyState >= 3) {
          tryPlay();
        } else {
          video.addEventListener("canplay", tryPlay, { once: true });
        }
      }

      this._startProgTimer();
      if (CONFIG.autoAdvance) this._startAutoTimer();
    }


    /* ══════════════════════════════════════════
       UI
    ══════════════════════════════════════════ */
    updateUI() {
      if (CONFIG.showProgress && this.progressBar) {
        this.progressBar.querySelectorAll(".vs-progress-seg").forEach((seg) => {
          const i    = parseInt(seg.dataset.index);
          const fill = seg.querySelector(".vs-progress-fill");
          if (i < this.currentIndex)      fill.style.width = "100%";
          else if (i > this.currentIndex) fill.style.width = "0%";
        });
      }
      if (this.track) {
        this.track.querySelectorAll(".vs-play-indicator").forEach(pi => pi.classList.remove("vs-show"));
      }

      /* Mettre à jour header : thumbnail + nom */
      const story = this.activeStories[this.currentIndex];
      if (this.headerThumb && story) {
        const img = this.headerThumb.querySelector("img");
        if (img) img.src = story.posterSrc || story.thumbSrc || "";
      }
      if (this.headerName && story) {
        this.headerName.textContent = story.title || "";
      }
      if (this.headerCount) {
        this.headerCount.textContent = this.activeStories.length > 1
          ? `${this.currentIndex + 1} / ${this.activeStories.length}`
          : "";
      }

      /* Mettre à jour icône play/pause */
      if (this.playBtn) {
        const v = this._videoAt(this.currentIndex);
        this.playBtn.innerHTML = (v && !v.paused) ? ICONS.pause : ICONS.play;
      }
    }


    /* ══════════════════════════════════════════
       TIMERS
    ══════════════════════════════════════════ */
    _startAutoTimer() {
      this._clearAutoTimer();
      if (!CONFIG.autoAdvance) return;
      this.autoTimer = setTimeout(() => {
        /* N'avance que si la vidéo tourne encore (pas en pause manuelle) */
        const v = this._videoAt(this.currentIndex);
        if (!v || !v.paused) this.next();
      }, CONFIG.autoAdvanceMs);
    }
    _clearAutoTimer() { clearTimeout(this.autoTimer); this.autoTimer = null; }

    _startProgTimer() {
      this._clearProgTimer();
      if (!CONFIG.showProgress || !this.progressBar) return;
      const video = this._videoAt(this.currentIndex);
      const seg   = this.progressBar.querySelector(`.vs-progress-seg[data-index="${this.currentIndex}"]`);
      if (!seg || !video) return;
      const fill  = seg.querySelector(".vs-progress-fill");

      const onTime = () => {
        if (!video.duration) return;
        fill.style.width = Math.min((video.currentTime / video.duration) * 100, 100) + "%";
      };
      video.addEventListener("timeupdate", onTime);
      this._progCleanup = () => video.removeEventListener("timeupdate", onTime);
    }
    _clearProgTimer() {
      if (this._progCleanup) { this._progCleanup(); this._progCleanup = null; }
    }


    /* ══════════════════════════════════════════
       HELPERS
    ══════════════════════════════════════════ */
    _pauseCurrent() {
      const v = this._videoAt(this.currentIndex);
      if (v) v.pause();
      this._clearAutoTimer();
      this._clearProgTimer();
    }

    _videoAt(i) {
      return this.track ? this.track.querySelectorAll(".vs-video")[i] || null : null;
    }

    destroy() {
      this._clearAutoTimer();
      this._clearProgTimer();
      if (this._onKeyDown) {
        document.removeEventListener("keydown", this._onKeyDown);
        this._onKeyDown = null;
      }
      if (this._visibilityHandler) {
        document.removeEventListener("visibilitychange", this._visibilityHandler);
        this._visibilityHandler = null;
      }
      if (this.track) {
        this.track.querySelectorAll(".vs-video").forEach(v => { v.pause(); v.src = ""; });
      }
      if (this._lightbox) this._lightbox.remove();
      document.body.style.overflow = "";
    }
  }


  /* ─── INITIALISATION AUTOMATIQUE ─── */
  function initAllStories() {
    const blocks = [...document.querySelectorAll("[data-wp-video-stories]:not([data-vs-ready])")];
    console.log(`[VS] initAllStories — ${blocks.length} bloc(s) trouvé(s) dans le DOM`);
    if (blocks.length === 0) {
      console.warn("[VS] Aucun bloc [data-wp-video-stories] trouvé — script inactif");
      return;
    }

    /* Construire les groupes — un groupe par bloc */
    const groups = blocks.map((block) => {
      const circleItem = block.querySelector(".vs-circle-item");
      const stories = [...block.querySelectorAll(".vs-story-data")].map((el, i) => ({
        index    : i,
        videoSrc : el.dataset.video   || "",
        posterSrc: el.dataset.poster  || "",
        thumbSrc : el.dataset.thumb   || el.dataset.poster || "",
        title    : el.dataset.title   || "",
        caption  : el.dataset.caption || "",
      }));
      return { circleItem, stories };
    });

    /* Conteneur combiné avec uniquement la rangée de cercles */
    const combined = document.createElement("div");
    combined.className = "vs-circles-wrapper";
    combined.setAttribute("data-wp-video-stories", "");

    const circlesDiv = document.createElement("div");
    circlesDiv.className = "vs-circles";
    combined.appendChild(circlesDiv);

    /* Insérer avant le premier bloc, supprimer les blocs originaux */
    blocks[0].parentNode.insertBefore(combined, blocks[0]);
    blocks.forEach((b) => b.remove());

    combined.setAttribute("data-vs-ready", "");
    combined._vsInstance = new WPVideoStories(combined, groups);
    console.log("[VS] Initialisation terminée ✓", combined._vsInstance);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAllStories);
  } else {
    initAllStories();
  }

  window.WPVideoStories = WPVideoStories;
})();
