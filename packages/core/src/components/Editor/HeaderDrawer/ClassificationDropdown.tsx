import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface ClassificationDropdownProps {
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
  inherited?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function ClassificationDropdown({
  value,
  options,
  onChange,
  inherited = false,
  disabled = false,
  placeholder = 'Select...',
}: ClassificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-1 px-2 py-1.5 rounded border text-[10px] font-mono transition-colors cursor-pointer ${
          value
            ? inherited
              ? 'border-amber-400/20 bg-amber-400/5 text-amber-400/60 italic'
              : 'border-forge-ember/30 bg-forge-ember/5 text-forge-ember'
            : 'border-forge-steel/50 bg-black/20 text-gray-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-forge-ember/40'}`}
      >
        <span className="flex items-center gap-1 truncate">
          {inherited && value && <span className="text-[8px]" title="Inherited from parent">↑</span>}
          {value || placeholder}
        </span>
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-40 overflow-y-auto rounded border border-forge-steel bg-[#111115] shadow-xl">
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className="w-full text-left px-2 py-1 text-[10px] text-gray-500 hover:bg-forge-steel/50 cursor-pointer"
          >
            (none)
          </button>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-2 py-1 text-[10px] font-mono cursor-pointer transition-colors ${
                opt === value
                  ? 'text-forge-ember bg-forge-ember/10'
                  : 'text-gray-300 hover:bg-forge-steel/50 hover:text-white'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
