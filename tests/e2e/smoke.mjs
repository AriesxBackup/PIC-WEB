// End-to-end smoke test using your installed Google Chrome (headless).
// 1. Start the app on an EMPTY database:  npm run dev   (or the Docker image)
// 2. Run:                                  npm run e2e
// Env: BASE_URL (default http://localhost:3000), REEL_URL, SHOTS_DIR (screenshots), HEADED=1 to watch.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const REEL = process.env.REEL_URL ?? "https://www.instagram.com/reel/Dbn-XJhk0_-/";
const SECOND_REEL = "https://www.instagram.com/reel/C0ffee12345/";
const SHOTS = process.env.SHOTS_DIR ?? "tests/e2e/screenshots";
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: !process.env.HEADED });
const problems = [];
let step = "start";

function watch(page, who) {
  page.on("pageerror", (err) => problems.push(`[${who}] page error: ${err.message}`));
  page.on("console", (msg) => {
    const where = msg.location().url;
    // 404s we cause on purpose: a member opening /admin, and the preview of the fake (unembeddable) reel.
    const expected404 = /status of 404/.test(msg.text()) && /\/admin$|\/api\/thumbs\//.test(where);
    if (msg.type() === "error" && !expected404 && !/instagram|cdninstagram|fbcdn|facebook/i.test(msg.text() + where)) {
      problems.push(`[${who}] console error: ${msg.text()}`);
    }
  });
  // Record Instagram's postMessage traffic so we can confirm the embed auto-resizes.
  page.addInitScript(() => {
    window.__igMessages = [];
    window.addEventListener("message", (e) => {
      if (e.origin.includes("instagram.com")) window.__igMessages.push(String(typeof e.data === "string" ? e.data : JSON.stringify(e.data)).slice(0, 200));
    });
  });
}

async function shot(page, name) {
  // caret: "initial" — Playwright's default caret hiding edits inputs and trips React's hydration check.
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false, caret: "initial" });
  console.log(`  📸 ${name}.png`);
}

function log(message) {
  step = message;
  console.log(`▶ ${message}`);
}

try {
  // ---------- Admin (desktop) ----------
  const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const admin = await adminCtx.newPage();
  watch(admin, "admin");

  log("first run redirects to /setup and creates the admin");
  await admin.goto(`${BASE}/`);
  await admin.waitForURL(/\/setup$/);
  await shot(admin, "01-setup");
  await admin.fill("#name", "Aria Admin");
  await admin.fill("#email", "aria@team.test");
  await admin.fill("#password", "password123");
  await admin.fill("#confirm", "password123");
  await admin.click("button[type=submit]");
  await admin.waitForURL(`${BASE}/`);
  await admin.getByText("No reels yet").waitFor();
  await shot(admin, "02-empty-feed");

  log("admin adds a team member with an email + password of their choice");
  await admin.goto(`${BASE}/admin`);
  await admin.fill("#member-name", "Max Member");
  await admin.fill("#member-email", "max@team.test");
  await admin.fill("#member-password", "password456");
  await admin.getByRole("button", { name: "Add member" }).click();
  await admin.getByText("Max Member was added").waitFor();
  await shot(admin, "03-admin-team");

  log("admin adds a reel with an idea and tags");
  await admin.goto(`${BASE}/reels/new`);
  await admin.fill("#url", `Check this out ${REEL}?igsh=abc123`);
  await admin.getByText("✓ Reel found").waitFor();
  await admin.getByRole("button", { name: "Show preview" }).click();
  await admin.locator('iframe[src*="instagram.com"]').waitFor();
  await admin.fill("#idea", "Recreate this space timelapse with our product spinning in the dark. Same slow zoom + music swell.");
  await admin.fill("#tags-input", "space");
  await admin.keyboard.press("Enter");
  await admin.getByRole("button", { name: "+ hook" }).click();
  await admin.getByRole("button", { name: "Save to the board" }).click();
  await admin.waitForURL(/\/reels\/\d+\?added=1$/);
  const reelPath = new URL(admin.url()).pathname;
  await admin.getByText("Saved! The whole team can see it now.").waitFor();

  log("the Instagram player loads and resizes itself");
  await admin.waitForTimeout(6000);
  const embed = await admin.$eval('iframe[src*="instagram.com"]', (el) => ({
    src: el.getAttribute("src"),
    height: Math.round(el.getBoundingClientRect().height),
    width: Math.round(el.getBoundingClientRect().width),
  }));
  const igMessages = await admin.evaluate(() => window.__igMessages);
  console.log(`  embed ${embed.width}x${embed.height} from ${embed.src}`);
  console.log(`  instagram messages: ${igMessages.length} (e.g. ${igMessages.slice(0, 3).join(" | ") || "none"})`);
  await shot(admin, "04-reel-detail");

  log("vote, comment, approve and assign");
  await admin.getByRole("button", { name: /Fire vote/ }).click();
  await admin.getByText("You want to make this").waitFor();
  await admin.fill('textarea[name="body"]', "Love this one — let's do it next week!");
  await admin.getByRole("button", { name: "Send" }).click();
  await admin.getByText("Love this one — let's do it next week!").waitFor();
  await admin.getByRole("group", { name: "Change status" }).getByRole("button", { name: /Approved/ }).click();
  await admin.getByText("moved this to Approved").waitFor();
  await admin.selectOption('select[name="assigneeId"]', { label: "Max Member" });
  await admin.fill('input[name="dueDate"]', "2026-10-05");
  await admin.locator('form:has(select[name="assigneeId"])').getByRole("button", { name: "Save" }).click();
  await admin.getByText("assigned this to Max Member · due Oct 5").waitFor();
  const shownAssignee = await admin.$eval('select[name="assigneeId"]', (el) => el.selectedOptions[0]?.textContent);
  if (shownAssignee !== "Max Member") throw new Error(`assignee picker shows "${shownAssignee}" after saving`);
  await shot(admin, "05-reel-detail-assigned");

  // ---------- Member (phone) ----------
  log("member logs in on a phone-sized screen");
  const memberCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const member = await memberCtx.newPage();
  watch(member, "member");
  await member.goto(`${BASE}${reelPath}`);
  await member.waitForURL(/\/login\?next=/);
  await member.fill("#email", "MAX@team.test");
  await member.fill("#password", "wrong-password");
  await member.click("button[type=submit]");
  await member.getByText("Wrong email or password.").waitFor();
  await member.fill("#password", "password456");
  await member.click("button[type=submit]");
  await member.waitForURL(`${BASE}${reelPath}`);
  await member.waitForTimeout(4000);
  await shot(member, "06-mobile-reel-detail");

  log("member sees the feed with the reel");
  await member.goto(`${BASE}/`);
  await member.getByText("Recreate this space timelapse").first().waitFor();
  if (await member.getByRole("banner").getByRole("link", { name: "Add reel" }).isVisible()) {
    throw new Error("header Add reel button should be hidden on phones (bottom bar has +)");
  }
  await member.waitForTimeout(3000);
  await shot(member, "07-mobile-feed");

  log("live update: member gets a toast when the admin adds a reel");
  await admin.goto(`${BASE}/reels/new?url=${encodeURIComponent(SECOND_REEL)}`);
  await admin.fill("#idea", "Use this audio for our behind-the-scenes clip");
  await admin.getByRole("button", { name: "Save to the board" }).click();
  await admin.waitForURL(/\/reels\/\d+\?added=1$/);
  await member.getByText("Aria Admin added a new reel").waitFor({ timeout: 10_000 });
  await member.getByText("Use this audio for our behind-the-scenes clip").first().waitFor({ timeout: 10_000 });
  await shot(member, "08-mobile-live-toast");

  log("a reel Instagram can't embed falls back to a link");
  await admin.getByText("Can't play this reel here").waitFor({ timeout: 20_000 });
  await shot(admin, "08b-unplayable-reel");

  log("member's tasks: start the assigned reel");
  await member.goto(`${BASE}/tasks`);
  await member.getByText("Recreate this space timelapse").waitFor();
  await member.getByRole("button", { name: "🎬 Start making it" }).click();
  await member.getByText("Moved to In production").waitFor();
  await shot(member, "09-mobile-tasks");

  log("share target turns shared text into a prefilled form");
  await member.goto(`${BASE}/share?text=${encodeURIComponent("Look 👀 https://www.instagram.com/reel/C0ffee99999/?igsh=xyz")}`);
  await member.waitForURL(/\/reels\/new\?url=/);
  const prefilled = await member.inputValue("#url");
  if (!prefilled.includes("C0ffee99999")) throw new Error(`share target did not prefill the link: ${prefilled}`);
  await shot(member, "10-mobile-share-target");

  log("duplicate links are caught before saving");
  await member.goto(`${BASE}/reels/new?url=${encodeURIComponent(REEL)}`);
  await member.getByText("Already on the board").waitFor();
  await shot(member, "11-mobile-duplicate");

  log("members can't open the admin page or change status");
  const adminPage = await member.goto(`${BASE}/admin`);
  if (adminPage?.status() !== 404) throw new Error(`member got ${adminPage?.status()} on /admin`);
  await member.goto(`${BASE}${reelPath}`);
  await member.getByText("You").first().waitFor();

  log("board view");
  await admin.goto(`${BASE}/board`);
  await admin.getByText("Production board").waitFor();
  await shot(admin, "12-board");

  log("search and tag filters");
  await admin.goto(`${BASE}/?tag=space`);
  await admin.getByText("Recreate this space timelapse").first().waitFor();
  if (await admin.getByText("Use this audio for our behind-the-scenes clip").count()) throw new Error("tag filter leaked");

  log("backup download works for the admin");
  const backup = await admin.request.get(`${BASE}/api/admin/backup`);
  const data = backup.status() === 200 ? await backup.json() : null;
  if (data?.format !== "reel-board-backup" || data.users.length !== 2 || data.reels.length !== 2 || !data.comments.length) {
    throw new Error(`backup failed: ${backup.status()} ${JSON.stringify(data)?.slice(0, 200)}`);
  }

  log("logout");
  await member.goto(`${BASE}/settings`);
  await shot(member, "13-mobile-settings");
  await member.getByRole("button", { name: "Log out", exact: true }).click();
  await member.waitForURL(/\/login/);

  console.log("\n✅ Smoke test passed");
} catch (error) {
  console.error(`\n❌ Failed at: ${step}\n${error.stack ?? error}`);
  process.exitCode = 1;
} finally {
  if (problems.length) {
    console.log(`\nBrowser problems seen (${problems.length}):\n- ${[...new Set(problems)].join("\n- ")}`);
  }
  await browser.close();
}
