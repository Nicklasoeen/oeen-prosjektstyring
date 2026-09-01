import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-medium tracking-tight">Ingen tilgang</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Du er innlogget, men er ikke medlem av dette workspace-et.
      </p>
      <Button asChild>
        <Link href="/">Tilbake</Link>
      </Button>
    </main>
  );
}
