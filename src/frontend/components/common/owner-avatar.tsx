import { cn } from "@/shared/utils";
import { initials } from "@/shared/format";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/frontend/components/ui/tooltip";

const COLORS: Record<string, string> = {
  maroon: "bg-maroon text-primary-foreground",
  marigold: "bg-marigold text-maroon",
  teal: "bg-teal text-white",
  rose: "bg-rose text-white",
  sky: "bg-sky text-white",
};

export function OwnerAvatar({ name, color, size = "sm" }: { name?: string | null; color?: string | null; size?: "xs" | "sm" | "md" }) {
  const dim = { xs: "size-6 text-[10px]", sm: "size-7 text-xs", md: "size-9 text-sm" }[size];
  if (!name) return <span className={cn("grid place-items-center rounded-full border border-dashed text-muted-foreground", dim)}>?</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn("grid shrink-0 place-items-center rounded-full font-semibold ring-2 ring-background", dim, COLORS[color ?? "maroon"] ?? COLORS.maroon)}
        >
          {initials(name)}
        </span>
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
}
