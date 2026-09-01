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
import { stopRunningTimer } from "@/app/w/[workspace]/projects/actions";
import { useChatUi } from "@/components/chat-provider";
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
  const timerElsewhere =
    runningTimer !== null && runningTimer.workspaceSlug !== slug;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative hidden w-[15.5rem] shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-1 bg-[var(--workspace-accent)]"
        />
        <div className="flex h-full flex-col px-4 py-5 pl-5">
          <div className="flex items-center gap-2 px-1">
            <span
              aria-hidden
              className="size-2 rounded-full bg-[var(--workspace-accent)]"
            />
            <p className="font-heading text-sm font-semibold tracking-tight">
              Øen
            </p>
          </div>

          <div className="mt-5">
            <WorkspaceSwitcher currentSlug={slug} workspaces={workspaces} />
          </div>

          <Button asChild size="lg" className="mt-4 w-full justify-center">
            <Link href={`${projectsHref}#nytt`}>
              <Plus />
              Nytt prosjekt
            </Link>
          </Button>

          <nav className="mt-8 flex flex-col gap-1">
            <p className="px-3 text-label text-muted-foreground">Meny</p>
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
              className="relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-4"
            >
              <MessageSquare />
              Chat
            </button>
            <NavLink href={settingsHref} active={onSettings}>
              <Settings />
              Innstillinger
            </NavLink>
          </nav>

          <div className="mt-auto space-y-3">
            {profile ? (
              <div className="px-1">
                <p className="truncate text-sm font-medium">{profile.name}</p>
                <p className="truncate text-label text-muted-foreground">
                  {profile.email}
                </p>
              </div>
            ) : null}
            <form action={signOut}>
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
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <WorkspaceSwitcher currentSlug={slug} workspaces={workspaces} />
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Logg ut
            </Button>
          </form>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden">
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

        <header className="hidden h-14 items-center justify-between gap-4 border-b border-border bg-card px-8 md:flex">
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground">Øen</span>
            {crumbs.map((crumb) => (
              <span key={crumb}>
                <span className="mx-2 text-border">/</span>
                {crumb}
              </span>
            ))}
          </p>
          {runningTimer ? (
            <form action={stopRunningTimer} className="flex items-center gap-3">
              <input type="hidden" name="workspace_slug" value={slug} />
              <p className="max-w-xs truncate text-sm">
                <span className="font-medium">{runningTimer.taskTitle}</span>
                {timerElsewhere ? (
                  <>
                    <span className="text-muted-foreground"> i </span>
                    <Link
                      href={`/w/${runningTimer.workspaceSlug}/projects/${runningTimer.projectId}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {runningTimer.workspaceName}
                    </Link>
                  </>
                ) : null}
              </p>
              <Button type="submit" variant="destructive" size="sm">
                Stopp
              </Button>
            </form>
          ) : null}
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
  if (pathname === settingsHref) {
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
        "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors [&_svg]:size-4",
        active
          ? "bg-[color-mix(in_srgb,var(--workspace-accent)_12%,transparent)] font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[var(--workspace-accent)]"
        />
      ) : null}
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
          ? "bg-[color-mix(in_srgb,var(--workspace-accent)_14%,transparent)] font-medium text-foreground"
          : "text-muted-foreground"
      )}
    >
      {children}
    </Link>
  );
}
