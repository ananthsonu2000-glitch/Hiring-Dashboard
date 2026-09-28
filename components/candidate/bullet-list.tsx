import { cn } from "@/lib/utils";

export function BulletList({
  items,
  emptyText = "None noted.",
  dotClassName,
}: {
  items: string[];
  emptyText?: string;
  dotClassName?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm">
          <span className={cn("mt-1.5 size-1.5 rounded-full bg-foreground/50 shrink-0", dotClassName)} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
