import ClassificationDropdown from './ClassificationDropdown';

interface DataBindingPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

const BINDING_OPTIONS = ['none', 'table', 'view', 'query'];

export default function DataBindingPicker({
  value,
  onChange,
  disabled = false,
}: DataBindingPickerProps) {
  return (
    <ClassificationDropdown
      value={value}
      options={BINDING_OPTIONS}
      onChange={onChange}
      disabled={disabled}
      placeholder="Data source..."
    />
  );
}
