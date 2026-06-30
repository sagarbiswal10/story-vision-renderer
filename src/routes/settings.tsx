import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Cinema" },
      { name: "description", content: "Studio preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="font-display text-4xl">Settings</h1>
      <div className="mt-10 space-y-6">
        <section className="rounded-xl border border-border bg-card/60 p-5">
          <h2 className="font-display text-lg">AI Director</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Powered by Gemini through Lovable AI Gateway. Vision tagging + story arc
            generation runs server-side; no key required from you.
          </p>
        </section>
        <section className="rounded-xl border border-border bg-card/60 p-5">
          <h2 className="font-display text-lg">Storage</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Projects are persisted to local storage. Migrating to cloud storage
            (S3 / R2 / Supabase) is a single swap of <code className="font-mono text-xs">src/lib/store.ts</code>.
          </p>
        </section>
        <section className="rounded-xl border border-border bg-card/60 p-5">
          <h2 className="font-display text-lg">Rendering</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            In-browser export via Canvas + MediaRecorder. For server-side Remotion
            rendering, replace <code className="font-mono text-xs">src/lib/engines/export.ts</code> with a
            fetch call to an external render worker.
          </p>
        </section>
      </div>
    </div>
  );
}
