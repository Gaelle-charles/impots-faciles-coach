import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

export interface MatchRule {
  field: string;
  operator: string;
  value: unknown;
}

interface FieldDef {
  key: string;
  label: string;
  type: 'select' | 'number' | 'boolean';
  values?: { v: string; l: string }[];
  suffix?: string;
}

const FIELDS: FieldDef[] = [
  { key: 'statut', label: 'Statut professionnel', type: 'select', values: [
    { v: 'salarie', l: 'Salarié' }, { v: 'independant', l: 'Indépendant' },
    { v: 'dirigeant', l: 'Dirigeant' }, { v: 'retraite', l: 'Retraité' },
    { v: 'etudiant', l: 'Étudiant' }, { v: 'sans_activite', l: 'Sans activité' },
  ] },
  { key: 'activite_type', label: "Type d'activité", type: 'select', values: [
    { v: 'liberale', l: 'Libérale' }, { v: 'commerciale', l: 'Commerciale' },
    { v: 'artisanale', l: 'Artisanale' }, { v: 'agricole', l: 'Agricole' },
  ] },
  { key: 'regime_fiscal', label: 'Régime fiscal', type: 'select', values: [
    { v: 'micro_bnc', l: 'Micro-BNC' }, { v: 'micro_bic', l: 'Micro-BIC' },
    { v: 'reel', l: 'Réel' }, { v: 'is', l: 'IS' }, { v: 'ir', l: 'IR' },
  ] },
  { key: 'regime_social', label: 'Régime social', type: 'select', values: [
    { v: 'tns', l: 'TNS' }, { v: 'assimile_salarie', l: 'Assimilé salarié' },
    { v: 'general', l: 'Régime général' },
  ] },
  { key: 'situation_familiale', label: 'Situation familiale', type: 'select', values: [
    { v: 'celibataire', l: 'Célibataire' }, { v: 'marie', l: 'Marié(e)' },
    { v: 'pacs', l: 'Pacsé(e)' }, { v: 'divorce', l: 'Divorcé(e)' }, { v: 'veuf', l: 'Veuf(ve)' },
  ] },
  { key: 'a_enfants_a_charge', label: 'A des enfants à charge', type: 'boolean' },
  { key: 'ca_annuel', label: "Chiffre d'affaires annuel", type: 'number', suffix: '€' },
  { key: 'revenus_annuels', label: 'Revenus annuels', type: 'number', suffix: '€' },
  { key: 'situation_internationale', label: 'Situation internationale', type: 'select', values: [
    { v: 'aucune', l: 'Aucune' }, { v: 'expat', l: 'Expatrié' },
    { v: 'frontalier', l: 'Frontalier' }, { v: 'impatrie', l: 'Impatrié' },
  ] },
  { key: 'a_revenus_fonciers', label: 'A des revenus fonciers', type: 'boolean' },
  { key: 'a_lmnp', label: 'A des revenus LMNP', type: 'boolean' },
];

const OPS_BY_TYPE: Record<FieldDef['type'], { v: string; l: string }[]> = {
  select: [
    { v: 'equals', l: 'est égal à' },
    { v: 'not_equals', l: "n'est pas" },
    { v: 'in', l: 'est parmi' },
    { v: 'not_in', l: "n'est pas parmi" },
  ],
  number: [
    { v: 'equals', l: 'est égal à' },
    { v: 'greater_than', l: 'supérieur à' },
    { v: 'less_than', l: 'inférieur à' },
    { v: 'between', l: 'compris entre' },
  ],
  boolean: [{ v: 'equals', l: 'est' }],
};

function getField(key: string): FieldDef | undefined {
  return FIELDS.find((f) => f.key === key);
}

function ValueInput({
  field,
  operator,
  value,
  onChange,
}: {
  field: FieldDef | undefined;
  operator: string;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (!field) return <Input disabled placeholder="Choisissez un critère" />;

  if (field.type === 'boolean') {
    return (
      <Select value={String(value ?? 'true')} onValueChange={(v) => onChange(v === 'true')}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Vrai</SelectItem>
          <SelectItem value="false">Faux</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (field.type === 'number') {
    if (operator === 'between') {
      const arr = Array.isArray(value) ? value : [0, 0];
      return (
        <div className="flex gap-1 items-center">
          <Input
            type="number"
            value={String(arr[0] ?? '')}
            onChange={(e) => onChange([Number(e.target.value), arr[1]])}
            className="w-24"
          />
          <span className="text-xs text-muted-foreground">et</span>
          <Input
            type="number"
            value={String(arr[1] ?? '')}
            onChange={(e) => onChange([arr[0], Number(e.target.value)])}
            className="w-24"
          />
          {field.suffix && <span className="text-xs text-muted-foreground">{field.suffix}</span>}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={String(value ?? '')}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {field.suffix && <span className="text-xs text-muted-foreground">{field.suffix}</span>}
      </div>
    );
  }

  // select
  if (operator === 'in' || operator === 'not_in') {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="flex flex-wrap gap-1.5 rounded-md border border-input p-2 bg-background min-h-10">
        {field.values?.map((opt) => {
          const checked = arr.includes(opt.v);
          return (
            <button
              type="button"
              key={opt.v}
              onClick={() => {
                onChange(checked ? arr.filter((x) => x !== opt.v) : [...arr, opt.v]);
              }}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                checked ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
              }`}
            >
              {opt.l}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Select value={String(value ?? '')} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Choisir une valeur" /></SelectTrigger>
      <SelectContent>
        {field.values?.map((opt) => (
          <SelectItem key={opt.v} value={opt.v}>{opt.l}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RuleRow({
  rule,
  onChange,
  onRemove,
}: {
  rule: MatchRule;
  onChange: (r: MatchRule) => void;
  onRemove: () => void;
}) {
  const field = getField(rule.field);
  const availableOps = field ? OPS_BY_TYPE[field.type] : OPS_BY_TYPE.select;

  return (
    <div className="grid gap-2 grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] items-start">
      <Select
        value={rule.field}
        onValueChange={(v) => {
          const f = getField(v);
          // reset operator to first available
          const newOp = f ? OPS_BY_TYPE[f.type][0].v : 'equals';
          onChange({ field: v, operator: newOp, value: f?.type === 'boolean' ? true : '' });
        }}
      >
        <SelectTrigger><SelectValue placeholder="Critère" /></SelectTrigger>
        <SelectContent>
          {FIELDS.map((f) => (
            <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={rule.operator}
        onValueChange={(v) => onChange({ ...rule, operator: v, value: v === 'in' || v === 'not_in' || v === 'between' ? [] : rule.value })}
      >
        <SelectTrigger className="md:w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {availableOps.map((o) => (
            <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ValueInput field={field} operator={rule.operator} value={rule.value} onChange={(v) => onChange({ ...rule, value: v })} />

      <Button type="button" variant="outline" size="icon" className="h-9 w-9 text-destructive hover:text-destructive" onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface Props {
  matchAll: MatchRule[];
  matchAny: MatchRule[];
  onChangeAll: (rules: MatchRule[]) => void;
  onChangeAny: (rules: MatchRule[]) => void;
}

export function MatchingBuilder({ matchAll, matchAny, onChangeAll, onChangeAny }: Props) {
  const addRule = (target: 'all' | 'any') => {
    const newRule: MatchRule = { field: '', operator: 'equals', value: '' };
    if (target === 'all') onChangeAll([...matchAll, newRule]);
    else onChangeAny([...matchAny, newRule]);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4 space-y-3 border-2 border-blue-200 dark:border-blue-900">
        <div>
          <Label className="font-heading text-sm font-bold">
            Toutes ces conditions doivent être remplies (ET)
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Le passeport ne sera proposé que si TOUTES ces conditions sont vraies.
          </p>
        </div>
        <div className="space-y-2">
          {matchAll.map((r, i) => (
            <RuleRow
              key={i}
              rule={r}
              onChange={(nr) => onChangeAll(matchAll.map((x, j) => (j === i ? nr : x)))}
              onRemove={() => onChangeAll(matchAll.filter((_, j) => j !== i))}
            />
          ))}
          {matchAll.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Aucune condition.</p>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => addRule('all')}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une condition
        </Button>
      </Card>

      <Card className="p-4 space-y-3 border-2 border-amber-200 dark:border-amber-900">
        <div>
          <Label className="font-heading text-sm font-bold">
            Au moins une de ces conditions doit être remplie (OU)
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Le passeport sera proposé si au moins UNE de ces conditions est vraie.
          </p>
        </div>
        <div className="space-y-2">
          {matchAny.map((r, i) => (
            <RuleRow
              key={i}
              rule={r}
              onChange={(nr) => onChangeAny(matchAny.map((x, j) => (j === i ? nr : x)))}
              onRemove={() => onChangeAny(matchAny.filter((_, j) => j !== i))}
            />
          ))}
          {matchAny.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Aucune condition.</p>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => addRule('any')}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une condition
        </Button>
      </Card>
    </div>
  );
}

export default MatchingBuilder;
