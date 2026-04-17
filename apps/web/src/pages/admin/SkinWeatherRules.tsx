import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2, Cloud, RefreshCw } from 'lucide-react';
import { isAxiosError } from 'axios';
import { skinWeatherApi } from '@/api/skin-weather.api';

// --- Types

type ParamKey = 'temperature' | 'uv' | 'humidity' | 'aqi' | 'precip';
interface ParamRange { min: number; max: number; }

interface SkinWeatherRule {
  id: string; label: string; recommendation: string;
  isActive: boolean; sortOrder: number;
  conditions: string[]; thresholds: Record<string, ParamRange>;
  createdAt: string; updatedAt: string;
}

interface ParamConfig {
  key: ParamKey; label: string; icon: string; unit: string;
  absMin: number; absMax: number; step: number;
  defaultMin: number; defaultMax: number;
  color: string; selectedBorder: string; selectedBg: string; chipColor: string;
}

const PARAM_PRESETS: ParamConfig[] = [
  { key: 'temperature', label: 'Temperatura',  icon: '🌡️', unit: '°C',  absMin: -20, absMax: 45,  step: 1,  defaultMin: 10, defaultMax: 25,  color: 'text-orange-500', selectedBorder: 'border-orange-400', selectedBg: 'bg-orange-400/10', chipColor: 'bg-orange-400/15 text-orange-400 border-orange-400/30' },
  { key: 'uv',          label: 'UV',            icon: '☀️',   unit: '',    absMin: 0,   absMax: 11,  step: 1,  defaultMin: 3,  defaultMax: 7,   color: 'text-amber-400',  selectedBorder: 'border-amber-400',  selectedBg: 'bg-amber-400/10',  chipColor: 'bg-amber-400/15 text-amber-400 border-amber-400/30'   },
  { key: 'humidity',    label: 'Wilgotność',    icon: '💧', unit: '%',   absMin: 0,   absMax: 100, step: 5,  defaultMin: 40, defaultMax: 70,  color: 'text-teal-400',   selectedBorder: 'border-teal-400',   selectedBg: 'bg-teal-400/10',   chipColor: 'bg-teal-400/15 text-teal-400 border-teal-400/30'     },
  { key: 'aqi',         label: 'AQI',           icon: '🌫️', unit: 'AQI', absMin: 0,   absMax: 300, step: 10, defaultMin: 0,  defaultMax: 100, color: 'text-slate-400',  selectedBorder: 'border-slate-400',  selectedBg: 'bg-slate-400/10',  chipColor: 'bg-slate-400/15 text-slate-400 border-slate-400/30'  },
  { key: 'precip',      label: 'Opady',          icon: '🌧️', unit: '%',   absMin: 0,   absMax: 100, step: 5,  defaultMin: 0,  defaultMax: 40,  color: 'text-blue-400',   selectedBorder: 'border-blue-400',   selectedBg: 'bg-blue-400/10',   chipColor: 'bg-blue-400/15 text-blue-400 border-blue-400/30'     },
];

type FormState = {
  label: string; recommendation: string; isActive: boolean;
  conditions: ParamKey[]; thresholds: Record<ParamKey, ParamRange>;
};

const buildDefaultThresholds = (): Record<ParamKey, ParamRange> =>
  Object.fromEntries(PARAM_PRESETS.map(p => [p.key, { min: p.defaultMin, max: p.defaultMax }])) as Record<ParamKey, ParamRange>;

const EMPTY_FORM: FormState = { label: '', recommendation: '', isActive: true, conditions: [], thresholds: buildDefaultThresholds() };
// --- RangeInput

function RangeInput({ preset, range, onChange }: {
  preset: ParamConfig; range: ParamRange; onChange: (r: ParamRange) => void;
}) {
  const setMin = (v: number) => onChange({ min: Math.min(v, range.max - preset.step), max: range.max });
  const setMax = (v: number) => onChange({ min: range.min, max: Math.max(v, range.min + preset.step) });
  return (
    <div className="px-3 py-3 rounded-xl bg-muted/40 border border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{preset.icon}</span>
        <span className={`text-xs font-semibold ${preset.color}`}>{preset.label}</span>
        <span className="ml-auto text-sm font-bold tabular-nums">{range.min}{preset.unit} – {range.max}{preset.unit}</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground w-5 shrink-0">od</span>
          <input type="range" min={preset.absMin} max={preset.absMax} step={preset.step} value={range.min}
            onChange={e => setMin(Number(e.target.value))} className="flex-1 h-1.5 rounded-full cursor-pointer" />
          <span className={`text-xs font-medium tabular-nums w-14 text-right ${preset.color}`}>{range.min}{preset.unit}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground w-5 shrink-0">do</span>
          <input type="range" min={preset.absMin} max={preset.absMax} step={preset.step} value={range.max}
            onChange={e => setMax(Number(e.target.value))} className="flex-1 h-1.5 rounded-full cursor-pointer" />
          <span className={`text-xs font-medium tabular-nums w-14 text-right ${preset.color}`}>{range.max}{preset.unit}</span>
        </div>
      </div>
    </div>
  );
}
// --- RuleForm

function RuleForm({ initial, onClose, onSave, isPending }: {
  initial: FormState; onClose: () => void; onSave: (data: FormState) => void; isPending: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);

  const toggleParam = (key: ParamKey) => {
    setForm(f => ({ ...f, conditions: f.conditions.includes(key) ? f.conditions.filter(c => c !== key) : [...f.conditions, key] }));
  };
  const setRange = (key: ParamKey, range: ParamRange) => {
    setForm(f => ({ ...f, thresholds: { ...f.thresholds, [key]: range } }));
  };

  const preview = form.conditions.length === 0 ? null
    : form.conditions.map(k => {
        const p = PARAM_PRESETS.find(p => p.key === k)!;
        const r = form.thresholds[k];
        return `${p.label}: ${r.min}${p.unit}–${r.max}${p.unit}`;
      }).join(' ORAZ ');

  const valid = form.label.trim() && form.recommendation.trim() && form.conditions.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-heading font-semibold text-base">{initial.label ? 'Edytuj regułę' : 'Nowa reguła'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nazwa reguły</label>
            <input type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="np. Łagodna temperatura z umiarkowanym UV"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Parametry pogodowe <span className="font-normal">(zaznacz i ustaw zakres od–do; wszystkie muszą być spełnione jednocześnie)</span>
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
              {PARAM_PRESETS.map(preset => {
                const selected = form.conditions.includes(preset.key);
                return (
                  <button key={preset.key} type="button" onClick={() => toggleParam(preset.key)}
                    className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${selected ? `${preset.selectedBorder} ${preset.selectedBg}` : 'border-border/40 hover:border-border bg-transparent'}`}
                  >
                    {selected && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-foreground text-background text-[9px] flex items-center justify-center font-bold">✓</span>}
                    <span className="text-xl leading-none">{preset.icon}</span>
                    <span className={`text-[11px] font-semibold ${selected ? preset.color : 'text-muted-foreground'}`}>{preset.label}</span>
                  </button>
                );
              })}
            </div>
            {form.conditions.length > 0 && (
              <div className="space-y-2">
                {form.conditions.map(key => {
                  const preset = PARAM_PRESETS.find(p => p.key === key)!;
                  return <RangeInput key={key} preset={preset} range={form.thresholds[key]} onChange={r => setRange(key, r)} />;
                })}
              </div>
            )}
            {preview && (
              <div className="mt-3 px-3 py-2 bg-foreground/5 border border-border/40 rounded-lg">
                <p className="text-xs"><span className="text-muted-foreground">Aktywuje się gdy: </span><span className="font-semibold">{preview}</span></p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Rekomendacja dla klienta</label>
            <textarea value={form.recommendation} onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))}
              rows={3} placeholder="Szczegółowy tekst porady..."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30 resize-none" />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              className={`relative rounded-full transition-colors shrink-0 ${form.isActive ? 'bg-foreground' : 'bg-border'}`}
              style={{ width: '2rem', height: '1rem' }}>
              <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-background rounded-full shadow transition-transform ${form.isActive ? 'translate-x-4' : ''}`} />
            </button>
            <span className="text-sm text-muted-foreground">Reguła aktywna</span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/40 transition-colors">Anuluj</button>
          <button onClick={() => onSave(form)} disabled={!valid || isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Zapisz
          </button>
        </div>
      </div>
    </div>
  );
}
// --- RuleCard

function RuleCard({ rule, onEdit, onDelete }: { rule: SkinWeatherRule; onEdit: () => void; onDelete: () => void }) {
  const conditions = rule.conditions ?? [];
  const thresholds = rule.thresholds ?? {};
  return (
    <div className={`p-4 rounded-xl border-l-4 transition-all ${rule.isActive ? 'border-l-foreground/40 border-border/50 bg-card' : 'border-l-border border-border/30 bg-muted/20 opacity-60'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-sm font-semibold">{rule.label}</span>
            {!rule.isActive && <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">nieaktywna</span>}
          </div>
          {conditions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {conditions.map((key: string) => {
                const preset = PARAM_PRESETS.find(p => p.key === key);
                if (!preset) return null;
                const range: ParamRange | undefined = thresholds[key];
                return (
                  <span key={key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${preset.chipColor}`}>
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                    {range && <span className="font-medium">{range.min}–{range.max}{preset.unit}</span>}
                  </span>
                );
              })}
            </div>
          ) : <p className="text-xs text-muted-foreground italic mb-2">Brak parametrów</p>}
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{rule.recommendation}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}
// --- SkinTypeAdviceTab

const SKIN_TYPE_ADVICE_META = [
  { key: 'SUCHA',    label: 'Sucha',    emoji: '🌵', desc: 'Łuszczy się, ciągnie, potrzebuje nawilżenia' },
  { key: 'TLUSTA',   label: 'Tłusta',   emoji: '✨', desc: 'Połysk, rozszerzone pory, przetłuszczanie' },
  { key: 'MIESZANA', label: 'Mieszana', emoji: '⚖️', desc: 'Strefa T tłusta, reszta normalna lub sucha' },
  { key: 'NORMALNA', label: 'Normalna', emoji: '🌸', desc: 'Zrównoważona, bez problemów' },
  { key: 'WRAZLIWA', label: 'Wrażliwa', emoji: '🌹', desc: 'Reaktywna, łatwo się czerwieni, podrażniona' },
];

function SkinTypeAdviceTab() {
  const qc = useQueryClient();
  const [contents, setContents] = useState<Record<string, string>>({});

  const { data: adviceList = [] } = useQuery({
    queryKey: ['admin', 'skin-type-advice'],
    queryFn: skinWeatherApi.getSkinTypeAdvice,
  });

  useEffect(() => {
    if (adviceList && adviceList.length > 0) {
      const map: Record<string, string> = {};
      adviceList.forEach((item: { skinType: string; content: string }) => {
        map[item.skinType] = item.content;
      });
      setContents(map);
    }
  }, [adviceList]);

  const saveMutation = useMutation({
    mutationFn: ({ skinType, content }: { skinType: string; content: string }) =>
      skinWeatherApi.updateSkinTypeAdvice(skinType, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'skin-type-advice'] });
      toast.success('Porady zapisane');
    },
    onError: () => toast.error('Błąd zapisu'),
  });

  const getUpdatedAt = (skinType: string): string | null => {
    const item = adviceList?.find((i: { skinType: string; updatedAt?: string }) => i.skinType === skinType);
    return item?.updatedAt ?? null;
  };

  return (
    <div className="space-y-4">
      {SKIN_TYPE_ADVICE_META.map(meta => {
        const updatedAt = getUpdatedAt(meta.key);
        return (
          <div key={meta.key} className="p-5 rounded-xl border border-border/50 bg-card">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl leading-none">{meta.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{meta.label}</span>
                  {updatedAt && (
                    <span className="text-xs text-muted-foreground">
                      Zaktualizowano: {new Date(updatedAt).toLocaleDateString('pl-PL')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
              </div>
            </div>
            <textarea
              rows={4}
              value={contents[meta.key] ?? ''}
              onChange={e => setContents(prev => ({ ...prev, [meta.key]: e.target.value }))}
              placeholder={`Wpisz porady dla skóry ${meta.label.toLowerCase()}...`}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30 resize-none mb-3"
            />
            <div className="flex justify-end">
              <button
                onClick={() => saveMutation.mutate({ skinType: meta.key, content: contents[meta.key] ?? '' })}
                disabled={saveMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Zapisz
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Main Page

export const SkinWeatherRules = () => {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'rules' | 'advice'>('rules');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SkinWeatherRule | null>(null);

  const { data: rules = [], isLoading } = useQuery<SkinWeatherRule[]>({
    queryKey: ['skin-weather', 'rules'],
    queryFn: skinWeatherApi.getRules,
  });

  const createMutation = useMutation({
    mutationFn: (data: FormState) => skinWeatherApi.createRule(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skin-weather', 'rules'] }); setFormOpen(false); toast.success('Reguła dodana'); },
    onError: () => toast.error('Błąd zapisu'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormState }) => skinWeatherApi.updateRule(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skin-weather', 'rules'] }); setEditingRule(null); setFormOpen(false); toast.success('Reguła zaktualizowana'); },
    onError: () => toast.error('Błąd zapisu'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => skinWeatherApi.deleteRule(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skin-weather', 'rules'] }); toast.success('Reguła usunięta'); },
    onError: () => toast.error('Błąd usuwania'),
  });

  const generateAllMutation = useMutation({
    mutationFn: skinWeatherApi.generateAllReports,
    onSuccess: () => toast.success('Generowanie raportów rozpoczęte (działa w tle)'),
    onError: (err) => { const msg = isAxiosError(err) ? err.response?.data?.message : null; toast.error(msg ?? 'Błąd generowania'); },
  });

  const handleSave = (form: FormState) => {
    if (editingRule) updateMutation.mutate({ id: editingRule.id, data: form });
    else createMutation.mutate(form);
  };

  const openEdit = (rule: SkinWeatherRule) => { setEditingRule(rule); setFormOpen(true); };
  const openCreate = () => { setEditingRule(null); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditingRule(null); };

  const formInitial: FormState = editingRule
    ? {
        label: editingRule.label,
        recommendation: editingRule.recommendation,
        isActive: editingRule.isActive,
        conditions: (editingRule.conditions ?? []) as ParamKey[],
        thresholds: { ...buildDefaultThresholds(), ...(editingRule.thresholds ?? {}) },
      }
    : EMPTY_FORM;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-100 dark:bg-sky-900/30 rounded-xl"><Cloud className="h-5 w-5 text-sky-600 dark:text-sky-400" /></div>
          <div>
            <h1 className="font-heading text-xl font-semibold">Twoja Skóra</h1>
            <p className="text-sm text-muted-foreground">Reguły z zakresami parametrów pogodowych od–do</p>
          </div>
        </div>
        {activeTab === 'rules' && (
          <div className="flex items-center gap-2">
            <button onClick={() => generateAllMutation.mutate()} disabled={generateAllMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-xl hover:bg-muted/40 transition-colors disabled:opacity-50">
              {generateAllMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Generuj dziś
            </button>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-medium rounded-xl hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4" /> Dodaj regułę
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1 p-1 bg-muted/30 rounded-xl border w-fit mb-6">
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-1.5 text-sm rounded-lg transition-all ${activeTab === 'rules' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Reguły pogodowe
        </button>
        <button
          onClick={() => setActiveTab('advice')}
          className={`px-4 py-1.5 text-sm rounded-lg transition-all ${activeTab === 'advice' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Porady dla typów skóry
        </button>
      </div>

      {activeTab === 'rules' ? (
        <>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Ładowanie reguł...</span></div>
          ) : rules.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl">
              <Cloud className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Brak reguł</p>
              <p className="text-xs text-muted-foreground mt-1">Dodaj pierwszą regułę, aby system zaczął generować raporty.</p>
              <button onClick={openCreate} className="mt-4 flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm rounded-xl hover:opacity-90 transition-opacity mx-auto">
                <Plus className="h-4 w-4" /> Dodaj regułę
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map(rule => (
                <RuleCard key={rule.id} rule={rule} onEdit={() => openEdit(rule)}
                  onDelete={() => { if (confirm(`Usunąć regułę "${rule.label}"?`)) deleteMutation.mutate(rule.id); }} />
              ))}
            </div>
          )}
          {formOpen && (
            <RuleForm initial={formInitial} onClose={closeForm} onSave={handleSave}
              isPending={createMutation.isPending || updateMutation.isPending} />
          )}
        </>
      ) : (
        <SkinTypeAdviceTab />
      )}
    </div>
  );
};

export default SkinWeatherRules;