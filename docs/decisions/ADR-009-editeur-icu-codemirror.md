# ADR-009 : Éditeur ICU avec CodeMirror

**Date** : 2026-01-25

**Statut** : Accepté

## Contexte

L'éditeur de traduction actuel était un simple `<Textarea>` HTML. Pour un outil de traduction professionnel, il est nécessaire de fournir un éditeur plus avancé qui comprend le format ICU MessageFormat utilisé pour l'internationalisation.

Les besoins identifiés étaient :

- Support du ICU message format
- Coloration syntaxique des éléments variables (`{username}`, `{count, plural, ...}`)
- Validation en temps réel de la syntaxe ICU
- Aperçu du rendu final avec exemples de données

## Décision

Nous avons développé un éditeur personnalisé basé sur **CodeMirror 6** avec intégration du parser **@formatjs/icu-messageformat-parser** pour la validation.

### Choix techniques

#### Pourquoi CodeMirror 6 plutôt que Monaco Editor

| Critère              | CodeMirror 6          | Monaco Editor                     |
| -------------------- | --------------------- | --------------------------------- |
| **Taille bundle**    | ~150KB                | ~2MB                              |
| **Modularité**       | Très modulaire        | Monolithique                      |
| **SSR**              | Supporte lazy loading | Difficile avec SSR                |
| **Personnalisation** | Extensions faciles    | Plus complexe                     |
| **React**            | Via refs, léger       | Package react-monaco-editor lourd |

#### Parser ICU

**Package utilisé** : `@formatjs/icu-messageformat-parser`

- 9M+ téléchargements/semaine
- Maintenu par l'équipe formatjs
- Compatible avec intl-messageformat pour le rendu

**Aucun package CodeMirror existant** pour le langage ICU - nous avons créé un langage personnalisé.

### Architecture

```
app/components/icu-editor/
├── index.ts              # Exports publics
├── IcuEditor.tsx         # Composant principal avec CodeMirror
├── IcuEditorClient.tsx   # Wrapper client-side pour SSR
├── IcuPreview.tsx        # Aperçu du rendu ICU
├── icu-language.ts       # Extension CodeMirror pour la coloration
└── icu-linter.ts         # Validation ICU en temps réel
```

### Fonctionnalités implémentées

#### 1. Coloration syntaxique

Le tokenizer personnalisé identifie et colore :

| Élément                | Couleur            | Exemple                |
| ---------------------- | ------------------ | ---------------------- |
| Variables              | Bleu (`#0550ae`)   | `{username}`           |
| Keywords plural/select | Violet (`#8250df`) | `plural`, `select`     |
| Arguments              | Vert (`#116329`)   | `one`, `other`, `male` |
| Accolades              | Gris (`#6e7781`)   | `{`, `}`               |

#### 2. Validation en temps réel

- Parse le message ICU avec `@formatjs/icu-messageformat-parser`
- Affiche les erreurs de syntaxe en rouge sous l'éditeur
- Indicateur visuel (✓ Syntaxe valide / ⚠ Erreur)

#### 3. Extraction des variables

- Détection automatique des variables dans le message
- Affichage des badges avec les noms des variables
- Alimentation automatique du formulaire d'aperçu

#### 4. Aperçu interactif

- Panneau dépliable pour voir le rendu
- Champs de saisie pour chaque variable détectée
- Rendu en temps réel avec `intl-messageformat`
- Support du locale sélectionné

### Implémentation CodeMirror

#### Extensions utilisées

```typescript
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { linter } from "@codemirror/lint";
```

#### Décorateur personnalisé

```typescript
// icu-language.ts
function createIcuDecorator() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      buildDecorations(view: EditorView): DecorationSet {
        const tokens = tokenizeIcu(doc);
        // Applique les décorations CSS selon le type de token
      }
    },
  );
}
```

#### Linter

```typescript
// icu-linter.ts
export function icuLinter(): Extension {
  return linter((view) => {
    const errors = validateIcuMessage(text);
    return errors.map((e) => ({
      from: e.location?.start.offset ?? 0,
      to: e.location?.end.offset ?? 0,
      severity: "error",
      message: e.message,
    }));
  });
}
```

### Utilisation

```tsx
import { IcuEditorClient } from "~/components/icu-editor";

<IcuEditorClient
  name="translation_fr"
  value={translationValue}
  onChange={(value) => setTranslationValue(value)}
  placeholder="Traduction en français..."
  locale="fr"
  showPreview={true}
/>;
```

### Gestion SSR

CodeMirror nécessite le DOM et ne peut pas être rendu côté serveur. Le composant `IcuEditorClient` :

1. Vérifie si `window` existe
2. Lazy-load le composant `IcuEditor` avec `React.lazy()`
3. Affiche un `Textarea` en fallback pendant le chargement

## Conséquences

### Positives

- ✅ Éditeur professionnel pour les traducteurs
- ✅ Validation en temps réel des erreurs ICU
- ✅ Aperçu immédiat du rendu
- ✅ Bundle léger (~150KB pour CodeMirror)
- ✅ Extensible pour ajouter d'autres fonctionnalités

### Négatives

- ⚠️ Complexité ajoutée pour la maintenance
- ⚠️ Dépendance à CodeMirror 6 (API différente de v5)
- ⚠️ Lazy loading nécessaire pour SSR

## Dépendances ajoutées

```json
{
  "dependencies": {
    "codemirror": "^6.0.2",
    "@codemirror/view": "^6.39.11",
    "@codemirror/state": "^6.5.4",
    "@codemirror/language": "^6.12.1",
    "@codemirror/lint": "^6.9.2",
    "@codemirror/commands": "^6.10.1",
    "@formatjs/icu-messageformat-parser": "^3.5.0",
    "intl-messageformat": "^10.7.16"
  }
}
```

## Références

- [ICU MessageFormat Guide](https://messageformat.github.io/messageformat/guide/)
- [CodeMirror 6 Documentation](https://codemirror.net/docs/)
- [FormatJS ICU Parser](https://formatjs.io/docs/icu-messageformat-parser/)
- [intl-messageformat](https://formatjs.io/docs/intl-messageformat/)
