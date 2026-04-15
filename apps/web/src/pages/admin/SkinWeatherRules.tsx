import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2, Cloud, RefreshCw } from 'lucide-react';
import { isAxiosError } from 'axios';
import { skinWeatherApi } from '@/api/skin-weather.api';

// ─── Condition presets ─────────────────────────────────────────────────────────

type ConditionKey = 'HOT' | 'COLD' | 'HIGH_UV' | 'RAINY' | 'SMOG' | 'HUMID' | 'DRY';

const CONDITION_PRESETS: {
  key: ConditionKey;
  label: string;
  icon: string;
  threshold: string;
  color: string;
  selectedBorder: string;
  selectedBg: string;
  chipColor: string;
}[] = [
  { key: 'HOT',     label: 'Gorąco',     icon: '🌡️', threshold: '>28°C',    color: 'text-orange-500', selectedBorder: 'border-orange-400', selectedBg: 'bg-orange-400/10', chipColor: 'bg-orange-400/15 text-orange-400 border-orange-400/30' },
  { key: 'COLD',    label: 'Zimno',      icon: '❄️', threshold: '<5°C',     color: 'text-cyan-400',   selectedBorder: 'border-cyan-400',   selectedBg: 'bg-cyan-400/10',   chipColor: 'bg-cyan-400/15 text-cyan-400 border-cyan-400/30' },
  { key: 'HIGH_UV', label: 'Wysokie UV', icon: '☀️', threshold: 'UV ≥ 6',  color: 'text-amber-400',  selectedBorder: 'border-amber-400',  selectedBg: 'bg-amber-400/10',  chipColor: 'bg-amber-400/15 text-amber-400 border-amber-400/30' },
  { key: 'RAINY',   label: 'Deszcz',     icon: '🌧️', threshold: 'opady ≥60%', color: 'text-blue-400', selectedBorder: 'border-blue-400',  selectedBg: 'bg-blue-400/10',   chipColor: 'bg-blue-400/15 text-blue-400 border-blue-400/30' },
  { key: 'SMOG',    label: 'Smog',       icon: '🌫️', threshold: 'AQI ≥150', color: 'text-slate-400',  selectedBorder: 'border-slate-400',  selectedBg: 'bg-slate-400/10',  chipColor: 'bg-slate-400/15 text-slate-400 border-slate-400/30' },
  { key: 'HUMID',   label: 'Wilgotno',   icon: '💧', threshold: 'wilg. ≥75%', color: 'text-teal-400', selectedBorder: 'border-teal-400',  selectedBg: 'bg-teal-400/10',   chipColor: 'bg-teal-400/15 text-teal-400 border-teal-400/30' },
  { key: 'DRY',     label: 'Sucho',      icon: '🏜️', threshold: 'wilg. ≤30%', color: 'text-yellow-500', selectedBorder: 'border-yellow-500', selectedBg: 'bg-yellow-500/10', chipColor: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30' },
];

// ─── Form state type ──────────────────────────────────────────────────────────

type FormState = {
  label: string;
  recommendation: string;
  isActive: boolean;
  conditions: ConditionKey[];
};

const EMPTY_FORM: FormState = {
  label: '',
  recommendation: '',
  isActive: true,
  conditions: [],
};

// ─── Form Modal ───────────────────────────────────────────────────────────────

function RuleForm({
  initial,
  onClose,
  onSave,
  isPending,
}: {
  initial: FormState;
  onClose: () => void;
  onSave: (data: FormState) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);

  const toggleCondition = (key: ConditionKey) => {
    setForm(f => ({
      ...f,
      conditions: f.conditions.includes(key)
        ? f.conditions.filter(c => c !== key)
        : [...f.conditions, key],
    }));
  };

  const andLabel = form.conditions.length === 0
    ? null
    : form.conditions
        .map(k => CONDITION_PRESETS.find(p => p.key === k)?.label ?? k)
        .join(' ORAZ ');

  const valid = form.label.trim() && form.recommendation.trim() && form.conditions.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-heading font-semibold text-base">
            {initial.label ? 'Edytuj regułę' : 'Nowa reguła'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nazwa reguły</label>
            <input
              type="text"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="np. Upał i intensywne słońce"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30"
            />
          </div>

          {/* Conditions grid */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Warunki pogodowe{' '}
              <span className="font-normal">(wszystkie muszą być spełnione)</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CONDITION_PRESETS.map(preset => {
                const selected = form.conditions.includes(preset.key);
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => toggleCondition(preset.key)}
                    className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                      selected
                        ? `${preset.selectedBorder} ${preset.selectedBg}`
                        : 'border-border/40 hover:border-border bg-transparent'
                    }`}
                  >
                    {selected && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-foreground text-background text-[9px] flex items-center justify-center font-bold">✓</span>
                    )}
                    <span className="text-xl leading-none">{preset.icon}</span>
                    <span className={`text-xs font-semibold ${selected ? preset.color : 'text-muted-foreground'}`}>{preset.label}</span>
                    <span className="text-[10px] text-muted-foreground">{preset.threshold}</span>
                  </button>
                );
              })}
            </div>
            {andLabel && (
              <div className="mt-3 px-3 py-2 bg-foreground/5 border border-border/40 rounded-lg">
                <p className="text-xs text-foreground">
                  <span className="text-muted-foreground">Aktywuje się gdy: </span>
                  <span className="font-semibold">{andLabel}</span>
                </p>
              </div>
            )}
          </div>

          {/* Recommendation */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Rekomendacja dla klienta</label>
            <textarea
              value={form.recommendation}
              onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))}
              rows={3}
              placeholder="Szczegółowy tekst porady..."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30 resize-none"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              className={`relative rounded-full transition-colors shrink-0 ${form.isActive ? 'bg-foreground' : 'bg-border'}`}
              style={{ width: '2rem', height: '1rem' }}
            >
              <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-background rounded-full shadow transition-transform ${form.isActive ? 'translate-x-4' : ''}`} />
            </button>
            <span className="text-sm text-muted-foreground">Reguła aktywna</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/40 transition-colors">
            Anuluj
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!valid || isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Zapisz
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rule Card ─────────────────────────────────────────────────────────────────

function RuleCard({ rule, onEdit, onDelete }: { rule: any; onEdit: () => void; onDelete: () => void }) {
  const conditions: string[] = rule.conditions ?? [];
  return (
    <div className={`p-4 rounded-xl border-l-4 transition-all ${
      rule.isActive ? 'border-l-foreground/40 border-border/50 bg-card' : 'border-l-border border-border/30 bg-muted/20 opacity-60'
    }`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-sm font-semibold">{rule.label}</span>
            {!rule.isActive && (
              <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">nieaktywna</span>
            )}
          </div>
          {conditions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {conditions.map((key: string) => {
                const preset = CONDITION_PRESETS.find(p => p.key === key);
                if (!preset) return null;
                return (
                  <span key={key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${preset.chipColor}`}>
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                    <span className="opacity-70">{preset.threshold}</span>
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic mb-2">Brak warunków</p>
          )}
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{rule.recommendation}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export const SkinWeatherRules = () => {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);

  const { data: rules = [], isLoading } = useQuery<any[]>({
    queryKey: ['skin-weather', 'rules'],
    queryFn: skinWeatherApi.getRules,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => skinWeatherApi.createRule(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skin-weather', 'rules'] });
      setFormOpen(false);
      toast.success('Reguła dodana');
    },
    onError: () => toast.error('Błąd zapisu'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => skinWeatherApi.updateRule(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skin-weather', 'rules'] });
      setEditingRule(null);
      setFormOpen(false);
      toast.success('Reguła zaktualizowana');
    },
    onError: () => toast.error('Błąd zapisu'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => skinWeatherApi.deleteRule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skin-weather', 'rules'] });
      toast.success('Reguła usunięta');
    },
    onError: () => toast.error('Błąd usuwania'),
  });

  const generateAllMutation = useMutation({
    mutationFn: skinWeatherApi.generateAllReports,
    onSuccess: () => toast.success('Generowanie raportów rozpoczęte (działa w tle)'),
    onError: (err) => {
      const msg = isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg ?? 'Błąd generowania');
    },
  });

  const handleSave = (form: FormState) => {
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const openEdit = (rule: any) => {
    setEditingRule(rule);
    setFormOpen(true);
  };

  const openCreate = () => {
    setEditingRule(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingRule(null);
  };

  const formInitial: FormState = editingRule
    ? {
        label: editingRule.label,
        recommendation: editingRule.recommendation,
        isActive: editingRule.isActive,
        conditions: editingRule.conditions ?? [],
      }
    : EMPTY_FORM;

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-100 dark:bg-sky-900/30 rounded-xl">
            <Cloud className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-semibold">Pogoda dla skóry</h1>
            <p className="text-sm text-muted-foreground">Reguły procentowe dopasowywane do warunków pogodowych</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => generateAllMutation.mutate()}
            disabled={generateAllMutation.isPending}
            title="Wygeneruj raporty dla wszystkich użytkowników bez raportu na dziś"
            className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-xl hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            {generateAllMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RefreshCw className="h-4 w-4" />}
            Generuj dziś
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Dodaj regułę
          </button>
        </div>
      </div>

      {/* Rules list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Ładowanie reguł...</span>
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <Cloud className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Brak reguł</p>
          <p className="text-xs text-muted-foreground mt-1">
            Dodaj pierwszą regułę, aby system zaczął generować raporty.
          </p>
          <button
            onClick={openCreate}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm rounded-xl hover:opacity-90 transition-opacity mx-auto"
          >
            <Plus className="h-4 w-4" />
            Dodaj regułę
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={() => openEdit(rule)}
              onDelete={() => {
                if (confirm(`Usunąć regułę "${rule.label}"?`)) deleteMutation.mutate(rule.id);
              }}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {formOpen && (
        <RuleForm
          initial={formInitial}
          onClose={closeForm}
          onSave={handleSave}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
};

export default SkinWeatherRules;
