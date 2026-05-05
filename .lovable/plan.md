
# Refonte modale "Modifier le passeport fiscal"

## Vue d'ensemble

Trois chantiers parallèles :
- **A** — Migration des données (Markdown → HTML) + adaptation du rendu user
- **B** — Refonte UI de la modale d'édition (sections WYSIWYG + matching visuel)
- **C** — Upload d'images dans le bucket existant `passeports-images`

⚠️ **Contrainte mémoire projet** : TipTap est verrouillé en v2.10.4 avec extensions individuelles (PAS de `@tiptap/starter-kit`). Je remplacerai donc StarterKit par les extensions atomiques équivalentes (Document, Paragraph, Text, Bold, Italic, Strike, Heading, BulletList, OrderedList, ListItem, Blockquote, History, HardBreak). Cela suit le pattern déjà utilisé dans `RichTextEditor.tsx`.

---

## PARTIE A — Migration Markdown → HTML

### A1. Edge function de migration one-shot

Créer `supabase/functions/migrate-passeports-md-to-html/index.ts` :
- Récupère tous les passeports : `select id, contenu_sections`
- Pour chaque section : si `content_md` existe et `content_html` absent → convertit avec `marked` (import depuis CDN esm.sh) → renomme la clé
- Idempotent : section avec déjà `content_html` est laissée intacte
- `update` ligne par ligne
- Authentifié admin uniquement (vérif JWT + `is_admin`)
- Renvoie un rapport `{ migrated, skipped, errors }`

Je l'invoquerai une fois après déploiement, puis on pourra la supprimer (ou la garder désactivée).

### A2. Rendu côté user

Fichiers concernés :
- `src/components/dashboard/PasseportFiscalCard.tsx` (rendu principal)
- `src/components/admin/FichePreviewDialog.tsx` (s'il rend du markdown de passeport — à vérifier, sinon laisser)

Remplacer `<ReactMarkdown>{section.content_md}</ReactMarkdown>` par :
```tsx
<div
  className="prose prose-sm dark:prose-invert max-w-none"
  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.content_html, sanitizeConfig) }}
/>
```

Créer `src/lib/sanitizeHtml.ts` avec la whitelist demandée (table/thead/tbody/tr/th/td, h1-h4, ul/ol/li, a avec target+rel forcés, img, strong/em, p, blockquote, br, hr).

Compat ascendante : si `content_html` absent mais `content_md` présent (ex. avant migration), fallback en convertissant à la volée avec `marked` côté client. Évite tout écran cassé pendant la fenêtre de déploiement.

### A3. Types

Adapter `PasseportSection` dans `src/hooks/usePasseportFiscal.ts` :
```ts
interface PasseportSection {
  key: string;
  title: string;
  content_html?: string;
  content_md?: string; // legacy, supprimé après migration
}
```

---

## PARTIE B — Refonte de la modale

Localisation : `src/pages/AdminPasseportsFiscaux.tsx` (modale d'édition existante).

### B1. Élargissement modale

`max-w-[1100px] w-[95vw] max-h-[95vh]`, layout en colonnes scrollables.

Encart info bleu en haut avec le wording demandé.

Bouton "Aperçu" dans le header → ouvre un `Sheet` latéral droit avec rendu live (réutilise `PasseportFiscalCard`).

### B2. Composant `SectionsEditor`

Nouveau fichier `src/components/admin/passeports/SectionsEditor.tsx`.

State : `sections: { id: string, key: string, title: string, content_html: string }[]` (id local via `crypto.randomUUID()` au chargement).

Drag & drop via `@dnd-kit/core` + `@dnd-kit/sortable` (déjà utilisé ailleurs dans le projet d'après la memory Admin Tools).

Pour chaque section :
- Header : numéro, poignée drag, boutons ↑/↓/🗑️ (les flèches restent utiles sur mobile/clavier)
- Champ key (input + regex `^[a-z0-9_]+$`) avec aide
- Champ title (input)
- Éditeur TipTap (composant `RichSectionEditor` ci-dessous)

Bouton "+ Ajouter une section" en bas.

### B3. Composant `RichSectionEditor`

Nouveau `src/components/admin/passeports/RichSectionEditor.tsx`.

TipTap v2.10.4 avec extensions individuelles (cf. contrainte mémoire) :
- Document, Paragraph, Text, HardBreak, History
- Bold, Italic, Strike
- Heading (levels 1,2,3)
- BulletList, OrderedList, ListItem
- Blockquote
- Link (configuré target=_blank, rel=noopener)
- Image (inline:false, allowBase64:false)
- Table, TableRow, TableHeader, TableCell (resizable)
- Placeholder

Toolbar (composant `EditorToolbar`) : B / I / S, H1/H2/H3/¶, listes, citation, tableau (popover "X colonnes × Y lignes"), image (déclenche `ImageUploadDialog`), lien (popover URL+texte), undo/redo.

Boutons contextuels tableau : `BubbleMenu` Tiptap quand le curseur est dans une cellule → ajouter/supprimer ligne/colonne, supprimer table.

Output via `editor.getHTML()` → propagé au parent par `onChange`.

### B4. Composant `MatchingBuilder`

Nouveau `src/components/admin/passeports/MatchingBuilder.tsx`.

Définit en dur les fields :
```ts
const FIELDS = [
  { key: 'statut', label: 'Statut professionnel', type: 'select',
    values: [{v:'salarie',l:'Salarié'},{v:'independant',l:'Indépendant'},
             {v:'dirigeant',l:'Dirigeant'},{v:'retraite',l:'Retraité'},
             {v:'etudiant',l:'Étudiant'},{v:'sans_activite',l:'Sans activité'}] },
  { key: 'activite_type', label: "Type d'activité", type: 'select', values: [...] },
  { key: 'regime_fiscal', label: 'Régime fiscal', type: 'select', values: [...] },
  { key: 'regime_social', label: 'Régime social', type: 'select', values: [...] },
  { key: 'situation_familiale', label: 'Situation familiale', type: 'select', values: [...] },
  { key: 'a_enfants_a_charge', label: 'A des enfants à charge', type: 'boolean' },
  { key: 'ca_annuel', label: "Chiffre d'affaires annuel", type: 'number', suffix: '€' },
  { key: 'revenus_annuels', label: 'Revenus annuels', type: 'number', suffix: '€' },
  { key: 'situation_internationale', label: 'Situation internationale', type: 'select', values: [...] },
  { key: 'a_revenus_fonciers', label: 'A des revenus fonciers', type: 'boolean' },
  { key: 'a_lmnp', label: 'A des revenus LMNP', type: 'boolean' },
];
```

Opérateurs par type :
- `select`/text : equals, not_equals, in, not_in
- `number` : equals, greater_than, less_than, between
- `boolean` : equals (vrai/faux)

UI : 2 cards côte à côte (lg+) ou empilées :
- "Toutes ces conditions doivent être remplies (ET)" → `match_all`
- "Au moins une de ces conditions doit être remplie (OU)" → `match_any`

Chaque ligne : `<select field>` `<select operator>` `<input value selon type/op>` `🗑️`. 
- `in`/`not_in` → multi-select via shadcn `Command` + checkboxes
- `between` → 2 inputs

Bouton "+ Ajouter une condition" par bloc.

À la sauvegarde : reconstruit `{ match_all, match_any }`. Si les 2 vides → `AlertDialog` d'avertissement avec "Annuler" / "Enregistrer quand même".

### B5. Validation à l'enregistrement

- ≥1 section
- Tous les `key` matchent `^[a-z0-9_]+$`, non vides, uniques
- Tous les `title` non vides
- Tous les `content_html` non vides (filtre `<p></p>` vide via strip + check trim)

Erreurs affichées inline + toast récap + scroll vers la 1re section invalide.

### B6. Ouverture de la modale

Au mount avec un passeport existant :
- Convertit `contenu_sections.sections` → state `sections` avec `id` local
- Si une section a `content_md` mais pas `content_html` (pré-migration), conversion à la volée avec `marked`
- Convertit `conditions_matching` → states `matchAll`/`matchAny`

À l'enregistrement :
- `contenu_sections = { sections: sections.map(({id, ...rest}) => rest) }`
- `conditions_matching = { match_all: matchAll, match_any: matchAny }`

---

## PARTIE C — Upload d'images

### C1. Composant `ImageUploadDialog`

Nouveau `src/components/admin/passeports/ImageUploadDialog.tsx`.

- `Dialog` shadcn avec zone drag&drop + input file
- Validation : `image/png|jpeg|jpg|webp|gif`, ≤ 2 MB → toast erreur sinon
- Aperçu thumbnail
- Champ "Texte alternatif (alt)" — requis avant validation
- Upload :
  ```ts
  const filename = `${passeportId}/${Date.now()}-${sanitize(file.name)}`;
  await supabase.storage.from('passeports-images').upload(filename, file);
  const { data: { publicUrl } } = supabase.storage.from('passeports-images').getPublicUrl(filename);
  ```
- Callback `onInsert(publicUrl, alt)` → `editor.chain().focus().setImage({ src, alt }).run()`

Pour passer `passeportId` au dialog : prop drillée depuis `SectionsEditor` (lui-même reçoit `passeportId` du parent). En création (id pas encore généré), utiliser un id temporaire `crypto.randomUUID()` créé à l'ouverture de la modale.

---

## Dépendances à installer

```
bun add @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder dompurify marked
bun add -D @types/dompurify
```

(TipTap core + extensions de base + dnd-kit déjà installés d'après la memory.)

⚠️ Forcer toutes les extensions TipTap en `2.10.4` exactement (cf. memory) pour éviter les régressions Vite 5.

---

## Ordre d'exécution

1. Installation des dépendances
2. Création edge function de migration + déploiement + invocation
3. Création du `sanitizeHtml.ts` + adaptation `PasseportFiscalCard` (compat MD/HTML)
4. Refonte modale : `SectionsEditor`, `RichSectionEditor`, `EditorToolbar`, `MatchingBuilder`, `ImageUploadDialog`, panneau Aperçu
5. Branchement dans `AdminPasseportsFiscaux.tsx`
6. Test : ouvrir un passeport, éditer, sauvegarder, vérifier rendu user

---

## Hors-scope (à confirmer)

- Pas de touche au tableau de gestion (liste) des passeports — seules la **modale d'édition** et le **rendu user** changent.
- Pas de modification du schéma DB (la colonne `contenu_sections` reste JSONB).
- Pas de gestion fine des permissions sur le bucket : on suppose les RLS déjà OK comme indiqué.
- Le module 8/dashboard ne sont pas touchés.

Confirmez-vous le plan ? Je peux commencer immédiatement après votre validation.
