import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="flex max-w-md flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-medium tracking-tight">
          Øen prosjektstyring
        </h1>
        <p className="text-sm text-muted-foreground">
          Next.js 15, Tailwind CSS, and shadcn/ui.
        </p>
      </div>
      <Button type="button">Get started</Button>
    </main>
  );
}
