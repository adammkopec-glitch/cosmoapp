import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface ResultNodeData {
  title: string;
  subtitle: string;
  description: string;
  extras: string;
  result?: {
    mainServiceId: string | null;
    mainServiceName?: string;
    suggestions: { serviceId: string; order: number }[];
  };
}

export default function ResultNode({ data, selected }: NodeProps) {
  const d = data as ResultNodeData;
  return (
    <div
      className="bg-white rounded-xl shadow-sm min-w-[160px] max-w-[200px]"
      style={{ border: `2px solid ${selected ? '#B8913A' : '#4caf50'}`, background: '#f1f8e9' }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#4caf50' }} />
      <div className="px-3 py-2.5">
        <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: '#2e7d32' }}>🏁 Wynik</p>
        <p className="text-[10px] font-semibold leading-snug" style={{ color: '#1A1208' }}>
          {d.title || <span style={{ color: '#aaa' }}>Brak tytułu</span>}
        </p>
        {d.result?.mainServiceName && (
          <p className="text-[9px] mt-1" style={{ color: '#555' }}>→ {d.result.mainServiceName}</p>
        )}
      </div>
    </div>
  );
}
