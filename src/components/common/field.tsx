import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Label + control + hint/error. Pass the control as children. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className={cn(error && "text-rose")}>
        {label}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-rose">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
