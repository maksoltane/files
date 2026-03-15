# WP Video Stories & Shorts

Deux scripts JavaScript autonomes pour afficher des vidéos courtes (stories / shorts) sur un site WordPress, sans dépendance externe. Conçus pour être insérés via un **bloc HTML personnalisé**.

---

## Composants

| Fichier | Style | Aperçu |
|---------|-------|--------|
| `wp-video-stories.js` | Cercles Instagram Stories | Rangée de cercles cliquables → lightbox plein écran |
| `wp-video-shorts.js` | Carousel PlayShorts / Reels | Cartes vidéo verticales en slider → lightbox plein écran |

---

## 1. WP Video Stories — Cercles + Lightbox

### Aperçu

Rangée horizontale de cercles (type Instagram Stories). Clic sur un cercle → lightbox plein écran avec slider vidéo, barre de progression, navigation swipe, auto-avance.

### Installation WordPress

1. Uploader `wp-video-stories.js` dans la médiathèque ou `/wp-content/uploads/`
2. Ajouter un **bloc HTML personnalisé** dans la page :

```html
<div data-wp-video-stories>
  <!-- Cercle affiché sur la page -->
  <div class="vs-circle-item">
    <div class="vs-circle-ring">
      <div class="vs-circle-inner">
        <img class="vs-circle-img" src="thumb.jpg" alt="Soins visage">
      </div>
    </div>
    <span class="vs-circle-label">Soins visage</span>
  </div>

  <!-- Vidéos associées (autant que nécessaire) -->
  <div class="vs-story-data"
    data-video="https://monsite.fr/video1.mp4"
    data-poster="https://monsite.fr/poster1.jpg"
    data-title="Soin hydratant"
    data-caption="Soin hydratant profond — résultats après une séance">
  </div>
  <div class="vs-story-data"
    data-video="https://monsite.fr/video2.mp4"
    data-poster="https://monsite.fr/poster2.jpg"
    data-title="Massage relaxant"
    data-caption="Massage relaxant — offrez-vous une pause bien-être">
  </div>
</div>

<script src="/wp-content/uploads/wp-video-stories.js"></script>
```

### Fonctionnalites

- Cercles cliquables avec anneau dégradé
- Lightbox plein écran avec slider horizontal
- Lazy load total (vidéos chargées uniquement à l'ouverture)
- Navigation : swipe, tap zones gauche/droite, clavier
- Auto-avance en fin de vidéo
- Barre de progression temps réel
- Contrôles play/pause + mute/unmute
- Header avec thumbnail + titre + bouton fermer
- Fermeture par X, Escape, ou tap backdrop
- Mobile-first responsive

### Configuration

En haut du fichier, objet `CONFIG` :

```js
const CONFIG = {
  autoplay      : true,   // Lecture auto à l'ouverture
  muted         : true,   // Muet au démarrage (requis pour autoplay)
  autoAdvance   : true,   // Avancer auto en fin de vidéo
  autoAdvanceMs : 15000,  // Fallback durée (ms)
  showProgress  : true,   // Barre de progression
};
```

---

## 2. WP Video Shorts — Carousel Slider

### Aperçu

Carousel horizontal de cartes vidéo verticales (ratio 9:16), inspiré de PlayShorts / Instagram Reels. Hover → preview vidéo animée. Clic → lightbox plein écran.

### Installation WordPress

1. Uploader `wp-video-shorts.js` dans la médiathèque ou `/wp-content/uploads/`
2. Ajouter un **bloc HTML personnalisé** dans la page :

```html
<div data-wp-video-shorts>
  <div class="wvs-card"
    data-video="https://monsite.fr/video1.mp4"
    data-poster="https://monsite.fr/thumb1.webp"
    data-title="Nos patchs boutons">
  </div>
  <div class="wvs-card"
    data-video="https://monsite.fr/video2.mp4"
    data-poster="https://monsite.fr/thumb2.webp"
    data-title="Notre sérum dos">
  </div>
  <div class="wvs-card"
    data-video="https://monsite.fr/video3.mp4"
    data-poster="https://monsite.fr/thumb3.webp"
    data-title="Spray mains lavande">
  </div>
</div>

<script src="/wp-content/uploads/wp-video-shorts.js"></script>
```

### Fonctionnalites

**Carousel**
- Cartes fluides (`clamp()`) — s'adaptent de 320px a 1440px+
- 5 breakpoints : base mobile, SM 640px, MD 768px, LG 1024px, XL 1440px
- Swipe tactile avec inertie/momentum physique
- Snap magnétique sur les cartes
- Rubber-band élastique aux bornes
- Mouse drag sur desktop
- Flèches navigation (masquées sur mobile, visibles tablette+)
- Fade edges sur les bords du carousel
- Auto-scroll optionnel
- Skeleton shimmer pendant le chargement des images

**Lightbox**
- Player plein écran avec barre de progression cliquable
- Tap-to-play/pause sur la vidéo (mobile)
- Compteur de position (3 / 8)
- Temps écoulé / durée totale
- Boutons play/pause + mute/unmute
- Flèches navigation + swipe entre vidéos
- Auto-avance en fin de vidéo
- Navigation clavier (Escape, flèches, espace)

**Performance mobile**
- `IntersectionObserver` pour lazy loading horizontal des posters
- `fetchPriority="high"` sur les 2 premières images
- Pas de `backdrop-filter` sur mobile (GPU)
- Pas de video preview sur appareils tactiles
- `prefers-reduced-motion` respecté

**Accessibilite**
- Touch targets >= 44px (Apple HIG)
- `safe-area-inset` pour iPhone notch / Dynamic Island
- `100dvh` (fix iOS Safari address bar)
- `touch-action: pan-y` (pas de conflit avec geste "back")
- `focus-visible` sur tous les éléments interactifs
- Rôles ARIA : `region`, `list`, `listitem`, `dialog`, `slider`

### Configuration

En haut du fichier, objet `CONFIG` :

```js
const CONFIG = {
  gap: 12,                 // Gap mobile (px)
  gapDesktop: 20,          // Gap desktop (px)
  scrollStepMobile: 1,     // Cartes par clic flèche (mobile)
  scrollStepDesktop: 3,    // Cartes par clic flèche (desktop)
  hoverDelay: 200,         // Délai avant preview hover (ms)
  autoScroll: false,       // Défilement automatique
  autoScrollInterval: 4000,// Intervalle auto-scroll (ms)
  borderRadius: 14,        // Rayon coins cartes (px)
  showArrows: true,        // Afficher les flèches
  showTitle: true,         // Afficher le titre sur les cartes
  titlePosition: "inside", // "inside" (superposé) ou "below" (sous la carte)
  lightbox: true,          // Ouvrir la lightbox au clic
  swipeThreshold: 80,      // Seuil swipe lightbox (px)
  dragThreshold: 8,        // Seuil drag vs tap (px)
  momentumFriction: 0.92,  // Inertie : 0.9=lourd, 0.96=léger
  momentumMultiplier: 0.8, // Multiplicateur vélocité
  rubberBandFactor: 0.35,  // Résistance élastique aux bornes
};
```

---

## Fichiers de test

| Fichier | Description |
|---------|-------------|
| `test.html` | Page de démo pour `wp-video-stories.js` (cercles) |
| `test-shorts.html` | Page de démo pour `wp-video-shorts.js` (carousel) |

Ouvrir directement dans un navigateur — aucun serveur requis.

---

## Formats vidéo recommandés

| Paramètre | Valeur recommandée |
|------------|--------------------|
| Format | MP4 (H.264) |
| Ratio | 9:16 (vertical / portrait) |
| Résolution | 1080 x 1920 (Full HD vertical) |
| Durée | 15-60 secondes |
| Taille max | < 10 Mo par vidéo |
| Posters | WebP ou JPG, mêmes dimensions |

---

## Compatibilité navigateurs

- Chrome / Edge 90+
- Firefox 90+
- Safari 15+ (iOS 15+)
- Samsung Internet 15+

Requis : `IntersectionObserver`, `ResizeObserver`, `CSS aspect-ratio`, `CSS clamp()`.

---

## Licence

Usage libre — aucune dépendance externe.
