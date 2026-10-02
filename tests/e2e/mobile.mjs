// Phone test: everything a teammate does, done with taps on a small Android-sized screen.
// Run against the demo board:   npm run demo   (then, in another terminal)   npm run e2e:mobile
// Env: BASE_URL (default http://localhost:3000), SHOTS_DIR, HEADED=1 to watch.
// It cleans up after itself (the test reel and test member are deleted at the end).
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
import { DEMO_PASSWORD } from "../../scripts/seed-demo.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = process.env.SHOTS_DIR ?? "tests/e2e/screenshots";
const TEST_REEL = "https://www.instagram.com/reel/CjiK72CtydN/"; // public reel that isn't in the demo set
const TEST_MEMBER = { name: "Phone Tester", email: "phone.tester@demo.team", password: "phone-pass-123" };
mkdirSync(SHOTS, { recursive: true });

const PHONE = {
  viewport: { width: 360, height: 780 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36",
};

const browser = await chromium.launch({ channel: "chrome", headless: !process.env.HEADED });
const problems = [];
let step = "start";

const log = (message) => {
  step = message;
  console.log(`▶ ${message}`);
};

async function phone(email) {
  const context = await browser.newContext(PHONE);
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  const page = await context.newPage();
  page.on("pageerror", (err) => problems.push(`[${email}] ${err.message}`));
  await page.goto(`${BASE}/login`);
  await page.fill("#email", email);
  await page.fill("#password", DEMO_PASSWORD);
  await page.locator("button[type=submit]").tap();
  await page.waitForURL(`${BASE}/`);
  return page;
}

async function noSideways(page) {
  const { scroll, screen } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, screen: innerWidth }));
  if (scroll > screen + 1) throw new Error(`${page.url()} scrolls sideways (${scroll}px wide on a ${screen}px screen)`);
}

const bottomBar = (page, href) => page.locator(`nav.bottom-nav a[href="${href}"]`);

try {
  const admin = await phone("aria@demo.team");

  log("bottom bar reaches every section");
  for (const [href, heading] of [["/board", "Production board"], ["/tasks", "My tasks"], ["/admin", "Team"], ["/", "Team feed"]]) {
    await bottomBar(admin, href).tap();
    await admin.getByRole("heading", { level: 1, name: heading }).waitFor();
    await noSideways(admin);
  }

  log("status filter chips and playing a reel from the feed");
  await admin.locator('nav[aria-label="Filter by status"] a', { hasText: "In production" }).tap();
  await admin.waitForURL(/status=in_production/);
  await admin.locator('nav[aria-label="Filter by status"] a', { hasText: "All ideas" }).tap();
  await admin.waitForURL(`${BASE}/`);
  const firstCard = admin.locator("article").first();
  await firstCard.locator("button[aria-label='Load the reel'], button[aria-label='Loading the reel']").first().tap();
  await admin.waitForFunction(() => {
    const frame = document.querySelector("article iframe");
    return frame && !frame.className.includes("opacity-0");
  }, null, { timeout: 20_000 });

  log("🔥 vote with a tap (and undo)");
  const vote = firstCard.locator("button[aria-pressed]");
  const before = await vote.innerText();
  await vote.tap();
  await admin.waitForFunction(([el, old]) => el.innerText !== old, [await vote.elementHandle(), before]);
  await vote.tap();
  await admin.waitForFunction(([el, old]) => el.innerText === old, [await vote.elementHandle(), before]);

  log("add a reel: Paste button, idea starter, tag chips");
  await bottomBar(admin, "/reels/new").tap();
  await admin.waitForURL(/\/reels\/new/);
  await admin.evaluate((url) => navigator.clipboard.writeText(`Look at this ${url}?igsh=abc`), TEST_REEL);
  await admin.getByRole("button", { name: "Paste" }).tap();
  if (await admin.getByText("Already on the board").isVisible({ timeout: 3000 }).catch(() => false)) {
    // Left over from an interrupted run: remove it and start again.
    await admin.getByRole("link", { name: "Open it" }).tap();
    await admin.getByRole("button", { name: /Delete/ }).first().tap();
    await admin.getByRole("button", { name: /Tap again/ }).tap();
    await admin.waitForURL(`${BASE}/`);
    await bottomBar(admin, "/reels/new").tap();
    await admin.getByRole("button", { name: "Paste" }).tap();
  }
  await admin.getByText("Reel found").waitFor();
  await admin.getByRole("button", { name: "Show preview" }).tap();
  await admin.locator('iframe[src*="CjiK72CtydN"]').waitFor();
  await admin.getByRole("button", { name: "Hide preview" }).tap();
  await admin.locator("#idea").tap();
  await admin.keyboard.type("Phone test: film a calm morning routine ");
  await admin.locator("button", { hasText: "Copy the hook" }).tap();
  await admin.keyboard.type("start with the question");
  await admin.locator("button", { hasText: "+ hook" }).tap();
  await admin.locator("#tags-input").tap();
  await admin.keyboard.type("phone-test");
  await admin.keyboard.press("Enter");
  await admin.getByRole("button", { name: "Remove tag hook" }).tap();
  await noSideways(admin);
  await admin.screenshot({ path: `${SHOTS}/mobile-add-reel.png`, fullPage: true, caret: "initial" });
  await admin.getByRole("button", { name: "Save to the board" }).tap();
  await admin.waitForURL(/\/reels\/\d+\?added=1$/);
  const reelPath = new URL(admin.url()).pathname;
  await admin.getByText("#phone-test").waitFor();
  if (await admin.getByText("#hook", { exact: true }).count()) throw new Error("removed tag was saved");

  log("edit the idea, change status, assign with a date");
  await admin.getByRole("button", { name: "Edit" }).tap();
  await admin.locator("textarea#idea").fill("Phone test: edited on a phone");
  await admin.locator("form:has(textarea#idea) button[type=submit]").tap();
  await admin.getByText("Phone test: edited on a phone").waitFor();
  await admin.getByRole("group", { name: "Change status" }).getByRole("button", { name: /Approved/ }).tap();
  await admin.getByText("moved this to Approved").waitFor();
  await admin.selectOption('select[name="assigneeId"]', { label: "Mia R." });
  await admin.fill('input[name="dueDate"]', "2026-12-24");
  await admin.locator('form:has(select[name="assigneeId"]) button[type=submit]').tap();
  await admin.getByText("assigned this to Mia R. · due Dec 24").waitFor();

  log("comment, then delete it with two taps");
  await admin.locator('textarea[name="body"]').tap();
  await admin.keyboard.type("Comment typed on a phone 📱");
  await admin.getByRole("button", { name: "Send" }).tap();
  const comment = admin.locator("li", { hasText: "Comment typed on a phone" });
  await comment.waitFor();
  await comment.getByRole("button", { name: "Delete comment" }).tap();
  await comment.getByRole("button", { name: "Delete?" }).tap();
  await comment.waitFor({ state: "detached" });
  await noSideways(admin);
  await admin.screenshot({ path: `${SHOTS}/mobile-reel-page.png`, caret: "initial" });

  log("member: sees the task and starts it");
  const member = await phone("mia@demo.team");
  await bottomBar(member, "/tasks").tap();
  const task = member.locator("div.rounded-2xl", { hasText: "Phone test: edited on a phone" }).first();
  await task.getByRole("button", { name: /Start making it/ }).tap();
  await member.getByText("Moved to In production").waitFor();
  await member.goto(BASE + reelPath);
  await member.getByRole("group", { name: "Change status" }).waitFor(); // the assignee can move it along
  await noSideways(member);

  log("member: profile, settings and log out");
  await bottomBar(member, "/profile").tap();
  await member.getByRole("link", { name: "Account settings" }).tap();
  await member.getByRole("button", { name: "Log out", exact: true }).tap();
  await member.waitForURL(/\/login/);

  log("admin: add a member, edit, reset password, turn off/on, delete");
  await bottomBar(admin, "/admin").tap();
  await admin.fill("#member-name", TEST_MEMBER.name);
  await admin.fill("#member-email", TEST_MEMBER.email);
  await admin.fill("#member-password", TEST_MEMBER.password);
  await admin.getByRole("button", { name: "Add member" }).tap();
  await admin.getByText(`${TEST_MEMBER.name} was added`).waitFor();
  await admin.getByRole("button", { name: "Done" }).tap();
  const row = admin.locator("li", { hasText: TEST_MEMBER.email });
  await row.getByRole("button", { name: "Edit" }).tap();
  await row.locator('input[name="name"]').fill("Phone Tester 2");
  await row.getByRole("button", { name: "Save changes" }).tap();
  await row.getByText("Phone Tester 2").waitFor();
  await row.getByRole("button", { name: "Password" }).tap();
  await row.locator('input[name="password"]').fill("another-pass-456");
  await row.getByRole("button", { name: "Set password" }).tap();
  await row.getByText("New password set").waitFor();
  await row.getByRole("button", { name: "Turn off" }).tap();
  await row.getByText("Turned off").waitFor();
  await row.getByRole("button", { name: "Turn on" }).tap();
  await row.getByText("Turned off").waitFor({ state: "detached" });
  await noSideways(admin);
  await admin.screenshot({ path: `${SHOTS}/mobile-team.png`, caret: "initial" });
  await row.getByRole("button", { name: "Delete" }).tap();
  await row.getByRole("button", { name: "Sure?" }).tap();
  await row.waitFor({ state: "detached" });

  log("admin: share target opens the add form with the link");
  await admin.goto(`${BASE}/share?text=${encodeURIComponent(`Check ${TEST_REEL}`)}`);
  await admin.waitForURL(/\/reels\/new\?url=/);

  log("clean up: delete the test reel with two taps");
  await admin.goto(BASE + reelPath);
  await admin.getByRole("button", { name: "Delete", exact: true }).tap();
  await admin.getByRole("button", { name: "Tap again to delete" }).tap();
  await admin.waitForURL(`${BASE}/`);

  console.log("\n✅ Phone test passed");
} catch (error) {
  console.error(`\n❌ Failed at: ${step}\n${error.stack ?? error}`);
  process.exitCode = 1;
} finally {
  if (problems.length) console.log(`\nPage errors:\n- ${[...new Set(problems)].join("\n- ")}`);
  await browser.close();
}
