/**
 * WP Video Stories — Carrousel horizontal
 * ========================================
 * Insertion : via un bloc HTML personnalisé WordPress
 *
 * FONCTIONNALITÉS :
 * - Un seul bloc vidéo, défilement horizontal story par story
 * - Navigation manuelle (flèches + swipe tactile)
 * - Auto-avance configurable (passage auto à la story suivante)
 * - Barre de progression par story
 * - Bouton mute/unmute
 * - Lecture auto + pause hors focus
 * - Lazy loading de la vidéo suivante
 * - Responsive (pleine largeur mobile, centré desktop)
 *
 * UTILISATION :
 * <div data-wp-video-stories>
 *   <div class="vs-story-data"
 *     data-video="url.mp4"
 *     data-poster="url.jpg"
 *     data-user="Prénom N."
 *     data-avatar="avatar.jpg"   <!-- optionnel -->
 *     data-caption="Texte..."
 *     data-color="#534AB7">      <!-- couleur avatar fallback -->
 *   </div>
 *   ...
 * </div>
 */

(function () {
  "use strict";

  /* ─── CONFIGURATION ─── */
  const CONFIG = {
    autoplay       : true,   // Lecture auto dès que visible
    muted          : true,   // Muet au démarrage (requis pour autoplay)
    autoAdvance    : true,   // Passer auto à la story suivante en fin de vidéo
    autoAdvanceMs  : 8000,   // Durée max par story si la vidéo est plus courte
    showProgress   : true,   // Barre de progression
    showNavArrows  : true,   // Flèches prev/next
  };

  /* ─── ICÔNES SVG ─── */
  const ICONS = {
    play    : '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    pause   : '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
    mute    : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2"/></svg>',
    unmute  : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    prev    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>',
    next    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>',
  };

  /* ─── CSS INJECTÉ UNE SEULE FOIS (mobile-first) ─── */
  const CSS = `

    /* ── BASE MOBILE ── */

    .vs-wrapper {
      position: relative;
      width: 100%;
      height: 100svh;           /* plein écran mobile */
      background: #000;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      /* pas de border-radius sur mobile */
    }

    /* Piste horizontale */
    .vs-track {
      display: flex;
      width: 100%;
      height: 100%;
      overflow-x: scroll;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }
    .vs-track::-webkit-scrollbar { display: none; }

    /* Slide */
    .vs-slide {
      position: relative;
      flex: 0 0 100%;
      width: 100%;
      height: 100%;
      scroll-snap-align: start;
      overflow: hidden;
      cursor: pointer;
    }

    /* Vidéo */
    .vs-video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Gradient overlay */
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

    /* Infos utilisateur + caption */
    .vs-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 14px 14px 28px;
      color: #fff;
      pointer-events: none;
    }
    .vs-user {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .vs-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,.85);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 11px;
      color: #fff;
      flex-shrink: 0;
      overflow: hidden;
    }
    .vs-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .vs-username {
      font-weight: 600;
      font-size: 13px;
      text-shadow: 0 1px 5px rgba(0,0,0,.55);
    }
    .vs-caption {
      font-size: 12px;
      line-height: 1.45;
      text-shadow: 0 1px 5px rgba(0,0,0,.55);
    }

    /* Indicateur play/pause central */
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

    /* Barre de progression */
    .vs-progress-bar {
      position: absolute;
      top: 10px;
      left: 8px;
      right: 8px;
      display: flex;
      gap: 3px;
      z-index: 10;
      pointer-events: none;
    }
    .vs-progress-seg {
      flex: 1;
      height: 2px;
      background: rgba(255,255,255,.3);
      border-radius: 2px;
      overflow: hidden;
    }
    .vs-progress-fill {
      height: 100%;
      width: 0%;
      background: #fff;
      border-radius: 2px;
    }
    .vs-progress-seg.vs-past .vs-progress-fill { width: 100%; }

    /* Bouton mute */
    .vs-mute-btn {
      position: absolute;
      top: 28px;
      right: 10px;
      z-index: 10;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: rgba(0,0,0,.48);
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    }
    .vs-mute-btn svg { width: 15px; height: 15px; }

    /* Flèches nav — masquées sur mobile (navigation par swipe) */
    .vs-nav-btn {
      display: none;
    }

    /* ── TABLET 640px ── */
    @media (min-width: 640px) {
      .vs-wrapper {
        height: auto;
        aspect-ratio: 9/16;
        max-width: 360px;
        margin: 0 auto;
        border-radius: 14px;
      }

      .vs-info    { padding: 16px 16px 26px; }
      .vs-avatar  { width: 38px; height: 38px; font-size: 12px; }
      .vs-username{ font-size: 14px; }
      .vs-caption { font-size: 13px; }

      .vs-progress-bar { top: 12px; left: 10px; right: 10px; gap: 4px; }
      .vs-progress-seg { height: 3px; }

      .vs-mute-btn { top: 32px; right: 12px; width: 34px; height: 34px; }
      .vs-mute-btn svg { width: 16px; height: 16px; }

      /* Flèches visibles à partir de la tablette */
      .vs-nav-btn {
        display: flex;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        z-index: 10;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: none;
        background: rgba(0,0,0,.42);
        color: #fff;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        transition: opacity .2s;
      }
      .vs-nav-btn svg { width: 20px; height: 20px; }
      .vs-nav-btn.vs-hidden { opacity: 0; pointer-events: none; }
      .vs-prev { left: 10px; }
      .vs-next { right: 10px; }
    }

    /* ── DESKTOP 1024px ── */
    @media (min-width: 1024px) {
      .vs-wrapper {
        max-width: 420px;
        border-radius: 18px;
        box-shadow: 0 24px 70px rgba(0,0,0,.6);
      }

      .vs-play-indicator { width: 66px; height: 66px; }
      .vs-play-indicator svg { width: 28px; height: 28px; }

      .vs-mute-btn { top: 34px; right: 12px; width: 36px; height: 36px; }
      .vs-mute-btn svg { width: 17px; height: 17px; }

      .vs-nav-btn { width: 40px; height: 40px; }
    }
  `;

  /* Injection CSS globale (une seule fois) */
  if (!document.getElementById("vs-styles")) {
    const style = document.createElement("style");
    style.id = "vs-styles";
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /* ═══════════════════════════════════════════
     CLASSE PRINCIPALE
  ═══════════════════════════════════════════ */
  class WPVideoStories {
    constructor(container) {
      this.container    = container;
      this.stories      = [];
      this.currentIndex = 0;
      this.isMuted      = CONFIG.muted;
      this.autoTimer    = null;
      this.rafId        = null;
      this.progStart    = 0;

      this.init();
    }

    init() {
      this.parseStories();
      if (this.stories.length === 0) return;
      this.buildDOM();
      this.setupScrollSnap();
      this.setupEventListeners();
      this.updateUI();
      this.playStory(0);
    }

    /* ── Lecture des data-attributes ── */
    parseStories() {
      this.container.querySelectorAll(".vs-story-data").forEach((el, i) => {
        this.stories.push({
          index     : i,
          videoSrc  : el.dataset.video   || "",
          posterSrc : el.dataset.poster  || "",
          userName  : el.dataset.user    || "",
          userAvatar: el.dataset.avatar  || "",
          caption   : el.dataset.caption || "",
          color     : el.dataset.color   || "#534AB7",
        });
      });
    }

    /* ── Construction du DOM ── */
    buildDOM() {
      this.container.innerHTML = "";
      this.container.classList.add("vs-wrapper");

      /* Piste */
      this.track = document.createElement("div");
      this.track.className = "vs-track";

      this.stories.forEach((story, i) => {
        const slide = document.createElement("div");
        slide.className = "vs-slide";
        slide.dataset.index = i;

        /* Vidéo */
        const video = document.createElement("video");
        video.className = "vs-video";
        video.src       = story.videoSrc;
        video.poster    = story.posterSrc;
        video.muted     = this.isMuted;
        video.loop      = false;
        video.playsInline = true;
        video.preload   = i === 0 ? "auto" : "none";
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        slide.appendChild(video);

        /* Overlay */
        const overlay = document.createElement("div");
        overlay.className = "vs-overlay";
        slide.appendChild(overlay);

        /* Infos */
        const info = document.createElement("div");
        info.className = "vs-info";
        info.innerHTML = `
          <div class="vs-user">
            <div class="vs-avatar" style="background:${story.color}">
              ${story.userAvatar
                ? `<img src="${story.userAvatar}" alt="${story.userName}">`
                : this._initials(story.userName)}
            </div>
            <span class="vs-username">${story.userName}</span>
          </div>
          <p class="vs-caption">${story.caption}</p>
        `;
        slide.appendChild(info);

        /* Indicateur play/pause */
        const pi = document.createElement("div");
        pi.className = "vs-play-indicator";
        pi.innerHTML = ICONS.play;
        slide.appendChild(pi);

        this.track.appendChild(slide);
      });

      this.container.appendChild(this.track);

      /* Barre de progression */
      if (CONFIG.showProgress) {
        this.progressBar = document.createElement("div");
        this.progressBar.className = "vs-progress-bar";
        this.stories.forEach((_, i) => {
          const seg  = document.createElement("div");
          seg.className = "vs-progress-seg";
          seg.dataset.index = i;
          const fill = document.createElement("div");
          fill.className = "vs-progress-fill";
          seg.appendChild(fill);
          this.progressBar.appendChild(seg);
        });
        this.container.appendChild(this.progressBar);
      }

      /* Bouton mute */
      this.muteBtn = document.createElement("button");
      this.muteBtn.className = "vs-mute-btn";
      this.muteBtn.setAttribute("aria-label", "Son");
      this.muteBtn.innerHTML = this.isMuted ? ICONS.mute : ICONS.unmute;
      this.container.appendChild(this.muteBtn);

      /* Flèches */
      if (CONFIG.showNavArrows) {
        this.btnPrev = document.createElement("button");
        this.btnPrev.className = "vs-nav-btn vs-prev";
        this.btnPrev.setAttribute("aria-label", "Précédent");
        this.btnPrev.innerHTML = ICONS.prev;
        this.container.appendChild(this.btnPrev);

        this.btnNext = document.createElement("button");
        this.btnNext.className = "vs-nav-btn vs-next";
        this.btnNext.setAttribute("aria-label", "Suivant");
        this.btnNext.innerHTML = ICONS.next;
        this.container.appendChild(this.btnNext);
      }
    }

    /* ── Scroll snap : détection swipe manuel ── */
    setupScrollSnap() {
      let t;
      this.track.addEventListener("scroll", () => {
        clearTimeout(t);
        t = setTimeout(() => {
          const idx = Math.round(this.track.scrollLeft / this.track.clientWidth);
          if (idx !== this.currentIndex) this.goTo(idx);
        }, 120);
      });
    }

    /* ── Événements ── */
    setupEventListeners() {
      /* Mute */
      this.muteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.isMuted = !this.isMuted;
        this.muteBtn.innerHTML = this.isMuted ? ICONS.mute : ICONS.unmute;
        this.track.querySelectorAll(".vs-video").forEach(v => { v.muted = this.isMuted; });
      });

      /* Flèches */
      if (CONFIG.showNavArrows) {
        this.btnPrev.addEventListener("click", (e) => { e.stopPropagation(); this.prev(); });
        this.btnNext.addEventListener("click", (e) => { e.stopPropagation(); this.next(); });
      }

      /* Tap slide → play/pause */
      this.track.querySelectorAll(".vs-slide").forEach((slide) => {
        const video = slide.querySelector(".vs-video");
        const pi    = slide.querySelector(".vs-play-indicator");

        slide.addEventListener("click", (e) => {
          if (e.target.closest("button")) return;
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
        });

        /* Fin de vidéo → story suivante */
        video.addEventListener("ended", () => {
          if (parseInt(slide.dataset.index) === this.currentIndex) this.next();
        });
      });
    }

    /* ── Navigation ── */
    goTo(index) {
      if (index < 0 || index >= this.stories.length) return;
      this._pauseCurrent();
      this.currentIndex = index;
      this.track.scrollTo({ left: this.track.clientWidth * index, behavior: "smooth" });
      this._lazyLoadNext();
      this.updateUI();
      this.playStory(index);
    }

    next() { this.goTo(this.currentIndex + 1 < this.stories.length ? this.currentIndex + 1 : 0); }
    prev() { this.goTo(this.currentIndex - 1 >= 0 ? this.currentIndex - 1 : this.stories.length - 1); }

    playStory(index) {
      const video = this._videoAt(index);
      if (!video) return;
      video.muted = this.isMuted;
      video.currentTime = 0;
      if (CONFIG.autoplay) video.play().catch(() => {});
      this._startProgTimer();
      if (CONFIG.autoAdvance) this._startAutoTimer();
    }

    /* ── UI ── */
    updateUI() {
      if (CONFIG.showNavArrows) {
        this.btnPrev.classList.toggle("vs-hidden", this.currentIndex === 0);
        this.btnNext.classList.toggle("vs-hidden", this.currentIndex === this.stories.length - 1);
      }
      if (CONFIG.showProgress) {
        this.progressBar.querySelectorAll(".vs-progress-seg").forEach((seg) => {
          const i = parseInt(seg.dataset.index);
          seg.classList.toggle("vs-past", i < this.currentIndex);
          if (i >= this.currentIndex) {
            seg.querySelector(".vs-progress-fill").style.width = "0%";
          }
        });
      }
      /* Reset indicateurs play */
      this.track.querySelectorAll(".vs-play-indicator").forEach(pi => pi.classList.remove("vs-show"));
    }

    /* ── Timer auto-avance ── */
    _startAutoTimer() {
      this._clearAutoTimer();
      if (!CONFIG.autoAdvance) return;
      this.autoTimer = setTimeout(() => this.next(), CONFIG.autoAdvanceMs);
    }

    _clearAutoTimer() {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }

    /* ── Barre de progression animée ── */
    _startProgTimer() {
      this._clearProgTimer();
      if (!CONFIG.showProgress) return;
      const seg  = this.progressBar.querySelector(`.vs-progress-seg[data-index="${this.currentIndex}"]`);
      if (!seg) return;
      const fill = seg.querySelector(".vs-progress-fill");
      this.progStart = performance.now();

      const tick = (now) => {
        const pct = Math.min(((now - this.progStart) / CONFIG.autoAdvanceMs) * 100, 100);
        fill.style.width = pct + "%";
        if (pct < 100) this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    }

    _clearProgTimer() {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    /* ── Lazy load ── */
    _lazyLoadNext() {
      const next = this._videoAt(this.currentIndex + 1);
      if (next && next.preload === "none") next.preload = "auto";
    }

    /* ── Helpers ── */
    _pauseCurrent() {
      const v = this._videoAt(this.currentIndex);
      if (v) v.pause();
      this._clearAutoTimer();
      this._clearProgTimer();
    }

    _videoAt(i) {
      return this.track.querySelectorAll(".vs-video")[i] || null;
    }

    _initials(name) {
      return name.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2);
    }

    /* ── Nettoyage ── */
    destroy() {
      this._clearAutoTimer();
      this._clearProgTimer();
      this.track.querySelectorAll(".vs-video").forEach(v => { v.pause(); v.src = ""; });
    }
  }

  /* ─── INITIALISATION AUTOMATIQUE ─── */
  function initAllStories() {
    document.querySelectorAll("[data-wp-video-stories]").forEach((el) => {
      if (!el._vsInstance) el._vsInstance = new WPVideoStories(el);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAllStories);
  } else {
    initAllStories();
  }

  window.WPVideoStories = WPVideoStories;
})();
