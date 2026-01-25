# ADR-003 : Ajout d'icônes avec react-icons

**Date** : 2026-01-23

**Statut** : Accepté ✅

## Contexte

L'interface utilisateur manquait de repères visuels pour différencier les différentes actions. Les boutons étaient uniquement textuels, ce qui rendait l'interface moins intuitive et moins accessible visuellement.

## Décision

Nous avons décidé d'ajouter des icônes à tous les boutons d'action en utilisant la bibliothèque **react-icons** avec les icônes **Lucide** (préfixe `Lu`).

### Icônes ajoutées

| Action          | Icône      | Composant              |
| --------------- | ---------- | ---------------------- |
| Modifier/Éditer | `LuPencil` | Boutons d'édition      |
| Ajouter/Créer   | `LuPlus`   | Boutons de création    |
| Enregistrer     | `LuSave`   | Boutons de sauvegarde  |
| Supprimer       | `LuTrash2` | Boutons de suppression |

### Implémentation

```tsx
import { LuPencil, LuPlus, LuSave, LuTrash2 } from "react-icons/lu";

// Exemple : Bouton avec icône
<Button colorPalette="brand">
  <LuPlus /> Nouvelle clé
</Button>;
```

### Modification spécifique

Pour le bouton d'édition de description, nous avons utilisé un `IconButton` au lieu d'un `Button` standard pour économiser l'espace et le coller directement à côté de la description :

```tsx
<IconButton
  size="xs"
  variant="ghost"
  onClick={() => setIsEditingDescription(true)}
  aria-label="Éditer la description"
>
  <LuPencil />
</IconButton>
```

## Raisons

1. **Amélioration UX** : Les icônes permettent une reconnaissance visuelle rapide des actions
2. **Accessibilité** : Les icônes renforcent le texte pour les utilisateurs ayant des difficultés de lecture
3. **Cohérence** : Utilisation d'un ensemble d'icônes uniforme (Lucide)
4. **Popularité** : react-icons est une bibliothèque mature avec +19k étoiles GitHub
5. **Flexibilité** : Accès à plusieurs sets d'icônes (Lucide, Material, Font Awesome, etc.)
6. **Performance** : Tree-shaking automatique, seules les icônes utilisées sont incluses

## Alternatives considérées

1. **Heroicons** : Bonne alternative mais moins complète que Lucide
2. **Icônes SVG custom** : Plus de maintenance, moins flexible
3. **Font Icon** : Problèmes d'accessibilité et de performance

## Conséquences

### Positives

- Interface plus intuitive et moderne
- Meilleure différenciation visuelle des actions
- Amélioration de l'expérience utilisateur
- Facilité d'ajout de nouvelles icônes

### Négatives

- Dépendance supplémentaire (~82 MB, mais tree-shaking efficace)
- Légère augmentation du bundle (quelques KB)

## Fichiers modifiés

- `package.json` : Ajout de `react-icons@5.5.0`
- `app/routes/orgs.$orgSlug.projects.$projectSlug.keys.$keyId.tsx`
- `app/routes/orgs.$orgSlug.projects.$projectSlug.keys._index.tsx`
- `app/routes/orgs.$orgSlug.projects.$projectSlug._index.tsx`
- `app/routes/orgs.$orgSlug.projects.new.tsx`
- `app/routes/orgs.new.tsx`
- `app/routes/orgs.$orgSlug._index.tsx`
- `app/routes/orgs._index.tsx`

## Références

- [react-icons](https://react-icons.github.io/react-icons/)
- [Lucide Icons](https://lucide.dev/)
