# ADR-004 : Thème personnalisé avec les couleurs Mapado

**Date** : 2026-01-23

**Statut** : Accepté ✅

## Contexte

L'application utilisait le système de thème par défaut de Chakra UI, qui rendait l'interface trop neutre (noir et blanc). Il était difficile de différencier les différentes actions et l'application manquait d'identité visuelle alignée avec la charte graphique Mapado.

## Décision

Nous avons créé un **système de thème personnalisé** pour Chakra UI v3 intégrant la palette de couleurs officielle de Mapado.

### Palette de couleurs Mapado intégrée

#### Couleurs primaires

| Couleur | Hex | Variable | Usage |
|---------|-----|----------|-------|
| **Blue** (brand) | `#00859c` | `$primaryBlue` | Couleur principale, boutons, liens |
| **Orange** (accent) | `#ff4024` | `$primaryOrange` | Actions secondaires, CTA importants |
| **Green** | `#30bf97` | `$primaryGreen` | Succès, validations |

#### Couleurs sémantiques

| Couleur | Hex | Variable | Usage |
|---------|-----|----------|-------|
| **Yellow** | `#ec8d00` | `$alertYellow` | Avertissements |
| **Red** | `#cf1b01` | `$alertRed` | Erreurs, suppressions |

#### Couleurs secondaires

| Couleur | Hex | Variable |
|---------|-----|----------|
| **Black** | `#001c3c` | `$primaryBlack` |
| **Gray** | `#49658d` | `$secondaryGray` |
| **Light gray** | `#d2d7dc` | `$secondaryLightGray` |
| **White** | `#f7f5f7` | `$secondaryWhite` |

#### Couleurs tertiaires

| Couleur | Hex | Variable |
|---------|-----|----------|
| **Purple** | `#a6427f` | `$tertiaryPurple` |
| **Gold** | `#c47618` | `$tertiaryGold` |
| **Cyan** | `#00a7af` | `$tertiaryCyan` |
| **Iris** | `#6263b3` | `$tertiaryIris` |

### Structure du thème

Le thème est organisé en deux niveaux :

1. **Tokens de couleurs** : Définition des nuances (50 à 950) pour chaque couleur principale
2. **Tokens sémantiques** : Mapping contextuel (solid, contrast, fg, muted, subtle, emphasized, focusRing)

```typescript
// app/theme.ts
const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#e6f5f7" },
          // ...
          500: { value: "#00859c" }, // Primary Blue
          // ...
        },
      },
    },
    semanticTokens: {
      colors: {
        brand: {
          solid: { value: "{colors.brand.500}" },
          contrast: { value: "white" },
          fg: { value: { _light: "{colors.brand.700}", _dark: "{colors.brand.300}" }},
          // ...
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
```

### Migration Chakra UI v3

Nous avons également effectué la migration de l'API Chakra UI v2 vers v3 :

- `colorScheme` → `colorPalette`
- Application globale du changement sur tous les boutons

```bash
# Commandes de migration
find app/routes -name "*.tsx" -exec sed -i 's/colorScheme="blue"/colorPalette="brand"/g' {} \;
find app/routes -name "*.tsx" -exec sed -i 's/colorScheme="red"/colorPalette="red"/g' {} \;
```

### Application du thème

Le thème est appliqué globalement via le `ChakraProvider` :

```tsx
// app/root.tsx
import { system } from "~/theme";

<ChakraProvider value={system}>
  {children}
</ChakraProvider>
```

### Composants mis à jour

1. **Header** : Fond `brand.50` avec bordure `brand.200`
2. **Tous les boutons principaux** : `colorPalette="brand"`
3. **Boutons de suppression** : `colorPalette="red"`
4. **Badges** : `colorPalette="brand"`
5. **Progress bar** : `colorPalette="brand"`
6. **Liens de navigation** : Couleurs `brand.600` et `brand.700`

## Raisons

1. **Identité visuelle** : Cohérence avec la charte graphique Mapado
2. **Différenciation** : Les couleurs aident à distinguer les types d'actions
3. **Accessibilité** : Contraste amélioré avec les couleurs de la charte Mapado
4. **Professionnalisme** : Interface plus moderne et engageante
5. **Maintenabilité** : Tokens centralisés, faciles à mettre à jour
6. **Support dark mode** : Les tokens sémantiques préparent le terrain pour un mode sombre

## Alternatives considérées

1. **Utiliser le thème par défaut** : Trop générique, pas d'identité
2. **Variables CSS custom** : Moins puissant que le système de tokens Chakra
3. **Styled-components** : Plus complexe, pas nécessaire avec Chakra

## Conséquences

### Positives
- Interface visuellement cohérente avec la marque Mapado
- Meilleure distinction des actions (création, modification, suppression)
- Tokens réutilisables dans toute l'application
- Préparation pour un éventuel mode sombre
- Auto-complétion TypeScript grâce aux typages générés

### Négatives
- Nécessite de régénérer les types à chaque modification (`npx @chakra-ui/cli typegen`)
- Courbe d'apprentissage pour comprendre le système de tokens

## Maintenance

### Mise à jour des couleurs

Pour modifier une couleur, éditer `app/theme.ts` puis regénérer les types :

```bash
npx @chakra-ui/cli typegen app/theme.ts
```

### Ajout d'une nouvelle palette

1. Ajouter les tokens dans `theme.tokens.colors`
2. Ajouter les tokens sémantiques dans `theme.semanticTokens.colors`
3. Régénérer les types

## Fichiers créés/modifiés

### Créés
- `app/theme.ts` : Configuration du système de thème

### Modifiés
- `app/root.tsx` : Import et application du thème personnalisé
- `app/components/Header.tsx` : Couleurs brand
- Tous les fichiers dans `app/routes/` : Migration `colorScheme` → `colorPalette`

## Références

- [Chakra UI v3 - Customization](https://www.chakra-ui.com/docs/get-started/customization)
- [Chakra UI v3 - Theme Tokens](https://www.chakra-ui.com/docs/theming/tokens)
- [Documentation Mapado - Couleurs](https://docs.mapado.net/makeup/?path=/docs/overview-colors--docs)
