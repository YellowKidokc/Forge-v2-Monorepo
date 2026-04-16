import { useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface TagChipInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  inherited?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function TagChipInput({
  value,
  onChange,
  inherited = false,
  disabled = false,
  placeholder = 'Add tag...',
}: TagChipInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = useCallback((tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput('');
  }, [value, onChange]);

  const removeTag = useCallback((tag: string) => {
    onChange(value.filter(t => t !== tag));
  }, [value, onChange]);

  return (
    <div
      className="flex flex-wrap gap-1 items-center min-h-[28px] bg-black/20 border border-forge-steel/50 rounded px-1.5 py-1 cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map(tag => (
        <span
          key={tag}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
            inherited
              ? 'bg-amber-400/10 text-amber-400/60 italic'
              : 'bg-forge-ember/15 text-forge-ember'
          }`}
        >
          {inherited && <span className="text-[8px] mr-0.5" title="Inherited from parent">↑</span>}
          {tag}
          {!disabled && !inherited && (
            <button
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="hover:text-white cursor-pointer ml-0.5"
            >
              <X size={8} />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag(input);
            }
            if (e.key === 'Backspace' && !input && value.length > 0) {
              removeTag(value[value.length - 1]);
            }
            if (e.key === 'Tab') {
              if (input.trim()) {
                e.preventDefault();
                addTag(input);
              }
            }
          }}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[60px] bg-transparent border-none outline-none text-[10px] text-gray-300 placeholder:text-gray-700"
        />
      )}
    </div>
  );
}
