import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadSave, resetSave } from "@/game/storage";
import { MISSIONS, missionById } from "@/game/missions";
import type { SaveData } from "@/game/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — ASD Explorer" },
      { name: "description", content: "Review gaze metrics from your journey." },
    ],
  }),
});

function Dashboard() {
  const [data, setData] = useState<SaveData | null>(null);
  useEffect(() => {
    setData(loadSave());
  }, []);

  if (!data) return null;

  const byMission = MISSIONS.map((m) => ({
    meta: m,
    runs: data.results.filter((r) => r.id === m.id),
  }));

  return (
    <main className="min-h-screen bg-soft-gradient p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-pixel text-lg md:text-xl">📊 Your gaze journal</h1>
            <p className="text-sm text-muted-foreground">
              {data.completed.length}/{MISSIONS.length} missions complete · {data.results.length} runs recorded
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/play">
              <Button>Continue exploring</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Reset all progress?")) {
                  resetSave();
                  setData(loadSave());
                }
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {byMission.map(({ meta, runs }) => {
            const last = runs[runs.length - 1];
            return (
              <Card key={meta.id} className="shadow-cozy">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="text-2xl">{meta.emoji}</span>
                      <span className="font-pixel text-sm">{meta.title}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{runs.length} runs</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-xs text-muted-foreground">{meta.goal}</p>
                  {last ? (
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(last.metrics).map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-muted/60 p-2">
                          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {k}
                          </dt>
                          <dd className="font-mono text-base font-medium">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not played yet.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {data.results.length > 0 && (
          <Card className="mt-6 shadow-cozy">
            <CardHeader>
              <CardTitle className="font-pixel text-sm">Run history</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-2">When</th>
                      <th>Mission</th>
                      <th>Duration</th>
                      <th>Metrics</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.results].reverse().map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="py-2 text-muted-foreground">
                          {new Date(r.startedAt).toLocaleTimeString()}
                        </td>
                        <td>
                          {missionById(r.id).emoji} {missionById(r.id).title}
                        </td>
                        <td>{Math.round(r.durationMs / 1000)}s</td>
                        <td className="font-mono text-xs">
                          {Object.entries(r.metrics)
                            .map(([k, v]) => `${k}:${v}`)
                            .join(" · ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
