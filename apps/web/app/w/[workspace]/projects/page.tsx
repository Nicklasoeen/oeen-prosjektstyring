import Link from "next/link";

import { createProject } from "@/app/w/[workspace]/projects/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";

type ProjectRow = {
  id: string;
  name: string;
  status: "active" | "archived";
  created_at: string;
};

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { workspace, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/projects`
  );

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, status, created_at")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })
    .returns<ProjectRow[]>();

  if (error) {
    throw error;
  }

  const projects = data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Prosjekter</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kun synlig i {workspace.name}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nytt prosjekt</CardTitle>
          <CardDescription>Opprettes i det aktive workspace-et.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createProject} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="workspace_slug" value={slug} />
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="name">Navn</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="F.eks. Nettside"
              />
            </div>
            <Button type="submit">Opprett</Button>
          </form>
        </CardContent>
      </Card>

      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen prosjekter ennå.</p>
      ) : (
        <ul className="divide-y rounded-xl ring-1 ring-foreground/10">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/w/${slug}/projects/${project.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted"
              >
                <span className="font-medium">{project.name}</span>
                <span className="text-muted-foreground">{project.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
