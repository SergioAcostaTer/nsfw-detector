interface FolderPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function FolderPicker({ value, onChange }: FolderPickerProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Folder Path</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="C:\\Users\\YourName\\Pictures or /home/user/images"
        className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
      />
    </div>
  );
}
