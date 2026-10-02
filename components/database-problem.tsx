import { AuthShell } from "./auth-shell";

/** Shown instead of the site when the database setup would lose data (see DATABASE_PROBLEM). */
export function DatabaseProblem({ appName, problem }: { appName: string; problem: string }) {
  return (
    <AuthShell appName={appName} title="Database not connected" subtitle="The site is paused so nothing gets lost.">
      <p className="text-sm leading-relaxed text-fg">{problem}</p>
      <p className="mt-3 text-sm text-muted">After changing the variable, Railway redeploys and this page goes away.</p>
    </AuthShell>
  );
}
