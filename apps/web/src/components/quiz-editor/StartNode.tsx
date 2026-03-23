import { Handle, Position } from '@xyflow/react';

export default function StartNode() {
  return (
    <div
      className="px-5 py-2 rounded-full text-white text-xs font-bold select-none"
      style={{ background: '#1A1208', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}
    >
      START
      <Handle type="source" position={Position.Right} id="default" style={{ background: '#B8913A' }} />
    </div>
  );
}
