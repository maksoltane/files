# Prompt amélioré pour Claude Code
# Composant "WP Video Stories" pour WordPress

## Le prompt optimisé à utiliser dans Claude Code :

---

Crée un composant WordPress "Video Stories" — cercles cliquables (type Instagram Stories) qui ouvrent une lightbox avec slider vidéo horizontal.

### Architecture : un bloc WordPress par story

Chaque story est un bloc HTML indépendant `<div data-wp-video-stories>` contenant :
- **1 cercle** (`vs-circle-item`) — image + titre affichés sur la page
- **1 ou plusieurs vidéos** (`vs-story-data`) — chargées uniquement à l'ouverture

Le JS fusionne automatiquement tous les blocs de la page en un seul player.

### Structure HTML d'un bloc :

```html
<div data-wp-video-stories>

  <!-- Cercle affiché sur la page -->
  <div class="vs-circle-item">
    <div class="vs-circle-ring">
      <div class="vs-circle-inner">
        <img class="vs-circle-img" src="thumb.jpg" alt="Titre" loading="lazy">
        <!-- si pas d'image : cercle coloré par défaut -->
      </div>
    </div>
    <span class="vs-circle-label">Titre</span>
  </div>

  <!-- Une ou plusieurs vidéos pour ce cercle -->
  <div class="vs-story-data"
    data-video="video.mp4"
    data-poster="poster.jpg"
    data-title="Titre court"
    data-caption="Texte affiché dans la lightbox">
  </div>

</div>
```

### Spécifications `wp-video-stories.js` :

**Initialisation (`initAllStories`) :**
- Sélectionner tous les `[data-wp-video-stories]:not([data-vs-ready])`
- Construire un tableau de groupes : `{ circleItem, stories[] }` par bloc
- Créer un conteneur combiné avec `<div class="vs-circles">` agrégant tous les cercles
- Remplacer les blocs originaux par le conteneur combiné
- Marquer `data-vs-ready` pour éviter la double-initialisation (ex. : Gutenberg)
- Exposer `window.WPVideoStories` et gérer `DOMContentLoaded`

**Cercles (`buildCircles`) :**
- Réutiliser les `vs-circle-item` existants du HTML (progressive enhancement)
- Clic sur cercle `i` → `openLightboxGroup(i)` : ouvre la lightbox avec uniquement les vidéos de ce groupe
- Anneau dégradé Instagram (`linear-gradient(135deg, #f09433 … #bc1888)`)
- Rangée horizontale scrollable (`overflow-x: auto`, `scrollbar-width: none`)
- `flex-shrink: 0` sur chaque item, `cursor: pointer`, tap feedback `scale(.9)`

**Lightbox (`buildLightbox`, lazy) :**
- Overlay `position: fixed; z-index: 999999` (au-dessus barre admin WordPress 99999)
- Wrapper slider : mobile plein écran (`100svh`) ; tablet ≥640px `aspect-ratio:9/16, max-width:360px, border-radius:14px` ; desktop ≥1024px `max-width:420px`
- Track : `scroll-snap-type: x mandatory`, `touch-action: pan-x`, `scrollbar-width: none`
- Barre de progression segmentée en haut (segments past/active/future via `timeupdate`)
- Bouton fermer (X), bouton mute/unmute, flèches prev/next (masquées sur mobile)

**Ouverture par groupe (`openLightboxGroup`) :**
- Définir `activeStories = groups[i].stories`
- Appeler `_buildGroupSlides(activeStories)` : recréer slides + segments de progression
- Listener `ended` attaché directement sur chaque `<video>` dans `_buildGroupSlides` (l'événement `ended` ne bulle pas)
- Listener click sur slides via **délégation sur `this.track`** (fonctionne après chaque rebuild)
- Charger les 2 premières vidéos (`_loadVideoSrc`), ouvrir à index 0
- `document.body.style.overflow = "hidden"` à l'ouverture, restauré à la fermeture

**Navigation :**
- Swipe mobile : `scrollend` (avec fallback debounce 350ms)
- Flag `_programmaticScroll` pour éviter la re-entrance lors du scroll programmatique
- Flag `_swiping` (`touchstart`/`touchmove`) pour bloquer le click post-swipe
- `next()` / `prev()` sans wrap-around (s'arrête aux extrémités)

**Lazy loading vidéo :**
- `preload="none"` sur tous les `<video>`, `src` vide jusqu'à l'ouverture
- `_loadVideoSrc(i)` : set `src` uniquement si absent + `preload="auto"`
- Pré-charger la vidéo courante + suivante à chaque navigation

**Auto-avance :**
- Fallback timeout (`autoAdvanceMs: 15000`) si la vidéo ne se charge pas
- Progression temps réel via `video.addEventListener("timeupdate", ...)`
- `_clearProgTimer()` nettoie le listener `timeupdate` précédent

### Contraintes :
- Vanilla JS uniquement, zéro dépendance
- Compatible Safari iOS : `playsinline`, `webkit-playsinline`, `muted` sur `<video>`
- CSS injecté une seule fois via `<style id="vs-styles">` (guard `getElementById`)
- Toutes les classes préfixées `vs-` (pas de conflits avec thème WordPress)
- Accessibilité : `aria-label` sur tous les boutons, `role="dialog" aria-modal="true"` sur la lightbox
- Sécurité : caption via `textContent` (jamais `innerHTML` avec données utilisateur)
- Méthode `destroy()` : pause vidéos, vide `src`, retire la lightbox du DOM

---

## Intégration sur le site WordPress

### Chemin FTP
```
/SW-GDB-V3/wp-content/themes/flatsome-child/js/wp-video-stories.js
```

### Étape 1 — Uploader le fichier JS via FTP
Déposer `wp-video-stories.js` dans :
```
/SW-GDB-V3/wp-content/themes/flatsome-child/js/
```

### Étape 2 — Enqueuer dans `functions.php`
Ouvrir `/SW-GDB-V3/wp-content/themes/flatsome-child/functions.php` et ajouter :

```php
function vs_enqueue() {
    wp_enqueue_script(
        'wp-video-stories',
        get_stylesheet_directory_uri() . '/js/wp-video-stories.js',
        [],
        '1.0.0',
        true // chargé en footer
    );
}
add_action( 'wp_enqueue_scripts', 'vs_enqueue' );
```

> **Note :** `get_stylesheet_directory_uri()` pointe vers le thème enfant (`flatsome-child`), ce qui est correct.

### Étape 3 — Ajouter le HTML dans la page WordPress

Dans l'éditeur Gutenberg, ajouter un bloc **HTML personnalisé** par cercle :

```html
<!-- Cercle 1 : 3 vidéos -->
<div data-wp-video-stories>
  <div class="vs-circle-item">
    <div class="vs-circle-ring">
      <div class="vs-circle-inner">
        <img class="vs-circle-img" src="URL_MINIATURE.jpg" alt="Soins" loading="lazy">
      </div>
    </div>
    <span class="vs-circle-label">Soins</span>
  </div>
  <div class="vs-story-data"
    data-video="URL_VIDEO_1.mp4"
    data-poster="URL_POSTER_1.jpg"
    data-caption="Votre texte story 1">
  </div>
  <div class="vs-story-data"
    data-video="URL_VIDEO_2.mp4"
    data-poster="URL_POSTER_2.jpg"
    data-caption="Votre texte story 2">
  </div>
</div>

<!-- Cercle 2 : 1 vidéo -->
<div data-wp-video-stories>
  <div class="vs-circle-item">
    <div class="vs-circle-ring">
      <div class="vs-circle-inner">
        <img class="vs-circle-img" src="URL_MINIATURE_2.jpg" alt="Diagnostic" loading="lazy">
      </div>
    </div>
    <span class="vs-circle-label">Diagnostic</span>
  </div>
  <div class="vs-story-data"
    data-video="URL_VIDEO_3.mp4"
    data-poster="URL_POSTER_3.jpg"
    data-caption="Votre texte story 3">
  </div>
</div>
```

> Le JS fusionne automatiquement tous les blocs en une seule rangée de cercles.

### Étape 4 — Corriger le style pour la barre admin WordPress

Le fichier `wp-video-stories.js` contient déjà ces corrections intégrées :
- ✅ Hauteur mobile : `height: 100vh; height: 100svh;` (fallback iOS)
- ✅ Barre admin : `.admin-bar .vs-lightbox { top: 32px; }` (desktop) et `46px` (mobile)

Aucun CSS supplémentaire n'est nécessaire.

### Résumé des fichiers à modifier

| Fichier | Action |
|---|---|
| `/js/wp-video-stories.js` | Uploader via FTP |
| `functions.php` | Ajouter l'enqueue |
| Page WordPress | Ajouter blocs HTML personnalisés |

---

## Ce qui a changé par rapport à la v1 :

| Aspect | v1 (scroll vertical) | v2 (cercles + lightbox) |
|--------|---------------------|------------------------|
| Affichage initial | Slider vidéo plein écran | Rangée de cercles légers |
| Performance | Toutes vidéos chargées | Lazy total — src vide jusqu'au clic |
| Structure HTML | Un seul bloc global | Un bloc par story (compatible Gutenberg) |
| Vidéos par cercle | 1:1 | 1 cercle → N vidéos |
| Listeners slides | Attachés une fois | Délégation sur track (rebuild-safe) |
| WordPress z-index | 9999 (sous admin bar) | 999999 (au-dessus de tout) |
| Double-init | Possible | Bloquée par `data-vs-ready` |
| Boutons sociaux | Like / Comment / Share | Supprimés |

