// One command to set up — or repair — hosting on Railway:
//
//   npx @railway/cli login        (once: opens the browser to sign in)
//   npm run railway:setup         (optionally: -- --import data/app.db  to bring your existing board along)
//
// It connects this folder to your Railway project (asks which one the first time), adds a PostgreSQL
// database if there is none, wires the website's DATABASE_URL to it as a proper reference, sets a random
// SETUP_TOKEN, creates the public https address, redeploys, and checks the site is using PostgreSQL.
// Safe to run again at any time: steps that are already done are skipped.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const CLI = ["--yes", "@railway/cli@5"];
const args = process.argv.slice(2);
const importFile = args.includes("--import") ? args[args.indexOf("--import") + 1] : null;

// ---------------------------------------------------------------------------------------------
// Running the Railway CLI (through npx, so nothing has to be installed globally)

const quote = (value) => (/^[\w@./:=-]+$/.test(value) ? value : `"${value.replace(/"/g, '\\"')}"`);

function railway(cliArgs, { interactive = false, allowFail = false, input } = {}) {
  const command = ["npx", ...CLI, ...cliArgs].map(quote).join(" ");
  const result = spawnSync(command, {
    shell: true,
    encoding: "utf8",
    input,
    stdio: interactive ? "inherit" : ["pipe", "pipe", "pipe"],
  });
  if (result.status !== 0 && !allowFail) {
    const detail = interactive ? "" : `\n${(result.stderr || result.stdout || "").trim()}`;
    throw new Error(`railway ${cliArgs.join(" ")} failed${detail}`);
  }
  return { ok: result.status === 0, out: (result.stdout || "").trim() };
}

function json(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.search(/[[{]/);
    return start >= 0 ? JSON.parse(text.slice(start)) : null;
  }
}

/** Every object with an id + name found anywhere in the CLI's JSON (its shape varies by command/version). */
function namedObjects(value, found = []) {
  if (Array.isArray(value)) value.forEach((item) => namedObjects(item, found));
  else if (value && typeof value === "object") {
    if (typeof value.id === "string" && typeof value.name === "string") found.push(value);
    Object.values(value).forEach((item) => namedObjects(item, found));
  }
  return found;
}

const step = (message) => console.log(`\n▶ ${message}`);
const done = (message) => console.log(`  ✓ ${message}`);

function gitHubRepo() {
  const result = spawnSync("git remote get-url origin", { shell: true, encoding: "utf8" });
  const match = (result.stdout || "").trim().match(/github\.com[:/](.+?)(\.git)?$/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------------------------

try {
  step("Checking your Railway login");
  const who = railway(["whoami"], { allowFail: true });
  if (!who.ok) {
    console.log("  You're not signed in to Railway yet. Run this once, then run this setup again:\n");
    console.log("    npx @railway/cli login\n");
    process.exit(1);
  }
  done(who.out.split("\n")[0]);

  step("Connecting this folder to your Railway project");
  if (!railway(["status", "--json"], { allowFail: true }).ok) {
    console.log("  Pick your project (or create one) in the list below:");
    railway(["link"], { interactive: true });
  }
  const status = json(railway(["status", "--json"]).out) ?? {};
  done(`Project: ${status.name ?? "linked"}`);

  step("Finding the website and the database");
  const repo = gitHubRepo();
  const listServices = () => {
    const text = JSON.stringify(json(railway(["status", "--json"]).out) ?? {});
    const all = namedObjects(json(text)).filter((o, i, list) => list.findIndex((x) => x.id === o.id) === i);
    const describe = (o) => JSON.stringify(o).toLowerCase();
    const isDatabase = (o) => /postgres|mysql|redis|mongo/.test(o.name.toLowerCase()) || /postgres-ssl|image":"postgres/.test(describe(o));
    // Services are the named objects that carry deployment info (environments/projects don't have "source"/"serviceInstances").
    const services = all.filter((o) => "serviceInstances" in o || "source" in o || "deployments" in o || isDatabase(o));
    return {
      database: services.find((o) => /postgres/.test(o.name.toLowerCase()) || /postgres/.test(describe(o))),
      web:
        services.find((o) => !isDatabase(o) && repo && describe(o).includes(repo.toLowerCase())) ??
        services.find((o) => !isDatabase(o)),
    };
  };
  let { database, web } = listServices();

  if (!database) {
    console.log("  No PostgreSQL database yet — adding one…");
    railway(["add", "--database", "postgres"]);
    ({ database, web } = listServices());
    if (!database) throw new Error("Railway added the database, but it didn't show up yet. Wait a minute and run this again.");
  }
  done(`Database: ${database.name}`);

  if (!web) {
    if (!repo) throw new Error("Couldn't find your GitHub repository (git remote 'origin'). Push the project to GitHub first.");
    console.log(`  No website service yet — creating one from github.com/${repo}…`);
    railway(["add", "--repo", repo, "--service", "web"]);
    ({ web } = listServices());
    if (!web) throw new Error("Railway created the website, but it didn't show up yet. Wait a minute and run this again.");
  }
  done(`Website: ${web.name}`);

  step("Connecting the website to the database");
  const variables = Object.fromEntries(
    railway(["variable", "list", "--service", web.name, "--kv"], { allowFail: true })
      .out.split(/\r?\n/)
      .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]]),
  );
  const wanted = `\${{${database.name}.DATABASE_URL}}`;
  const current = variables.DATABASE_URL ?? "";
  if (current.startsWith("postgres") && current.includes(".railway.internal")) {
    done("DATABASE_URL already points at Railway's database");
  } else {
    railway(["variable", "set", `DATABASE_URL=${wanted}`, "--service", web.name, "--skip-deploys"]);
    done(`DATABASE_URL = ${wanted}${current ? " (replaced a wrong value)" : ""}`);
  }
  let setupToken = variables.SETUP_TOKEN;
  if (!setupToken) {
    setupToken = randomBytes(18).toString("base64url");
    railway(["variable", "set", `SETUP_TOKEN=${setupToken}`, "--service", web.name, "--skip-deploys"]);
    done("SETUP_TOKEN created (protects the first-time setup page)");
  } else {
    done("SETUP_TOKEN already set");
  }

  step("Public web address");
  const findDomain = (text) => text.match(/[a-z0-9-]+(\.[a-z0-9-]+)*\.up\.railway\.app/i)?.[0];
  let domain = findDomain(railway(["domain", "list", "--service", web.name, "--json"], { allowFail: true }).out);
  if (!domain) domain = findDomain(railway(["domain", "--service", web.name, "--json"]).out);
  if (!domain) throw new Error("Couldn't create the web address. Add one in Railway → website → Settings → Networking.");
  done(`https://${domain}`);

  if (importFile) {
    step(`Copying your board from ${importFile}`);
    const dbVariables = railway(["variable", "list", "--service", database.name, "--kv"]).out;
    const publicUrl = dbVariables.match(/^DATABASE_PUBLIC_URL=(.*)$/m)?.[1];
    if (!publicUrl) {
      console.log("  The database isn't reachable from your computer yet. In Railway → Postgres → Settings → Networking,");
      console.log("  turn on Public Networking, then run:  npm run railway:setup -- --import " + importFile);
    } else {
      const result = spawnSync(`npm run import -- ${quote(importFile)}`, {
        shell: true,
        stdio: "inherit",
        env: { ...process.env, DATABASE_PUBLIC_URL: publicUrl },
      });
      if (result.status !== 0) console.log("  (Import skipped — see the message above.)");
    }
  }

  step("Deploying");
  railway(["service", "redeploy", "--service", web.name, "--yes"], { allowFail: true });
  const deadline = Date.now() + 10 * 60 * 1000;
  let health = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`https://${domain}/api/health`, { signal: AbortSignal.timeout(10_000) });
      health = await res.json();
      if (health.ok && health.database === "postgresql") break;
    } catch {
      // still deploying
    }
    process.stdout.write(".");
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  console.log("");
  if (health?.ok && health.database === "postgresql") {
    done("The site is live and stores everything in Railway's PostgreSQL — redeploys keep your data.");
  } else {
    console.log(`  ⚠ The site didn't report healthy yet${health?.error ? `: ${health.error}` : ""}.`);
    console.log("    Check the deploy logs in Railway; you can run this setup again at any time.");
  }

  console.log(`\nYour site:      https://${domain}`);
  console.log(`First-time setup (only needed before the admin account exists):`);
  console.log(`  https://${domain}/setup?token=${setupToken}\n`);
} catch (error) {
  console.error(`\n✗ ${error.message}`);
  process.exit(1);
}
