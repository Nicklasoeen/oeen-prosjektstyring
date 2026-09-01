import { cn } from "@/lib/utils";

const PRIORITY = {
  low: {
    label: "Lav",
    className: "bg-[#E7F0EA] text-[#2F6F62]",
  },
  medium: {
    label: "Middels",
    className: "bg-[#F8EBD8] text-[#8A5420]",
  },
  urgent: {
    label: "Haster",
    className: "bg-[#F8E0E3] text-[#A33B45]",
  },
} as const;

const PROJECT_STATUS = {
  active: {
    label: "Aktiv",
    className: "bg-[#E7F0EA] text-[#2F6F62]",
  },
  archived: {
    label: "Arkivert",
    className: "bg-muted text-muted-foreground",
  },
} as const;

const TASK_STATUS = {
  todo: {
    label: "Åpen",
    className: "bg-muted text-muted-foreground",
  },
  doing: {
    label: "Pågår",
    className: "bg-[#E4EEF6] text-[#2C4A6E]",
  },
  done: {
    label: "Ferdig",
    className: "bg-[#E7F0EA] text-[#2F6F62]",
  },
} as const;

export function PriorityBadge({
  value,
}: {
  value: keyof typeof PRIORITY;
}) {
  return <Badge className={PRIORITY[value].className}>{PRIORITY[value].label}</Badge>;
}

export function ProjectStatusBadge({
  value,
}: {
  value: keyof typeof PROJECT_STATUS;
}) {
  return (
    <Badge className={PROJECT_STATUS[value].className}>
      {PROJECT_STATUS[value].label}
    </Badge>
  );
}

export function TaskStatusBadge({
  value,
}: {
  value: keyof typeof TASK_STATUS;
}) {
  return (
    <Badge className={TASK_STATUS[value].className}>{TASK_STATUS[value].label}</Badge>
  );
}

function Badge({
  className,
  children,
}: {
  className?: string;
  children: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-label font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}
