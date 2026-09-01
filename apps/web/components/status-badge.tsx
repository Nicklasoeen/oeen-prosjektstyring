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

const PROJECT_STAGE = {
  new: {
    label: "Solgt",
    className: "bg-muted text-muted-foreground",
  },
  kickoff: {
    label: "Oppstart",
    className: "bg-[#E4EEF6] text-[#2C4A6E]",
  },
  design: {
    label: "Design",
    className: "bg-[#EBE0EE] text-[#3F2C44]",
  },
  production: {
    label: "Produksjon",
    className: "bg-[#F8EBD8] text-[#8A5420]",
  },
  review: {
    label: "Gjennomgang",
    className: "bg-[#DDEDF0] text-[#1F5A68]",
  },
  launch: {
    label: "Lansering",
    className: "bg-workspace-soft text-workspace-on-soft",
  },
  completed: {
    label: "Fullført",
    className: "bg-[#E7F0EA] text-[#2F6F62]",
  },
} as const;

const TASK_STATUS = {
  todo: {
    label: "Åpen",
    className: "bg-muted text-muted-foreground",
  },
  in_progress: {
    label: "Pågår",
    className: "bg-[#E4EEF6] text-[#2C4A6E]",
  },
  in_review: {
    label: "Til gjennomgang",
    className: "bg-[#EBE0EE] text-[#3F2C44]",
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

export function ProjectStageBadge({
  value,
}: {
  value: keyof typeof PROJECT_STAGE;
}) {
  return (
    <Badge className={PROJECT_STAGE[value].className}>
      {PROJECT_STAGE[value].label}
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
