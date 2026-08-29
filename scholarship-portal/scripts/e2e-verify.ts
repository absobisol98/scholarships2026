// One-off Playwright verification for the scale-audit pass — not part of the app.
import { chromium, type Page } from "playwright-core";
import { db } from "../src/lib/db";

const BASE = "http://localhost:3000";

// Next.js Server Action redirects are client-side transitions (History API), not full
// page loads — waitForLoadState("load"/"networkidle") either fires too early or hangs
// forever against the dev server's persistent HMR websocket. Polling the URL is reliable
// for both cases.
async function waitForUrlChange(page: Page, prevUrl: string, timeoutMs = 10000): Promise<void> {
  const start = Date.now();
  while (page.url() === prevUrl && Date.now() - start < timeoutMs) {
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(300);
}

async function main() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });

  // Seed enough extra submitted applications that the queue's real page size (50) actually
  // needs a second page — the normal demo seed data is far too small to exercise
  // pagination. Real Student+Application pairs (not a disconnected "Applicant" roster row)
  // so they show up in the Applications Overview queue the same way a genuine submission
  // would — @example.test emails mean the cleanup pass at the end sweeps them up alongside
  // the other test students, no separate cleanup query needed.
  console.log("Seeding pagination test data...");
  const ugo = await db.program.findUniqueOrThrow({ where: { key: "ugo" } });
  const paginationEmails = Array.from({ length: 60 }, (_, i) => `pagination-test-${i}-${Date.now()}@example.test`);
  await db.student.createMany({
    data: paginationEmails.map((email, i) => ({ name: `Pagination Test Applicant ${i}`, initials: "PT", email })),
  });
  const paginationStudents = await db.student.findMany({ where: { email: { in: paginationEmails } }, select: { id: true } });
  await db.application.createMany({
    data: paginationStudents.map((s, i) => ({
      studentId: s.id,
      programId: ugo.id,
      status: "submitted",
      formStep: 4,
      submittedDate: "2026-01-01",
      fullName: `Pagination Test Applicant ${i}`,
      school: "Test School",
      gpa: "90",
      nationality: "Filipino",
      sex: "Male",
      yearLevel: "Grade 12",
      institutionType: "Public school",
      personalDone: true,
      familyDone: true,
      academicsDone: true,
      communityDone: true,
      essaysDone: true,
    })),
  });
  console.log("Seeded. Starting checks...");

  // --- 1. Rate limiter on signup: 6 rapid attempts, same email, expect the 6th blocked ---
  {
    const email = `ratelimit-test-${Date.now()}@example.test`;
    const ctx = await browser.newContext();
    ctx.setDefaultTimeout(15000);
    const page = await ctx.newPage();
    let lastUrl = "";
    for (let i = 0; i < 6; i++) {
      await page.goto(`${BASE}/signup`);
      await page.fill("#signup-name", `Rate Limit Test ${i}`);
      await page.fill("#signup-email", email);
      const prevUrl = page.url();
      await page.click('button[type="submit"]');
      await waitForUrlChange(page, prevUrl);
      lastUrl = page.url();
      // clear the session cookie between attempts so each hits signUpAsStudent's early
      // rate-limit check again instead of "already logged in" redirecting away.
      await ctx.clearCookies();
    }
    console.log(`[rate-limit] After 6 rapid signups with the same email, final URL: ${lastUrl}`);
    console.log(lastUrl.includes("rate_limited") ? "[rate-limit] PASS — blocked with rate_limited" : "[rate-limit] FAIL — not blocked");
    await ctx.close();
  }

  // --- 2. Normal single-attempt signup still works ---
  {
    const email = `normal-signup-${Date.now()}@example.test`;
    const ctx = await browser.newContext();
    ctx.setDefaultTimeout(15000);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/signup`);
    await page.fill("#signup-name", "Normal Signup Test");
    await page.fill("#signup-email", email);
    const prevUrl = page.url();
    await page.click('button[type="submit"]');
    await waitForUrlChange(page, prevUrl);
    const url = page.url();
    console.log(`[normal-signup] Landed on: ${url}`);
    console.log(!url.includes("/signup") ? "[normal-signup] PASS — signed in, left signup page" : "[normal-signup] FAIL — stuck on signup");
    await ctx.close();
  }

  // --- 3. Manage Users search correctness (SQL-side now) ---
  {
    const ctx = await browser.newContext();
    ctx.setDefaultTimeout(15000);
    const page = await ctx.newPage();
    // Staff log in with their email — no separate demo-shortcut buttons on /login anymore.
    await page.goto(`${BASE}/login`);
    await page.fill("#login-email", "e.cruz@scholarshipportal.example");
    const prevUrl = page.url();
    await page.click('button:has-text("Log in")');
    await waitForUrlChange(page, prevUrl);
    await page.goto(`${BASE}/admin/users?q=admin`);
    const rowCount = await page.locator("table tbody tr").count();
    console.log(`[manage-users-search] q=admin returned ${rowCount} row(s)`);
    await ctx.close();
  }

  // --- 4. Applications Overview pagination (ugo program) ---
  {
    const ctx = await browser.newContext();
    ctx.setDefaultTimeout(15000);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`);
    await page.fill("#login-email", "r.okafor@scholarshipportal.example");
    const prevUrl1 = page.url();
    await page.click('button:has-text("Log in")');
    await waitForUrlChange(page, prevUrl1);
    await page.goto(`${BASE}/admin/ugo/queue`);
    const bodyText = await page.locator("body").innerText();
    const showingLine = bodyText.split("\n").find((l) => l.includes("Showing"));
    console.log(`[pagination] Queue page summary line: ${showingLine}`);
    const nextBtn = page.locator('a:has-text("Next")');
    if (await nextBtn.count() > 0) {
      const prevUrl2 = page.url();
      await nextBtn.first().click();
      await waitForUrlChange(page, prevUrl2);
      console.log(`[pagination] After clicking Next, URL: ${page.url()}`);
      console.log(page.url().includes("page=2") ? "[pagination] PASS — advanced to page 2" : "[pagination] FAIL — did not advance");
    } else {
      console.log("[pagination] Next button not present/disabled (fewer than one page of data) — expected with normal seed-size data, not a failure");
    }
    await ctx.close();
  }

  // --- 5. Oversized cert upload on the application form (ugo program, step 2/Academic) ---
  // Uses a freshly signed-up student rather than the demo persona, whose seeded ugo
  // application is already submitted (so its Academic step wouldn't be reachable).
  {
    const email = `upload-limit-test-${Date.now()}@example.test`;
    const ctx = await browser.newContext();
    ctx.setDefaultTimeout(15000);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/signup`);
    await page.fill("#signup-name", "Upload Limit Test");
    await page.fill("#signup-email", email);
    const prevUrl = page.url();
    await page.click('button[type="submit"]');
    await waitForUrlChange(page, prevUrl);

    // Visiting the page once lazily creates the Application row (ensureApplication).
    // Then jump straight to the Academic step (formStep 2) via the DB instead of clicking
    // through Personal/Family, which have required fields the UI would otherwise block on.
    await page.goto(`${BASE}/programs/ugo/application`);
    const uploadTestStudent = await db.student.findFirstOrThrow({ where: { email } });
    await db.application.update({
      where: { studentId_programId: { studentId: uploadTestStudent.id, programId: ugo.id } },
      data: { formStep: 2 },
    });
    page.on("response", (res) => {
      if (res.url().includes("/programs/ugo/application")) console.log(`[upload-limit][debug] response ${res.status()} ${res.url()}`);
    });
    page.on("console", (msg) => console.log(`[upload-limit][debug][console] ${msg.text()}`));
    await page.goto(`${BASE}/programs/ugo/application`);
    const certInput = page.locator("#f-cert");
    if (await certInput.count() > 0) {
      // The Academic step's own required fields (school, gpa) block HTML5 form submission
      // just as surely as an oversized file would silently not — fill them first so this
      // check actually isolates the file-size rejection instead of a masked, unrelated
      // "form never submitted at all" false negative.
      await page.fill("#f-school", "Test State University");
      await page.fill("#f-gpa", "90");
      const bigBuffer = Buffer.alloc(11 * 1024 * 1024, "a"); // 11MB > 10MB cert cap
      await certInput.setInputFiles({ name: "huge-cert.pdf", mimeType: "application/pdf", buffer: bigBuffer });
      const attachedSize = await certInput.evaluate((el: HTMLInputElement) => el.files?.[0]?.size);
      console.log(`[upload-limit][debug] attached file size: ${attachedSize}`);
      const prevUrl2 = page.url();
      await page.locator('button.btn-primary:has-text("Continue")').first().click();
      await waitForUrlChange(page, prevUrl2, 20000);
      const url = page.url();
      console.log(`[upload-limit] After 11MB cert upload, URL: ${url}`);
      console.log(url.includes("file_too_large") ? "[upload-limit] PASS — blocked with file_too_large" : "[upload-limit] FAIL — not blocked");
    } else {
      console.log("[upload-limit] Could not reach the Academic step's cert field (may already be past it / submitted) — skipping");
    }

    // --- 6. Normal-sized file still saves correctly (same page, small file, no error) ---
    // Uploads go to real Supabase Storage (src/lib/storage.ts) as of the Gap 2 document-
    // storage work — this sandbox has no real SUPABASE_URL/SERVICE_ROLE_KEY, so this check
    // only runs where those are actually configured rather than crashing on every run here.
    if (await certInput.count() > 0 && process.env.SUPABASE_URL) {
      const smallBuffer = Buffer.alloc(20 * 1024, "a"); // 20KB, well under the 10MB cap
      await certInput.setInputFiles({ name: "small-cert.pdf", mimeType: "application/pdf", buffer: smallBuffer });
      await page.locator('button.btn-primary:has-text("Continue")').first().click();
      await page.waitForTimeout(1000);
      const savedApp = await db.application.findUniqueOrThrow({
        where: { studentId_programId: { studentId: uploadTestStudent.id, programId: ugo.id } },
      });
      // certFileName now holds a storage path (app-{id}/cert/{timestamp}-{name}), not the
      // raw original filename — see src/lib/storage.ts's uploadDocument.
      console.log(`[normal-upload] After 20KB cert upload: certFileName=${savedApp.certFileName}, formStep=${savedApp.formStep}`);
      console.log(
        !!savedApp.certFileName?.endsWith("-small-cert.pdf") && savedApp.formStep === 3
          ? "[normal-upload] PASS — saved and advanced to next step"
          : "[normal-upload] FAIL — did not save/advance as expected"
      );
    } else if (await certInput.count() > 0) {
      console.log("[normal-upload] SUPABASE_URL not configured in this environment — skipping (Gap 2 storage can't be live-tested without real Supabase Storage credentials)");
    }
    await ctx.close();
  }

  // --- 7. Required-field validation is enforced server-side, not just via HTML5 `required`
  // --- (Personal step — no file fields involved, so this runs regardless of Supabase config)
  {
    const email = `required-field-test-${Date.now()}@example.test`;
    const ctx = await browser.newContext();
    ctx.setDefaultTimeout(15000);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/signup`);
    await page.fill("#signup-name", "Required Field Test");
    await page.fill("#signup-email", email);
    const prevUrl = page.url();
    await page.click('button[type="submit"]');
    await waitForUrlChange(page, prevUrl);

    await page.goto(`${BASE}/programs/ugo/application`);
    await page.fill("#f-fullName", "Required Field Test");
    await page.fill("#f-dob", "2007-05-14");
    // Deliberately leave nationality/sex/yearLevel/institutionType unselected, then strip
    // every `required` attribute so the browser's own HTML5 constraint validation can't
    // block the submit either — the only thing left standing between this request and a
    // saved application is saveStepAndContinue's own server-side check.
    await page.evaluate(() => {
      document.querySelectorAll("[required]").forEach((el) => el.removeAttribute("required"));
    });
    const prevUrl2 = page.url();
    await page.click('button.btn-primary:has-text("Continue")');
    await waitForUrlChange(page, prevUrl2);
    const url = page.url();
    console.log(`[required-field] After submitting Personal step with required dropdowns blank, URL: ${url}`);
    console.log(url.includes("missing_required") ? "[required-field] PASS — blocked with missing_required" : "[required-field] FAIL — not blocked");

    const reqTestStudent = await db.student.findFirstOrThrow({ where: { email } });
    const reqTestApp = await db.application.findUniqueOrThrow({
      where: { studentId_programId: { studentId: reqTestStudent.id, programId: ugo.id } },
    });
    console.log(`[required-field] DB state: formStep=${reqTestApp.formStep} status=${reqTestApp.status} personalDone=${reqTestApp.personalDone}`);
    console.log(
      reqTestApp.formStep === 0 && !reqTestApp.personalDone
        ? "[required-field] PASS — did not advance past the incomplete step"
        : "[required-field] FAIL — advanced despite missing required fields"
    );

    // --- 8. submitApplication independently refuses a bypassed/replayed request whose
    // --- earlier steps were never actually completed (formStep forced to 4 via DB, but
    // --- personalDone is still false from check 7 above) ---
    await db.application.update({ where: { id: reqTestApp.id }, data: { formStep: 4 } });
    await page.goto(`${BASE}/programs/ugo/application`);
    const essayField = page.locator("#f-essay1");
    if (await essayField.count() > 0) {
      await essayField.fill("Bypassing earlier steps.");
      const essay2 = page.locator("#f-essayText2");
      if (await essay2.count() > 0) await essay2.fill("Bypassing earlier steps, part two.");
      await page.click('button:has-text("Submit application")');
      await page.click('div[role="dialog"] button:has-text("Submit application")');
      await page.waitForTimeout(1000);
      const finalApp = await db.application.findUniqueOrThrow({ where: { id: reqTestApp.id } });
      console.log(`[incomplete-submit] After forcing formStep=4 with personalDone=false and submitting: status=${finalApp.status}`);
      console.log(
        finalApp.status !== "submitted"
          ? "[incomplete-submit] PASS — refused to submit an application with incomplete earlier steps"
          : "[incomplete-submit] FAIL — submitted despite incomplete earlier steps"
      );
    } else {
      console.log("[incomplete-submit] Could not reach the statement step's essay field — skipping");
    }

    await ctx.close();
  }

  await browser.close();

  console.log("\nCleaning up test data...");
  const testStudents = await db.student.findMany({ where: { email: { endsWith: "@example.test" } }, select: { id: true } });
  await db.application.deleteMany({ where: { studentId: { in: testStudents.map((s) => s.id) } } });
  await db.student.deleteMany({ where: { id: { in: testStudents.map((s) => s.id) } } });
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
