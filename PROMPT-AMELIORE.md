# Prompt amélioré pour Claude Code
# Vidéos verticales type Stories pour WordPress

## Le prompt optimisé à utiliser dans Claude Code :

---

Crée un composant WordPress "Video Stories" avec défilement vertical snap (type TikTok/Instagram Reels).

### Spécifications techniques :
1. **Fichier JS** (`wp-video-stories.js`) — classe réutilisable `WPVideoStories` :
   - Scroll snap vertical (`scroll-snap-type: y mandatory`) dans un container 9:16
   - Autoplay de la vidéo visible via IntersectionObserver (seuil 60%)
   - Pause automatique des vidéos hors viewport
   - Lazy loading : `preload="none"` sauf la 1ère vidéo, pré-charge la suivante
   - Bouton mute/unmute global (démarrage muet requis pour autoplay navigateur)
   - Barre de progression segmentée en haut (segments past / active / future)
   - Progression en temps réel via `timeupdate` sur chaque vidéo
   - Tap sur la vidéo = play/pause avec indicateur central animé
   - Boutons d'action latéraux : like (avec toggle animation), comment, share
   - Hint de scroll animé (chevron bounce) qui disparaît après premier scroll
   - Responsive : max-width 420px centré sur desktop, plein écran sur mobile (<480px)
   - Initialisation automatique sur `[data-wp-video-stories]`, exposé en `window.WPVideoStories`
   - Méthode `destroy()` pour nettoyage propre

2. **Bloc HTML** (`wp-video-stories-block.html`) — prêt à coller dans WordPress :
   - CSS complet avec préfixes webkit, backdrop-filter, dvh pour mobile
   - Structure de données déclarative via `<div class="vs-story-data">` avec attributs `data-*`
   - Chaque story : data-video, data-poster, data-user, data-avatar (optionnel), data-caption, data-color
   - Commentaires en français pour guider l'utilisateur non-technique
   - Options d'inclusion du JS (fichier externe ou inline)

### Contraintes :
- Vanilla JS uniquement, pas de dépendances externes
- Compatible Safari iOS (playsinline, webkit-playsinline)
- Pas de conflits CSS (préfixer toutes les classes avec `vs-`)
- Accessibilité : aria-labels sur les boutons
- Performance : pas de reflow/repaint inutile dans le scroll handler (debounce)

---

## Pourquoi ce prompt est meilleur :

| Aspect | Avant (original) | Après (amélioré) |
|--------|-----------------|-------------------|
| Clarté | "scrptjs et bloc code html" | Noms de fichiers précis, structure claire |
| Specs | Aucune | IntersectionObserver, scroll-snap, lazy loading |
| Mobile | Non mentionné | Responsive, dvh, playsinline, tactile |
| Qualité | Vague | Préfixage CSS, a11y, debounce, destroy() |
| Format | Texte brut | Sections numérotées, contraintes séparées |
