import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface QuestionNodeData {
  question: string;
  options: { key: string; label: string }[];
  selected?: boolean;
}

export default function QuestionNode({ data, selected }: NodeProps) {
  const d = data as unknown as QuestionNodeData;
  return (
    <div
      className="bg-white rounded-xl shadow-sm min-w-[180px] max-w-[220px]"
      style={{ border: `2px solid ${selected ? '#B8913A' : '#1565c0'}` }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#1565c0' }} />
      <div className="px-3 pt-2.5 pb-1">
        <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: '#1565c0' }}>Pytanie</p>
        <p className="text-[10px] font-medium leading-snug" style={{ color: '#1A1208' }}>
          {d.question || <span style={{ color: '#aaa' }}>Brak treści</span>}
        </p>
      </div>
      <div className="px-3 pb-2.5 space-y-1 mt-1">
        {(d.options ?? []).map((opt) => (
          <div key={opt.key} className="flex items-center justify-between">
            <span className="text-[9px]" style={{ color: '#555' }}>
              <span style={{ color: '#B8913A', fontWeight: 700 }}>{opt.key}.</span> {opt.label}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={opt.key}
              style={{ position: 'relative', transform: 'none', top: 'auto', right: 'auto', background: '#1565c0', width: 8, height: 8 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
