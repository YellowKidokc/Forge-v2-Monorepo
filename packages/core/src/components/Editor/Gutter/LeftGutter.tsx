/**
 * LeftGutter — Classification Column
 *
 * Renders header drawer values after collapse. Each section's fields
 * align vertically with the section header. Inherited values show
 * with a subtle "↑" prefix and lighter color.
 *
 * Fields are indented by header depth to create a natural tree view.
 */

import { memo, useState, useCallback } from 'react';
import type { UseHeaderDrawerReturn } from '../../../hooks/useHeaderDrawer';
import type { SectionMeta, SlotValue } from '../../../lib/headerDrawer';
import { isSlotFilled } from '../../../lib/headerDrawer';

interface LeftGutterProps {
  drawerHook: UseHeaderDrawerReturn;
  width: number;
  onResize: (width: number) => void;
}

const INDENT_STEP = 20;

function FieldPill({ slot }: { slot: SlotValue }) {
  if (!isSlotFilled(slot)) return null;

  const renderValue = () => {
    if (Array.isArray(slot.value)) {
      return (
        <div className="flex flex-wrap gap-0.5">
          {(slot.value as string[]).map(tag => (
            <span
              key={tag}
              className={`px-1 py-0 rounded-full text-[8px] font-mono ${
                slot.inherited
                  ? 'bg-amber-400/10 text-amber-400/50'
                  : 'bg-forge-ember/15 text-forge-ember/80'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      );
    }

    if (typeof slot.value === 'boolean') {
      return (
        <span className={`text-[9px] font-mono ${slot.value ? 'text-green-400' : 'text-gray-600'}`}>
          {slot.value ? 'Yes' : 'No'}
        </span>
      );
    }

    const text = String(slot.value);
    const isUrl = text.startsWith('http://') || text.startsWith('https://');

    return (
      <span
        className={`text-[9px] font-mono truncate block ${
          slot.inherited ? 'text-gray-500 italic' : 'text-gray-300'
        } ${isUrl ? 'underline decoration-dotted cursor-pointer hover:text-forge-ember' : ''}`}
        title={text}
      >
        {slot.inherited && <span className="text-amber-400/50 mr-0.5">↑</span>}
        {isUrl ? text.replace(/^https?:\/\//, '').substring(0, 20) + '...' : text}
      </span>
    );
  };

  return (
    <div className="flex items-start gap-1 py-0.5">
      <span className="text-[8px] font-mono text-gray-700 uppercase tracking-wider flex-shrink-0 w-14 text-right pt-0.5">
        {slot.label}
      </span>
      <div className="flex-1 min-w-0">
        {renderValue()}
      </div>
    </div>
  );
}

function SectionFields({
  section,
  resolvedSlots,
  onClickField,
}: {
  section: SectionMeta;
  resolvedSlots: SlotValue[];
  onClickField: (sectionId: string) => void;
}) {
  const filledSlots = resolvedSlots.filter(s => isSlotFilled(s));
  if (filledSlots.length === 0) return null;

  const indent = (section.level - 1) * INDENT_STEP;

  return (
    <div
      className="left-gutter-section group border-b border-forge-steel/10 py-1.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
      style={{ paddingLeft: `${indent + 4}px` }}
      onClick={() => onClickField(section.sectionId)}
      title={`${section.title} — click to edit`}
    >
      {filledSlots.map(slot => (
        <FieldPill key={slot.slotIndex} slot={slot} />
      ))}
    </div>
  );
}

function LeftGutterBase({ drawerHook, width, onResize }: LeftGutterProps) {
  const [resizing, setResizing] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      onResize(Math.max(120, startWidth + delta));
    };

    const handleMouseUp = () => {
      setResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [width, onResize]);

  const sections = drawerHook.getSections();

  const handleClickField = useCallback((sectionId: string) => {
    drawerHook.openDrawer(sectionId);
  }, [drawerHook]);

  return (
    <div
      className="left-gutter flex-shrink-0 bg-[#111115]/50 border-r border-forge-steel/30 overflow-y-auto overflow-x-hidden relative"
      style={{ width: `${width}px` }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#111115]/90 backdrop-blur-sm px-2 py-1.5 border-b border-forge-steel/30">
        <span className="text-[8px] font-mono text-gray-700 uppercase tracking-widest">Classification</span>
      </div>

      {/* Section fields */}
      <div className="px-1">
        {sections.map(section => (
          <SectionFields
            key={section.sectionId}
            section={section}
            resolvedSlots={drawerHook.getResolvedSlots(section.sectionId)}
            onClickField={handleClickField}
          />
        ))}
        {sections.length === 0 && (
          <div className="text-[9px] text-gray-700 px-2 py-4 text-center italic">
            No headers yet
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-forge-ember/30 transition-colors ${
          resizing ? 'bg-forge-ember/50' : ''
        }`}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}

const LeftGutter = memo(LeftGutterBase);
export default LeftGutter;
