import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import type { Annotation, AnnotationSlot, SlotContentType } from './types';

interface AnnotationPanelProps {
  annotation: Annotation;
  onUpdate: (annotation: Annotation) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const SLOT_TYPE_ICONS: Record<SlotContentType, string> = {
  commentary: '\u{1F4D6}',
  definition: '\u{1F4D8}',
  'ai-chat': '\u{1F916}',
  concordance: '\u{1F4D7}',
  calculation: '\u{1F522}',
  evidence: '\u{1F50D}',
  metadata: '\u{1F3F7}\uFE0F',
  links: '\u{1F517}',
  custom: '\u2699\uFE0F',
};

export function AnnotationPanel({ annotation, onUpdate, onClose, onDelete }: AnnotationPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);

  const leftSlots = annotation.slots.filter(s => s.position <= 3 && !isSlotMerged(s, annotation.slots));
  const rightSlots = annotation.slots.filter(s => s.position > 3 && !isSlotMerged(s, annotation.slots));

  const updateSlot = useCallback((slotId: string, updates: Partial<AnnotationSlot>) => {
    const newSlots = annotation.slots.map(s =>
      s.id === slotId ? { ...s, ...updates } : s
    );
    onUpdate({ ...annotation, slots: newSlots, updatedAt: Date.now() });
  }, [annotation, onUpdate]);

  return (
    <div className="forge-annotation-panel bg-[#1e1e2e] border border-[#333] rounded-lg shadow-xl mt-1 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#252536] border-b border-[#333]">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="text-xs uppercase tracking-wide">{annotation.layerId}</span>
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => onDelete(annotation.id)} className="p-1 text-gray-500 hover:text-red-400">
            <X size={12} />
          </button>
        </div>
      </div>

      {/* 6-slot grid */}
      {expanded && (
        <div className="grid grid-cols-2 gap-px bg-[#333] p-px">
          {/* Left column */}
          <div className="flex flex-col gap-px">
            {leftSlots.map(slot => (
              <SlotView
                key={slot.id}
                slot={slot}
                isEditing={editingSlot === slot.id}
                onStartEdit={() => setEditingSlot(slot.id)}
                onStopEdit={() => setEditingSlot(null)}
                onUpdate={(updates) => updateSlot(slot.id, updates)}
              />
            ))}
          </div>
          {/* Right column */}
          <div className="flex flex-col gap-px">
            {rightSlots.map(slot => (
              <SlotView
                key={slot.id}
                slot={slot}
                isEditing={editingSlot === slot.id}
                onStartEdit={() => setEditingSlot(slot.id)}
                onStopEdit={() => setEditingSlot(null)}
                onUpdate={(updates) => updateSlot(slot.id, updates)}
                isMerged={slot.mergedWith.length > 0}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SlotViewProps {
  slot: AnnotationSlot;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (updates: Partial<AnnotationSlot>) => void;
  isMerged?: boolean;
}

function SlotView({ slot, isEditing, onStartEdit, onStopEdit, onUpdate, isMerged }: SlotViewProps) {
  const [slotExpanded, setSlotExpanded] = useState(!slot.collapsed);
  const mergeRows = isMerged ? slot.mergedWith.length + 1 : 1;

  return (
    <div
      className="bg-[#1e1e2e] p-2"
      style={isMerged ? { gridRow: `span ${mergeRows}` } : undefined}
    >
      {/* Slot header */}
      <div className="flex items-center justify-between mb-1">
        <button onClick={() => { setSlotExpanded(!slotExpanded); onUpdate({ collapsed: slotExpanded }); }}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white">
          {slotExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          <span>{SLOT_TYPE_ICONS[slot.contentType]}</span>
          <span className="font-medium">{slot.label}</span>
        </button>
        <select
          value={slot.contentType}
          onChange={(e) => onUpdate({ contentType: e.target.value as SlotContentType })}
          className="text-[10px] bg-transparent border border-[#444] rounded px-1 text-gray-500"
        >
          {Object.keys(SLOT_TYPE_ICONS).map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Slot content */}
      {slotExpanded && (
        <div className="mt-1">
          {isEditing ? (
            <textarea
              value={slot.body}
              onChange={(e) => onUpdate({ body: e.target.value })}
              onBlur={onStopEdit}
              autoFocus
              className="w-full bg-[#252536] text-gray-300 text-sm p-2 rounded border border-[#444] focus:border-forge-ember resize-y min-h-[60px]"
              placeholder={`Enter ${slot.contentType} content...`}
            />
          ) : (
            <div
              onClick={onStartEdit}
              className="text-sm text-gray-300 cursor-text min-h-[24px] hover:bg-[#252536] rounded p-1 whitespace-pre-wrap"
            >
              {slot.body || <span className="text-gray-600 italic">Click to add {slot.contentType}...</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Check if a slot is consumed by another slot's merge */
function isSlotMerged(slot: AnnotationSlot, allSlots: AnnotationSlot[]): boolean {
  return allSlots.some(s => s.id !== slot.id && s.mergedWith.includes(slot.position));
}
