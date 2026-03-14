/**
 * WP Video Stories — Cercles + Lightbox slider
 * =============================================
 * Insertion : via un bloc HTML personnalisé WordPress
 *
 * FONCTIONNALITÉS :
 * - Affichage initial léger : rangée de cercles cliquables (poster + titre)
 * - Clic → lightbox plein écran avec slider horizontal
 * - Vidéos chargées uniquement à l'ouverture (lazy load total)
 * - Navigation manuelle (swipe + flèches desktop)
 * - Auto-avance en fin de vidéo
 * - Barre de progression calée sur la durée réelle
 * - Bouton mute/unmute
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
    showNavArrows : true,   // Flèches prev/next (desktop)
  };

  /* ─── ICÔNES SVG ─── */
  const ICONS = {
    play   : '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    mute   : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2"/></svg>',
    unmute : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    prev   : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>',
    next   : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>',
    close  : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  };

  /* ─── CSS (injecté une seule fois) ─── */
  const CSS = `

    /* ══ CERCLES ══ */

    .vs-circles-wrapper {
      width: 100%;
    }

    .vs-circles {
      display: flex;
      gap: 14px;
      overflow-x: auto;
      scrollbar-width: none;
      padding: 10px 4px 14px;
      -webkit-overflow-scrolling: touch;
    }
    .vs-circles::-webkit-scrollbar { display: none; }

    .vs-circle-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }

    /* Anneau dégradé */
    .vs-circle-ring {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform .15s;
    }
    .vs-circle-item:active .vs-circle-ring { transform: scale(.9); }

    /* Zone image à l'intérieur de l'anneau */
    .vs-circle-inner {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      overflow: hidden;
      background: #333;
    }
    .vs-circle-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* Titre sous le cercle */
    .vs-circle-label {
      font-size: 11px;
      font-weight: 500;
      color: #fff;
      text-align: center;
      max-width: 68px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }


    /* ══ LIGHTBOX ══ */

    .vs-lightbox {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.92);
      z-index: 999999; /* au-dessus de la barre admin WordPress (99999) */
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity .22s ease;
    }
    .vs-lightbox.vs-open {
      opacity: 1;
      pointer-events: auto;
    }


    /* ══ SLIDER (dans la lightbox) ══ */

    /* Mobile : plein écran */
    .vs-wrapper {
      position: relative;
      width: 100%;
      height: 100vh;
      height: 100svh;
      background: #000;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .vs-track {
      display: flex;
      width: 100%;
      height: 100%;
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

    /* Barre de progression */
    .vs-progress-bar {
      position: absolute;
      top: 10px;
      left: 8px;
      right: 46px;    /* espace pour le bouton fermer */
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

    /* Bouton fermer */
    .vs-close-btn {
      position: absolute;
      top: 6px;
      right: 8px;
      z-index: 20;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: none;
      background: rgba(0,0,0,.45);
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    }
    .vs-close-btn svg { width: 16px; height: 16px; }

    /* Bouton mute */
    .vs-mute-btn {
      position: absolute;
      top: 48px;
      right: 8px;
      z-index: 10;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: none;
      background: rgba(0,0,0,.45);
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    }
    .vs-mute-btn svg { width: 16px; height: 16px; }

    /* Flèches nav — masquées sur mobile */
    .vs-nav-btn { display: none; }


    /* ══ TABLET 640px ══ */
    @media (min-width: 640px) {
      .vs-lightbox { padding: 20px; }

      .vs-wrapper {
        height: auto;
        aspect-ratio: 9/16;
        max-width: 360px;
        border-radius: 14px;
      }

      .vs-caption { font-size: 13px; }

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
        transition: opacity .2s;
      }
      .vs-nav-btn svg { width: 20px; height: 20px; }
      .vs-nav-btn.vs-hidden { opacity: 0; pointer-events: none; }
      .vs-prev { left: 10px; }
      .vs-next { right: 10px; }
    }

    /* ══ DESKTOP 1024px ══ */
    @media (min-width: 1024px) {
      .vs-wrapper {
        max-width: 420px;
        border-radius: 18px;
        box-shadow: 0 24px 70px rgba(0,0,0,.7);
      }
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

      /* Wrapper slider */
      const wrapper = document.createElement("div");
      wrapper.className = "vs-wrapper";

      /* Piste */
      this.track = document.createElement("div");
      this.track.className = "vs-track";

      wrapper.appendChild(this.track);

      /* Barre de progression — segments remplis à l'ouverture */
      if (CONFIG.showProgress) {
        this.progressBar = document.createElement("div");
        this.progressBar.className = "vs-progress-bar";
        wrapper.appendChild(this.progressBar);
      }

      /* Bouton fermer */
      const closeBtn = document.createElement("button");
      closeBtn.className = "vs-close-btn";
      closeBtn.setAttribute("aria-label", "Fermer");
      closeBtn.innerHTML = ICONS.close;
      closeBtn.addEventListener("click", () => this.closeLightbox());
      wrapper.appendChild(closeBtn);

      /* Bouton mute */
      this.muteBtn = document.createElement("button");
      this.muteBtn.className = "vs-mute-btn";
      this.muteBtn.setAttribute("aria-label", "Son");
      this.muteBtn.innerHTML = this.isMuted ? ICONS.mute : ICONS.unmute;
      wrapper.appendChild(this.muteBtn);

      /* Flèches */
      if (CONFIG.showNavArrows) {
        this.btnPrev = document.createElement("button");
        this.btnPrev.className = "vs-nav-btn vs-prev";
        this.btnPrev.setAttribute("aria-label", "Précédent");
        this.btnPrev.innerHTML = ICONS.prev;
        wrapper.appendChild(this.btnPrev);

        this.btnNext = document.createElement("button");
        this.btnNext.className = "vs-nav-btn vs-next";
        this.btnNext.setAttribute("aria-label", "Suivant");
        this.btnNext.innerHTML = ICONS.next;
        wrapper.appendChild(this.btnNext);
      }

      lb.appendChild(wrapper);
      document.body.appendChild(lb);
      this._lightbox = lb;

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
        console.log(`[VS] Vidéo ${i} chargée : ${this.activeStories[i].videoSrc}`);
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

      /* Flèches */
      if (CONFIG.showNavArrows) {
        this.btnPrev.addEventListener("click", (e) => { e.stopPropagation(); this.prev(); });
        this.btnNext.addEventListener("click", (e) => { e.stopPropagation(); this.next(); });
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
      });
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
      if (CONFIG.autoplay) video.play().catch(() => {});
      this._startProgTimer();
      if (CONFIG.autoAdvance) this._startAutoTimer();
    }


    /* ══════════════════════════════════════════
       UI
    ══════════════════════════════════════════ */
    updateUI() {
      if (CONFIG.showNavArrows && this.btnPrev && this.btnNext) {
        this.btnPrev.classList.toggle("vs-hidden", this.currentIndex === 0);
        this.btnNext.classList.toggle("vs-hidden", this.currentIndex === this.activeStories.length - 1);
      }
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
