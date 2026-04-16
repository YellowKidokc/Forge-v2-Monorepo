/**
 * HeaderDrawer — The metadata drawer that blooms below headers.
 *
 * When a user types a markdown header and presses enter, this drawer
 * opens with configurable slots. After filling and clicking Done,
 * the drawer collapses and values migrate to the left gutter.
 *
 * A chevron indicates metadata exists behind the header.
 * Click to reopen.
 */

import { useCallback, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import type { SlotDefinition, SlotValue, SectionMeta } from '../../../lib/headerDrawer';
import { isSlotFilled } from '../../../lib/headerDrawer';
import TagChipInput from './TagChipInput';
import ClassificationDropdown from './ClassificationDropdown';
import DataBindingPicker from './DataBindingPicker';
import FreeTextSlot from './FreeTextSlot';

interface HeaderDrawerProps {
  section: SectionMeta;
  slotDefinitions: SlotDefinition[];
  resolvedSlots: SlotValue[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSlotChange: (slotIndex: number, value: string | string[] | number | boolean | null) => void;
}

export default function HeaderDrawer({
  section,
  slotDefinitions,
  resolvedSlots,
  isOpen,
  onToggle,
  onClose,
  onSlotChange,
}: HeaderDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const firstSlotRef = useRef<HTMLDivElement>(null);

  const hasAnyMetadata = resolvedSlots.some(s => isSlotFilled(s));

  // Focus first slot when drawer opens
  useEffect(() => {
    if (isOpen && firstSlotRef.current) {
      const input = firstSlotRef.current.querySelector('input, textarea, button');
      if (input instanceof HTMLElement) {
        setTimeout(() => input.focus(), 100);
      }
    }
  }, [isOpen]);

  // Handle keyboard
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  }, [onClose]);

  const renderSlotField = (slot: SlotValue, def: SlotDefinition, index: number) => {
    const isFirst = index === 0;

    switch (def.fieldType) {
      case 'tags':
        return (
          <div ref={isFirst ? firstSlotRef : undefined}>
            <TagChipInput
              value={Array.isArray(slot.value) ? slot.value : []}
              onChange={(tags) => onSlotChange(slot.slotIndex, tags)}
              inherited={slot.inherited}
            />
          </div>
        );

      case 'dropdown':
        return (
          <div ref={isFirst ? firstSlotRef : undefined}>
            <ClassificationDropdown
              value={typeof slot.value === 'string' ? slot.value : null}
              options={def.options || []}
              onChange={(val) => onSlotChange(slot.slotIndex, val)}
              inherited={slot.inherited}
            />
          </div>
        );

      case 'data-binding':
        return (
          <div ref={isFirst ? firstSlotRef : undefined}>
            <DataBindingPicker
              value={typeof slot.value === 'string' ? slot.value : null}
              onChange={(val) => onSlotChange(slot.slotIndex, val)}
            />
          </div>
        );

      case 'text':
        return (
          <div ref={isFirst ? firstSlotRef : undefined}>
            <FreeTextSlot
              value={typeof slot.value === 'string' ? slot.value : ''}
              onChange={(val) => onSlotChange(slot.slotIndex, val)}
              inherited={slot.inherited}
            />
          </div>
        );

      case 'number':
        return (
          <div ref={isFirst ? firstSlotRef : undefined}>
            <input
              type="number"
              value={typeof slot.value === 'number' ? slot.value : ''}
              onChange={(e) => onSlotChange(slot.slotIndex, e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-black/20 border border-forge-steel/50 rounded px-2 py-1.5 text-[10px] text-gray-300 outline-none focus:border-forge-ember/40 placeholder:text-gray-700"
              placeholder="Enter value..."
            />
          </div>
        );

      case 'boolean':
        return (
          <div ref={isFirst ? firstSlotRef : undefined}>
            <button
              onClick={() => onSlotChange(slot.slotIndex, !slot.value)}
              className={`px-3 py-1 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                slot.value
                  ? 'border-green-500/30 bg-green-500/10 text-green-400'
                  : 'border-forge-steel/50 bg-black/20 text-gray-500'
              }`}
            >
              {slot.value ? 'Yes' : 'No'}
            </button>
          </div>
        );

      case 'url':
        return (
          <div ref={isFirst ? firstSlotRef : undefined}>
            <input
              type="url"
              value={typeof slot.value === 'string' ? slot.value : ''}
              onChange={(e) => onSlotChange(slot.slotIndex, e.target.value || null)}
              className="w-full bg-black/20 border border-forge-steel/50 rounded px-2 py-1.5 text-[10px] text-gray-300 font-mono outline-none focus:border-forge-ember/40 placeholder:text-gray-700"
              placeholder="https://..."
            />
          </div>
        );

      case 'computed':
        return (
          <div ref={isFirst ? firstSlotRef : undefined}>
            <span className="text-[10px] text-gray-600 italic px-2">
              {slot.value != null ? String(slot.value) : '(computed)'}
            </span>
          </div>
        );

      default:
        return (
          <div ref={isFirst ? firstSlotRef : undefined}>
            <FreeTextSlot
              value={typeof slot.value === 'string' ? slot.value : ''}
              onChange={(val) => onSlotChange(slot.slotIndex, val)}
            />
          </div>
        );
    }
  };

  return (
    <div className="header-drawer-container" data-section-id={section.sectionId}>
      {/* Chevron indicator — always visible when metadata exists */}
      {!isOpen && hasAnyMetadata && (
        <button
          onClick={onToggle}
          className="header-drawer-chevron flex items-center gap-1 text-gray-600 hover:text-forge-ember cursor-pointer transition-colors py-0.5"
          title="Click to expand metadata"
        >
          <ChevronRight size={12} />
          <span className="text-[9px] font-mono text-gray-700">
            {resolvedSlots.filter(s => isSlotFilled(s)).length} field{resolvedSlots.filter(s => isSlotFilled(s)).length !== 1 ? 's' : ''}
          </span>
        </button>
      )}

      {/* Drawer — animated open/close */}
      <div
        ref={drawerRef}
        className={`header-drawer-body overflow-hidden transition-all duration-200 ${
          isOpen ? 'header-drawer-open' : 'header-drawer-closed'
        }`}
        style={{
          maxHeight: isOpen ? `${(slotDefinitions.length + 1) * 52}px` : '0px',
          opacity: isOpen ? 1 : 0,
        }}
        onKeyDown={handleKeyDown}
      >
        <div className="border border-forge-steel/30 rounded-b bg-[#111115]/80 backdrop-blur-sm">
          {/* Slots */}
          <div className="px-3 py-2 space-y-2">
            {slotDefinitions.map((def, i) => {
              const slot = resolvedSlots[i];
              if (!slot) return null;

              return (
                <div key={i} className="flex items-start gap-2">
                  <label className="text-[9px] font-mono text-gray-600 uppercase tracking-wider w-20 flex-shrink-0 pt-1.5 text-right">
                    {def.label}
                    {slot.inherited && (
                      <span className="block text-[8px] text-amber-400/50 normal-case">inherited</span>
                    )}
                  </label>
                  <div className="flex-1 min-w-0">
                    {renderSlotField(slot, def, i)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Done button */}
          <div className="flex justify-end px-3 py-1.5 border-t border-forge-steel/20">
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1 text-[10px] font-mono font-bold rounded border border-forge-ember/30 text-forge-ember hover:bg-forge-ember/10 cursor-pointer transition-colors"
            >
              <Check size={10} />
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Open chevron when drawer is visible */}
      {isOpen && (
        <button
          onClick={onToggle}
          className="header-drawer-chevron flex items-center gap-1 text-forge-ember cursor-pointer transition-colors py-0.5 -mt-0.5"
          title="Collapse drawer"
        >
          <ChevronDown size={12} />
        </button>
      )}
    </div>
  );
}
