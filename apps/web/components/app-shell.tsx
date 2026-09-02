"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
} from "lucide-react";
import type { ReactNode } from "react";

import { signOut } from "@/app/login/actions";
import { useChatUi } from "@/components/chat-provider";
import { RunningTimerStamp } from "@/components/running-timer-stamp";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { Button } from "@/components/ui/button";
import type { WorkspaceSummary } from "@/lib/auth/workspace-access";
import type { Profile, RunningTimer } from "@/lib/running-timer";
import { cn } from "@/lib/utils";

export function AppShell({
  slug,
  workspaces,
  profile,
  runningTimer,
  children,
}: {
  slug: string;
  workspaces: WorkspaceSummary[];
  profile: Profile | null;
  runningTimer: RunningTimer | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { setOpen } = useChatUi();
  const dashboardHref = `/w/${slug}/dashboard`;
  const projectsHref = `/w/${slug}/projects`;
  const settingsHref = `/w/${slug}/settings`;
  const onProjects =
    pathname === projectsHref || pathname.startsWith(`${projectsHref}/`);
  const onDashboard = pathname === dashboardHref;
  const onSettings = pathname === settingsHref;
  const crumbs = breadcrumbs(pathname, projectsHref, settingsHref);
  const initial = (profile?.name ?? profile?.email ?? "Ø")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-[16.5rem] shrink-0 flex-col border-r border-black/[0.04] bg-sidebar md:flex">
        <div className="flex h-full flex-col px-4 py-5">
          {profile ? (
            <div className="flex items-center gap-3 px-1">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted font-heading text-sm font-semibold ring-2 ring-workspace-accent/35 ring-offset-2 ring-offset-sidebar"
              >
                {initial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{profile.name}</p>
                <p className="truncate text-label text-muted-foreground">
                  {profile.email}
                </p>
              </div>
            </div>
          ) : (
            <p className="px-1 font-heading text-sm font-semibold tracking-tight">
              Øen
            </p>
          )}

          <div className="mt-5">
            <WorkspaceSwitcher currentSlug={slug} workspaces={workspaces} />
          </div>

          <Button
            asChild
            className="mt-4 h-11 w-full justify-center px-4 text-[0.9375rem]"
          >
            <Link href={`${projectsHref}#nytt`}>
              <Plus />
              Nytt prosjekt
            </Link>
          </Button>

          <nav className="mt-7 flex flex-col gap-0.5">
            <NavLink href={dashboardHref} active={onDashboard}>
              <LayoutDashboard />
              Dashboard
            </NavLink>
            <NavLink href={projectsHref} active={onProjects}>
              <FolderKanban />
              Prosjekter
            </NavLink>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-4"
            >
              <MessageSquare />
              Chat
            </button>
            <NavLink href={settingsHref} active={onSettings}>
              <Settings />
              Innstillinger
            </NavLink>
          </nav>

          <form action={signOut} className="mt-auto">
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start text-muted-foreground"
            >
              <LogOut />
              Logg ut
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-black/[0.04] bg-card px-4 py-3 md:hidden">
          <WorkspaceSwitcher currentSlug={slug} workspaces={workspaces} />
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Logg ut
            </Button>
          </form>
        </header>
        {runningTimer ? (
          <div className="border-b border-black/[0.04] bg-card px-3 py-2 md:hidden">
            <RunningTimerStamp slug={slug} timer={runningTimer} />
          </div>
        ) : null}
        <nav className="flex gap-1 overflow-x-auto border-b border-black/[0.04] bg-card px-3 py-2 md:hidden">
          <MobileNavLink href={dashboardHref} active={onDashboard}>
            Dashboard
          </MobileNavLink>
          <MobileNavLink href={projectsHref} active={onProjects}>
            Prosjekter
          </MobileNavLink>
          <MobileNavLink href={settingsHref} active={onSettings}>
            Innstillinger
          </MobileNavLink>
        </nav>

        <header className="hidden h-[3.75rem] items-center justify-between gap-4 border-b border-black/[0.04] bg-card px-8 md:flex">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Øen</span>
            {crumbs.map((crumb) => (
              <span key={crumb}>
                <span className="mx-2 text-border">›</span>
                {crumb}
              </span>
            ))}
          </p>
          <div className="flex min-w-0 items-center gap-2">
            {runningTimer ? (
              <RunningTimerStamp
                slug={slug}
                timer={runningTimer}
                className="max-w-lg"
              />
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setOpen(true)}
              aria-label="Åpne chat"
            >
              <MessageSquare />
            </Button>
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

function breadcrumbs(
  pathname: string,
  projectsHref: string,
  settingsHref: string
): string[] {
  if (pathname.startsWith(`${projectsHref}/`)) {
    return ["Prosjekter", "Oppgaver"];
  }
  if (pathname === projectsHref) {
    return ["Prosjekter"];
  }
  if (pathname.endsWith("/timeoversikt")) {
    return ["Timeoversikt"];
  }
  if (pathname.endsWith("/sjekklister")) {
    return ["Sjekklister"];
  }
  if (pathname === settingsHref || pathname.startsWith(`${settingsHref}/`)) {
    return ["Innstillinger"];
  }
  return ["Dashboard"];
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors [&_svg]:size-4",
        active
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm whitespace-nowrap",
        active
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground"
      )}
    >
      {children}
    </Link>
  );
}
