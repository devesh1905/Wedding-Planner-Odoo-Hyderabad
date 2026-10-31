import { Label } from "@/frontend/components/ui/label";
import { cn } from "@/shared/utils";
import { Icon, type IconName } from "@/frontend/components/icons/icon";

/** Label + control + hint/error. Pass the control as children. */
export function Field({
  label,
  icon,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  /** small inline icon before the label, so the form can be skimmed */
  icon?: IconName;
  htmlFor?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className={cn("gap-1.5", error && "text-rose")}>
        {icon && <Icon name={icon} className="size-4 text-muted-foreground" />}
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
