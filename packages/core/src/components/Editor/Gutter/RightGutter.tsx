/**
 * RightGutter — Annotation Column
 *
 * Renders annotations from the annotation engine, filtered by active layers.
 * Each annotation appears as a compact card showing author, text, and layer.
 * Click to expand full text.
 */

import { memo, useState, useCallback } from 'react';
import type { Annotation, AnnotationLayer } from '../../../annotations/types';
import { createDefaultLayerConfig } from '../../../annotations/types';
import { MessageSquare, ChevronDown } from 'lucide-react';

interface RightGutterProps {
  annotations: Annotation[];
  width: number;
  onResize: (width: number) => void;
  activeLayers?: string[];
  onLayerToggle?: (layerId: string) => void;
}

function AnnotationCard({ annotation }: { annotation: Annotation }) {
  const [expanded, setExpanded] = useState(false);

  const layerConfig = createDefaultLayerConfig();
  const layer = layerConfig.layers.find(l => l.id === annotation.layerId);
  const layerColor = layer?.color || '#888';

  // Get summary text from first non-empty slot
  const summarySlot = annotation.slots.find(s => s.body.trim().length > 0);
  const text = summarySlot?.body || '(empty annotation)';
  const truncated = text.length > 100 && !expanded;

  return (
    <div
      className="right-gutter-annotation border-b border-forge-steel/10 py-1.5 px-2 cursor-pointer hover:bg-white/[0.02] transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Layer indicator */}
      <div className="flex items-center gap-1 mb-0.5">
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: layerColor }}
        />
        <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: layerColor }}>
          {layer?.name || annotation.layerId}
        </span>
        <span className="text-[8px] text-gray-700 ml-auto">
          {new Date(annotation.updatedAt).toLocaleDateString()}
        </span>
      </div>

      {/* Text */}
      <div className={`text-[9px] text-gray-400 leading-relaxed ${truncated ? 'line-clamp-3' : ''}`}>
        {text}
      </div>

      {/* Expand indicator */}
      {text.length > 100 && (
        <div className="flex justify-center mt-0.5">
          <ChevronDown size={8} className={`text-gray-700 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      )}

      {/* Grid address */}
      {annotation.gridAddress && (
        <div className="text-[7px] font-mono text-gray-800 mt-0.5">
          [{annotation.gridAddress.row},{annotation.gridAddress.col}]
        </div>
      )}
    </div>
  );
}

function RightGutterBase({ annotations, width, onResize, activeLayers }: RightGutterProps) {
  const [resizing, setResizing] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX; // Reversed — drag left = wider
      onResize(Math.max(140, startWidth + delta));
    };

    const handleMouseUp = () => {
      setResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [width, onResize]);

  // Filter by active layers
  const filtered = activeLayers
    ? annotations.filter(a => activeLayers.includes(a.layerId))
    : annotations;

  return (
    <div
      className="right-gutter flex-shrink-0 bg-[#111115]/50 border-l border-forge-steel/30 overflow-y-auto overflow-x-hidden relative"
      style={{ width: `${width}px` }}
    >
      {/* Resize handle */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-forge-ember/30 transition-colors ${
          resizing ? 'bg-forge-ember/50' : ''
        }`}
        onMouseDown={handleMouseDown}
      />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#111115]/90 backdrop-blur-sm px-2 py-1.5 border-b border-forge-steel/30">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono text-gray-700 uppercase tracking-widest">Annotations</span>
          <span className="text-[8px] font-mono text-gray-800">{filtered.length}</span>
        </div>
      </div>

      {/* Annotations */}
      <div>
        {filtered.map(ann => (
          <AnnotationCard key={ann.id} annotation={ann} />
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center text-center px-2 py-6 text-gray-700">
            <MessageSquare size={16} className="mb-1 opacity-30" />
            <span className="text-[9px] italic">No annotations</span>
          </div>
        )}
      </div>
    </div>
  );
}

const RightGutter = memo(RightGutterBase);
export default RightGutter;
