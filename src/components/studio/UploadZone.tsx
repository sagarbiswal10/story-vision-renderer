import { useCallback } from "react";
import { Upload } from "lucide-react";

interface Props {
  accept: string;
  multiple?: boolean;
  label: string;
  hint?: string;
  onFiles: (files: File[]) => void;
}

export function UploadZone({ accept, multiple, label, hint, onFiles }: Props) {
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.match(accept.replace(/\*/g, ".*").replace(/,/g, "|")),
      );
      if (files.length) onFiles(files);
    },
    [accept, onFiles],
  );

  return (
    <label
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/30 px-6 py-12 text-center transition-colors hover:border-accent/60 hover:bg-card/60"
    >
      <Upload className="h-6 w-6 text-muted-foreground group-hover:text-accent" />
      <div>
        <p className="font-display text-base">{label}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </label>
  );
}
