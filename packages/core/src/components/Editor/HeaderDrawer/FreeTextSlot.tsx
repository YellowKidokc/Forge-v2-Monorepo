import { useRef, useEffect } from 'react';

interface FreeTextSlotProps {
  value: string;
  onChange: (value: string) => void;
  inherited?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function FreeTextSlot({
  value,
  onChange,
  inherited = false,
  disabled = false,
  placeholder = 'Click to add...',
}: FreeTextSlotProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${Math.min(ref.current.scrollHeight, 80)}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      rows={1}
      className={`w-full bg-black/20 border border-forge-steel/50 rounded px-2 py-1.5 text-[10px] outline-none resize-none transition-colors ${
        inherited
          ? 'text-gray-500 italic'
          : 'text-gray-300'
      } ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'focus:border-forge-ember/40 hover:border-forge-steel'
      } placeholder:text-gray-700`}
    />
  );
}
