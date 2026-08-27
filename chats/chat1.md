# Scholarship Application System

_Started 2026-08-27 01:31 UTC_

---

## User

Make UI mockups for a scholarship application and management system

## Assistant



## Assistant

_[tool: ask_user]_

_[tool: ask_user]_

_[tool: ask_user]_

_[tool: ask_user]_

_[tool: ask_user]_

_[tool: ask_user]_

_[tool: ask_user]_

_[tool: ask_user]_

_[tool: ask_user]_

Waiting on your answers about roles, screens, complexity, and tone before I start building.

## User

Answered — user_roles: Student applicant, Program admin; screens: Application form (multi-step), Application status tracker, Award/decision letters, Messaging/notifications; application_complexity: Moderate (info, essays, transcripts, recommenders); scale: Nonprofit/foundation; device: Both; copy_tone: Warm & encouraging; num_screens: 6

## Assistant

_[tool: list_files]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: dc_write]_

_[tool: ready_for_verification]_

Built 6 mockup screens (student: application, status, award letter, messages; admin: queue, review) in one interactive DC with role/screen navigation, Modernist components throughout. Out for verification.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Fixed the connector rendering.

## User

Can you make it more a realistic design like a live?

## Assistant

_[tool: read_file]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

Now check the render.

_[tool: show_html]_

_[tool: ready_for_verification]_

Added realistic chrome: sidebar icons, notification bell with badge, breadcrumb-style headers, action buttons, pagination, unread indicators, 8-row applicant list, and dates aligned to today (Aug 27, 2026). Out for verification.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Fixed both overflow issues.

## User

I have three different scholarships - and what I visualize is that when an applicant logs in - they can choose from those 3 available or active scholarships program to apply

## Assistant

_[tool: read_file]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Added a "Browse scholarships" screen (now the student landing view) listing all 3 programs with status-aware cards — Continue/Start application or View award letter — wired into the existing application flow.

## User

Found issues — fixing…

## Assistant

_[tool: grep]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

All buttons converted to plain `.btn` classes now.

_[tool: ready_for_verification]_

Fixed the missing-bundle button issue by switching all CTAs to the design system's plain `.btn` classes, plus nowrap on the status tags.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Fixed both nowrap issues globally.

## User

Create a dummy login the the first page should show the available scholarships. It should not be a tab selection

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: ready_for_verification]_

Added a dummy login screen (email/password + "Log in as applicant" / "Log in as program admin") as the entry point; removed the role-switch tab — role is now set by which login button is used, and the first screen after login is the scholarships browse page. A "Log out" button replaces the tab control in the nav.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Fixed the nav wrapping.

## User

the browse scholarships should be a stand alone page → click scholarship → from this, they can see the tabs 'Application form', Status of Application of the chosen scholarship, award letter. remove the message

## Assistant

_[tool: read_file]_

_[tool: dc_html_str_replace]_

Now the big content restructure and JS updates.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

Now continuing the restructure: sidebar → tab-based program detail with Application form / Status / Award letter tabs.

_[tool: read_file]_

_[tool: read_file]_

Now I'll replace the whole Application/Status/Award/Messages block with the tabbed program-detail structure.

_[tool: dc_html_str_replace]_

_[tool: read_file]_

_[tool: dc_html_str_replace]_

Removed the "Browse scholarships" sidebar tab entirely — students now go full-width straight to Browse (no left rail); the admin sidebar is unaffected.

_[tool: ready_for_verification]_

_[tool: read_file]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Applied the amount-tag removal on the browse cards; finished wiring the tabbed program-detail flow with all backing data.

## User

in the login page can you put Google SSO as an option?

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Added a "Continue with Google" SSO button above the email/password fields on the login screen, with an "OR" divider.

## User

how to edit the names of the scholarship offered?

## Assistant

You can edit the program names two ways:

1. Directly in the design — click any scholarship name text (e.g. "STEM Access Scholarship") on the Browse page or the program-detail header and type to edit it in place.
2. In code — the three programs (name, amount, deadline, blurb, tags) are defined in the `programs` array near the top of the logic class in `Scholarship Portal.dc.html`. Tell me the new names/details and I'll update them directly.

## User

I cannot edit the STEM Access Scholarship - Make it U-GO Scholarship Grant

## Assistant

_[tool: grep]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Renamed to "U-GO Scholarship Grant" everywhere it appeared.

## User

Change to Generika Scholarship Grant

## Assistant

_[tool: grep]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Renamed to "Generika Scholarship Grant".

## User

The application form should start on the personal information

## Assistant

_[tool: read_file]_

_[tool: dc_html_str_replace]_

Now the JS: add formStep state, step-content flags, and navigation.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Application form now starts at Personal Information (step 1) and steps through Academics → Essays → Recommenders → Review with Back/Continue navigation.

## User

add attachments like video, certificate of school registration + edit the button as Save and Continue later

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Added file-upload fields for the school registration certificate and an optional intro video to the Academics step, and renamed the button to "Save and continue later".

## User

For the UGO scholarship app form, can it be divided into these parts:

Part 1: Personal Information
Part 2: Family Information
Part 3: Academic Information
Part 4: Community Involvement
Part 5: Personal Statement

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now the template content for each step.

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Restructured the application form into 5 parts — Personal Info, Family Info, Academic Info (with the attachments), Community Involvement, and Personal Statement — with matching stepper, checklist, and continue labels.

_[tool: grep]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Switched all amounts to Philippine peso (₱40,000 / ₱30,000 / ₱25,000) and the income placeholder to a PHP range.

## User

Apply drawing

## Assistant

_[tool: read_file]_

_[tool: str_replace_edit]_

Now apply the new classes to the relevant containers.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

Also make the login screen fill and stay responsive, and stack the queue's export/header row on mobile.

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Widened all content wrappers to fill the screen (removed the narrow fixed-width columns) and added mobile breakpoints: forms/grids/columns stack to one column, admin sidebar becomes a horizontal top bar, the applicants table scrolls horizontally, and the nav/login wrap gracefully on small screens.

## User

Apply drawing

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Removed the divider under the top nav.

## User

Below the UGO-SCHOLARSHIP GRANT and before the application form button, Put a short instruction:

INSTRUCTIONS
Please read and follow the instructions below.  

A. The scholarship applicant must complete this online application form thoroughly and accurately.

B. Prepare a digital copy of the following documents:

2x2 picture
Latest Copy of Grades signed by Registrar (wet signature)
Documentation of financial need, such as but not limited to the following:   
- Certificate of Indigency of parent(s) or guardian(s), issued by the barangay, CSWD/MSWD/DSWD, or another government entity*
- Most recent Income Tax Return (ITR) of parent(s) or guardian(s)*
- Tax Exemption Certificate from the BIR*
- For children of Overseas Filipino Workers (OFWs) and seafarers, recent contract or proof of income*
- Latest copy of electric bill or water bill (if available)*
- Senior citizen ID and/or PWD ID and/or Solo parent ID
- Proof of parent(s) or guardian(s) as DSWD 4Ps beneficiary
- Proof of parent(s) or guardian(s) as DOLE TUPAD beneficiary

*Note: Documents must be dated within the last 12 months.

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Added the instructions card between the program header and the tab bar, with the full document checklist.

## User

Please properly fix the formatting of the instructions do not put it as is where is.

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Reformatted with proper heading hierarchy (kicker, A/B labeled sections), nested bullet list for the sub-documents, superscript asterisks, and a separated footnote.

## User

can it be formatted as cards?

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Split into two side-by-side cards (A. Application form / B. Documents to prepare) under an "Instructions" heading, stacking on mobile via the existing responsive class.

## User

for documents to prepare its a big card display, please put a button that says 'view more' details' after the B. Documents to Prepare

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Card B now shows a short summary with a "View more details" toggle that expands/collapses the full document checklist.

## User

Add another card beside documents to prepare - REMINDER:

Complete the form on or before 11:59 PM, <date>. Applications will automatically close and will be inaccessible after the deadline. No extensions will be granted.

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Added a "Reminder" card with the deadline notice, using the program's actual deadline date.

## User

Apply drawing

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: grep]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Fixed the misaligned card heights — the three cards now stretch to match each other's height instead of sizing to their own content.

## User

Found issues — fixing…

## Assistant

_[tool: grep]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Widened the content area cap to 1600px and removed the tighter per-page overrides so the form/status/review screens now fill the available width on large screens.

## User

there's too much spacing between the upper paragraph and button adjust properly

## Assistant

_[tool: grep]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Tightened the gap between the paragraph and the "View list of documents" button.

## User

Upon clicking the submit button a confirmation modal should display for the applicant view asking them to properly review accuracy

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Clicking "Submit application" on the final step now opens a confirmation modal asking the applicant to review accuracy before submitting; confirming takes them to the Status tab.

## User

Observe the WCAG 2.1 AA and ARIA principles

## Assistant

_[tool: read_file]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

Now add the two new computed values (`adminQueueCurrent`/`adminReviewCurrent`) to the logic class.

_[tool: dc_js_str_replace]_

Also fix the checklist checkmarks and stepper icons to be decorative (hidden from AT since text labels already convey the info).

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Applied WCAG 2.1 AA / ARIA fixes: label `for`/`id` associations on every form field, real `<button>`/`<nav>` elements instead of clickable divs for the admin sidebar and notification icon, `role="dialog"` + `aria-modal`/`aria-labelledby` on the confirmation modal, `role="radiogroup"` on segmented tab/filter/rubric controls, `scope="col"` + accessible name on the applicants table, `aria-hidden` on decorative icons/checkmarks, and `role="status"` on dynamic confirmation/decision messages for screen-reader announcements.

## User

Continue checking

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Added further AA fixes: skip link + hidden `h1`, `role="main"` landmark, `required`/`aria-required` on essential fields, and modal focus-on-open + Escape-to-close.

## User

Found issues — fixing…

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Replaced the broken `componentDidUpdate` querySelector approach with a ref callback on the modal's first button, which fires on mount and focuses it directly — no lifecycle mismatch, no console error.

## User

for Generika Scholarship - can we have a different set of fields?

## Assistant



## Assistant

_[tool: ask_user]_

Waiting on which steps should differ and what fields to use for Generika's application form.

## User

Answered — which_steps: Personal Info, Family Info, Academic Info, Community Involvement, Personal Statement; field_details: Part 3: Leadership Experience

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now add the Leadership step markup, right beside the Academics step block.

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Generika's application form now swaps step 3 to "Leadership" (role, organization, duration, team size, impact description) instead of Academic Info — stepper, checklist label, and continue-button text all update accordingly. Other steps stayed the same since no other specifics were given; let me know if you want more of Generika's fields changed.

## User

wait, when I click it, it shows me UGO form not Generika

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Found it — "View award letter" wasn't passing the program id, so it always fell back to U-GO. Fixed: clicking Generika's card now correctly selects Generika before opening its award/application tabs.

## User

Found issues — fixing…

## User

I dont see the leadership experience in Generika Application Form

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Root cause fixed: `goApplication`/`goAward` were treating the tab's onChange event object as a program id, silently reverting `selectedProgramId` to U-GO. That's also why Generika's Leadership step wasn't showing — it should now appear correctly when Generika is selected.

## User

For Generika:

Under the Family Info, the applicant should be able to add as many family members as relevant

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

For Generika's Family Info step, added an "Additional family members" section with repeatable name/relationship/occupation rows, a "+ Add family member" button, and "Remove" on each row (kept once at least one remains).

## User

Apply drawing

## User

Apply drawing

## User

Apply drawing

## Assistant

_[tool: copy_starter_component]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: read_file]_

Good, structure confirmed correct.

_[tool: ready_for_verification]_

Added a drag-and-drop photo placeholder (grayscale, per Modernist's image treatment) to the top of each scholarship card on the Browse page — the user can drop in real program photos.

## User

Apply drawing

## Assistant

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: ready_for_verification]_

Increased the card's inner padding (space-3 → space-4) so the status tag and button have proper breathing room instead of sitting flush against the card edges.

## User

Apply drawing

## Assistant

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: ready_for_verification]_

Rebuilt the card's bottom section to flatten the nesting and use `margin-top:auto` so the status tag + button are guaranteed to sit inside the card's padded bounds regardless of content height differences between cards.

## User

Save and Continue later should display a modal for the applicant's confirmation then lead to the homepage

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

"Save and continue later" now opens a confirmation modal ("Progress saved") with "Keep editing" / "Go to homepage" — confirming takes the applicant back to the Browse scholarships page.

## User

In the admin page - the admin should be able to manage and select different scholarship programs too with its own list of applicants

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now update the queue template header to add a program dropdown and use dynamic program name/deadline.

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Added a "Scholarship program" dropdown to the admin Applications Queue — switching it now filters to that program's own applicant list, counts, and header (name/deadline), with U-GO/Generika/EO Skolar applicants split across the three programs.

## User

The admin should also have the function to manage the fields for each scholarship programs

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now add renderVals wiring and template markup.

_[tool: dc_js_str_replace]_

Now the sidebar item and the new screen markup.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Added a "Manage fields" screen for admin: pick a program, then per step (Personal/Family/Academic-or-Leadership/Community/Statement) rename fields, toggle Shown/Required, remove, or add new fields. Note: this configures the admin's view of each program's field set as a mockup — it doesn't yet feed back into the live applicant-facing form rendering.

## User

Upon login of the admin, it should display the first page that shows the different workspace they can choose from

U-GO Workspace
EO Workspace
Generika Workspace

then each of the workspace have their own management of fields, applicants, dashboard

## Assistant

_[tool: read_file]_

_[tool: dc_html_str_replace]_

Now add the Workspaces picker screen and Dashboard screen, and remove the per-screen program selects from Queue/Fields.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

Now the JS logic: state, actions, and renderVals.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now update renderVals: replace admin program-scoping vars with workspace-scoped equivalents.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

## Assistant

_[tool: snip]_

_[tool: ready_for_verification]_

Admin now lands on a "Choose a workspace" picker (U-GO / Generika / EO Skolar cards) after login; entering one scopes a full sidebar (Dashboard, Applications queue, Applicant review, Manage fields) with a "← All workspaces" link back to the picker. Added a new Dashboard screen per workspace with applicant stat cards.

## User

Apply drawing

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

Now add the state, toggle handler, and computed values in JS.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Removed the divider between the admin sidebar and content, and made the sidebar collapsible via a chevron toggle at the top — collapsed state shrinks it to icon-only.

## User

Cohort Management

Admin can create/activate a cohort (e.g., "U-GO Batch 2027") tied to a specific scholarship program and rule set
Only one active cohort per program at a time (or explicitly support overlapping cohorts if needed — worth clarifying)

Criteria Management

Admin can edit hard filter criteria (nationality, sex, year level, institution type, GWA threshold, etc.) per cohort without code changes
Criteria changes should be versioned/logged so past applicants aren't retroactively affected by a later edit

Red Flag Auto-Tagging

On submission (or on data change), system evaluates applicant against active hard filters
Any unmet criterion → auto-tag applicant record as "Red Flag"
Generate a summary (which specific criteria failed, e.g., "GWA 82% — below 85% threshold") visible on the applicant's profile for evaluator review — not an auto-reject, just a flag for human eyes

Deadline / Cut-off

Admin defines application window (open date + cut-off date/time) per cohort
System should block new submissions after cut-off, and optionally auto-close/lock the cohort so no further edits are possible

Auto-submit at Cut-off

For applicants with in-progress/draft applications at the deadline — does "auto-submit" mean force-submitting whatever's been filled in so far, even if incomplete? That's worth locking down since it affects whether incomplete apps get red-flagged for missing fields too.

## Assistant

_[tool: update_todos]_

## Assistant

_[tool: dc_js_str_replace]_

Now extend applicants with the fields criteria evaluate against, and add cohort state/handlers.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now the handlers for cohort/criteria management.

_[tool: dc_js_str_replace]_

Now wire renderVals: workspace-scoped cohort list, criteria screen data, red-flag evaluation on queue/review.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now expose everything to the template.

_[tool: dc_js_str_replace]_

Now the sidebar item and the template markup for Cohorts / Criteria screens plus red-flag surfacing on Queue and Review.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

Now add the red-flag badge in the queue table and a Red Flags card on the Review screen.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Built out the full cohort/criteria/red-flag system: a "Cohorts" admin screen (create/activate cohorts, one active at a time), a "Manage criteria" screen per cohort with editable hard filters (nationality, sex, year level, institution type, GWA threshold), each toggleable and versioned in a change-history log, plus an application-window display. Applicants are now auto-evaluated against the active cohort's enforced criteria — unmet ones show a "Red Flag" badge in the queue and a detailed unmet-criteria list on the Applicant Review screen (flagged for human review, not auto-rejected). For the ambiguous auto-submit question, I made it an explicit per-cohort setting ("Auto-submit as-is" vs "Leave as incomplete draft") rather than assuming a default.

## User

I dont see the settings to set the cutoff date and start of application

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: grep]_

_[tool: str_replace_edit]_

Also add these editable open/cutoff dates to the cohort card on the Cohorts list screen so they're visible there too.

_[tool: ready_for_verification]_

Added editable "Opens" / "Cuts off" date fields to the Manage Criteria screen's Application Window card — previously it only displayed static text with no way to set them.

## User

For the U-GO scholarship grant dashboard can these details be added?

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now add handlers and renderVals for this card.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now the Dashboard template markup for this card.

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Added an "Active Batch" card to each workspace's Dashboard: batch selector dropdown, sign-ups/logins/old-account-login toggles with Close/Reopen buttons, an auto-submit note pulled from the cohort's setting, and a cutoff line with an "Edit Batch" link into Manage Criteria.

## User

Can you add the relevant options to U-GO based on this image?

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now the template card, placed alongside the Active Batch card on the Dashboard.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Added an "Applicants" pipeline card to each workspace dashboard (Signed up, Personal and school details, Application, Paper screening, Panel interview, Pre congress, Congress, Post congress) with counts and a "View all" link, sitting alongside the Active Batch card.

## User

Apply drawing

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: snip]_

_[tool: ready_for_verification]_

Removed "Personal and school details," "Pre congress," and "Congress" from the pipeline card, keeping Signed up, Application, Paper screening, Panel interview, and Post congress.

## User

Apply drawing

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Removed "Post congress" from the pipeline card.

## User

The signed up count will be those who are not yet starting the application, while the application count is the who have already started. Below that, please add Submitted count

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now render the hint under each stage count.

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Added a "Submitted" stage right below Application, and a small clarifying caption under each of Signed up ("Not yet started"), Application ("Started, in progress"), and Submitted ("Application complete") to make that distinction explicit.

## User

The system shall allow scholars to view their own submission history and see which requirements are still pending, without needing to contact the program team directly.

## Assistant

_[tool: dc_html_str_replace]_

Now add the new "My Submissions" screen markup, right after the Browse block.

_[tool: dc_html_str_replace]_

Now the JS: add `goSubmissions` action, `showSubmissions` flag, and the `submissionHistory` computed list.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Added a "My submission history" screen for applicants (linked from the Browse page) that lists every application they've started, its status, and a "Pending requirements" checklist of what's still missing — self-serve, no need to contact the program team.

## User

The scholarship programs disappeared in the applicants view

## User

The scholarship programs disappeared in the applicants view

## User

For each workspace - The system shall include a configurable check-in/survey module to deploy monitoring questionnaires to scholars twice yearly (mid-year and year-end). with independent survey fields for each programs

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now add handlers, sidebar item, screen data, and template markup.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

Now finishing the survey module: sidebar item and screen markup.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: snip]_

_[tool: ready_for_verification]_

Bumped the workspace picker cards to a stronger shadow (elev-md) so they read as raised. Also added the "Check-in surveys" admin module per workspace: Mid-Year and Year-End cards, each with its own independently editable question list (add/remove/rename) and a Deploy/Unpublish toggle.

## User

Since we have check-in surveys, the admin should have the capability to send it by group of applicants who were successfully awarded or by individual. insert a design as well where admins can monitor if they already sent the survey for the applicants (can be part of the applicant masterlist)

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now add state, handlers, and computed values for send-by-group/individual + sent tracking.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now wire this into renderVals (survey card recipient UI) and the queue masterlist columns.

_[tool: dc_js_str_replace]_

Now add survey-sent columns to the queue table's `filteredApplicants` mapping.

_[tool: dc_js_str_replace]_

Now the template: recipient picker in the survey card, and the masterlist "Surveys" column.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

Now add the "Surveys" column to the applicant masterlist table.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Added send controls to each survey card — "All awarded" (bulk) or "Choose individually" (checkbox list of awarded scholars) — with a "Sent to X of Y" summary, and a new "Surveys" column on the applicant masterlist showing Mid/Year sent-status badges (or "Not awarded" for ineligible applicants).

## User

Found issues — fixing…

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Fixed — added a proper negated `isNotAwarded` field so the two branches are now mutually exclusive.

## User

Apply drawing

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now update the `filteredApplicants` mapping with appId/phase/promote/demote fields.

_[tool: dc_js_str_replace]_

_[tool: grep]_

_[tool: str_replace_edit]_

Now rewrite the table markup to the 5 requested columns.

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Rebuilt the applicants table to the 5 requested columns: Name (with Red Flag badge), Application ID, Phase, Submitted Date, and Action (Promote/Demote/View Application) — Promote/Demote step the applicant through the phase pipeline.

## User

The Promote and Demote action should be a button together

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Merged Promote/Demote into a single joined pill control with thumbs-up/thumbs-down icons — green for Promote, amber for Demote — matching the reference images, and disabled at the phase boundaries.

## User

Apply drawing

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Swapped column order so Application ID now comes before Name.

## User

Apply drawing

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Added a subtle shadow to the scholarship cards on the Browse page.

## User

Apply drawing

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: ready_for_verification]_

Added subtle shadows to the dashboard's stat cards, Active Batch card, and Applicants pipeline card.

## User

Remove the applicant review since this can be viewed in the overview

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

Now remove the standalone Applicant Review screen block.

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: ready_for_verification]_

Removed the "Applicant review" sidebar item and its dedicated detail screen — Red Flag status, phase, and application info are already visible in the Applications Overview table.

## User

add view column → so admins can view applications of the applicants → upon review the application form of the applicants should be displayed to the admin

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now expose the view-application screen data (reusing reviewApplicant/reviewCohort/reviewFlags/rd already computed) and add `showViewApplication`.

_[tool: dc_js_str_replace]_

Now add the "View" column to the table and the new read-only Application view screen.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: grep]_

_[tool: str_replace_edit]_

Now add the new read-only Application Form screen, placed before "ADMIN: MANAGE FIELDS".

_[tool: dc_html_str_replace]_

_[tool: snip]_

_[tool: ready_for_verification]_

Added a "View" column (eye icon) to the applicants overview table — clicking it opens a read-only "Submitted application" screen for that applicant showing personal/family/academic details, attachments, red flags, and their personal statement.

## User

IN THE SUBMITTED APPLICATION - Can you put a visible submission date? and also put red flag card below the information (if applicable)

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: grep]_

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

Now confirm only one Red Flag block remains (the one below the info cards).

_[tool: grep]_

Good, only one instance now, correctly positioned below the info cards.

_[tool: ready_for_verification]_

Made the submission date a prominent tag next to the applicant's name, and moved the Red Flag card to appear below the info cards (only shown when applicable).

## User

The red flag should appear below personal statement

## User

Apply drawing

## User

Apply drawing

## Assistant

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: ready_for_verification]_

Added a proper space (`&nbsp;`) between "Submitted" and the date, and removed the fixed width that was cramping it.

## User

here's the color palette you can use #0433FF #FF7B00

## Assistant



## User

here's the color palette you can use

## Assistant

_[tool: dc_html_str_replace]_

_[tool: snip]_

_[tool: ready_for_verification]_

Applied your palette — primary blue (#0433FF) replaces the accent color throughout (buttons, links, active states, tags), with orange (#FF7B00) as the secondary accent, using your provided tints/shades for the ramps.

## User

I dont see any orange... haha

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

Also give the notification badge and the "Not started"/deadline tags a bit more orange presence.

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Now orange shows up: all outline tags (deadlines, "Not started" status) are orange, the Reminder card is orange-tinted, and the notification badge is orange — blue stays for primary actions/links.

## User

Can you set all the font as Inter

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Switched all headings and body text to Inter (loaded via Google Fonts) by overriding the design system's font variables.

