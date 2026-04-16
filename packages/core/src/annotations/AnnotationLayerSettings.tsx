import React from 'react';
import { Eye, EyeOff, GripVertical } from 'lucide-react';
import type { LayerConfig, AnnotationLayer, MarkerStyle, SlotLayoutPreset } from './types';

interface LayerSettingsProps {
  config: LayerConfig;
  onUpdate: (config: LayerConfig) => void;
}

const MARKER_STYLES: { value: MarkerStyle; label: string }[] = [
  { value: 'chevron', label: '> Chevron' },
  { value: 'superscript', label: 'a Superscript' },
  { value: 'dot', label: 'Dot' },
  { value: 'faint', label: 'Faint' },
  { value: 'underline', label: '_ Underline' },
  { value: 'none', label: 'Hidden' },
];

const LAYOUT_PRESETS: { value: SlotLayoutPreset; label: string }[] = [
  { value: '3-3', label: '3 + 3' },
  { value: '2-4', label: '2 + 4' },
  { value: '1-5', label: '1 + 5' },
  { value: '6-full', label: '6 Full' },
  { value: 'custom', label: 'Custom' },
];

export function AnnotationLayerSettings({ config, onUpdate }: LayerSettingsProps) {
  const updateLayer = (layerId: string, updates: Partial<AnnotationLayer>) => {
    onUpdate({
      ...config,
      layers: config.layers.map(l => l.id === layerId ? { ...l, ...updates } : l),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Annotation Layers</h3>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Opacity</label>
          <input
            type="range"
            min={0} max={1} step={0.1}
            value={config.markerOpacity}
            onChange={(e) => onUpdate({ ...config, markerOpacity: parseFloat(e.target.value) })}
            className="w-20"
          />
        </div>
      </div>

      <div className="space-y-2">
        {config.layers.map((layer) => (
          <div key={layer.id} className="flex items-center gap-2 p-2 bg-[#252536] rounded-lg">
            <GripVertical size={12} className="text-gray-600 cursor-grab" />

            {/* Visibility toggle */}
            <button onClick={() => updateLayer(layer.id, { visible: !layer.visible })}
              className={layer.visible ? 'text-white' : 'text-gray-600'}>
              {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>

            {/* Color indicator */}
            <input
              type="color"
              value={layer.color}
              onChange={(e) => updateLayer(layer.id, { color: e.target.value })}
              className="w-4 h-4 rounded cursor-pointer border-0"
            />

            {/* Name */}
            <input
              value={layer.name}
              onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
              className="flex-1 bg-transparent text-sm text-gray-300 border-b border-transparent focus:border-[#444] outline-none"
            />

            {/* Marker style */}
            <select
              value={layer.markerStyle}
              onChange={(e) => updateLayer(layer.id, { markerStyle: e.target.value as MarkerStyle })}
              className="text-xs bg-[#1e1e2e] text-gray-400 border border-[#444] rounded px-1 py-0.5"
            >
              {MARKER_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>

            {/* Layout preset */}
            <select
              value={layer.defaultSlotLayout}
              onChange={(e) => updateLayer(layer.id, { defaultSlotLayout: e.target.value as SlotLayoutPreset })}
              className="text-xs bg-[#1e1e2e] text-gray-400 border border-[#444] rounded px-1 py-0.5"
            >
              {LAYOUT_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
