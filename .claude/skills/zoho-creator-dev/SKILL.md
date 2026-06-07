---
name: zoho-creator-dev
description: "Expert development guide for Zoho Creator apps — exploring app structure via MCP tools, building forms, creating old-style pages with Deluge scripts, writing On Success workflows, and applying battle-tested patterns for filters, lookups, score calculations, and dashboard pages. Use this skill whenever the user is working on any Zoho Creator project, even if they don't say 'skill'. Trigger on building a new form or page, writing or debugging a Deluge script, setting up a filter or dashboard, seeding data via API, architecting a Creator feature, or any mention of Zoho Creator, Deluge, old-style page, Creator form, On Success workflow, or Creator MCP."
---

# Zoho Creator Development Skill

## Step 1 — Load Context First

Before writing any code, always establish the app context:

1. Ask for (or read from memory): `account_owner_name` and `app_link_name`
2. Run `ZohoCreator_getForms` to see the full form list
3. Run `ZohoCreator_getFields` on every form you'll reference in Deluge
4. Run `ZohoCreator_getReports` if you need to read/update records via API

**Never guess field link names.** Display names and link names differ constantly (e.g., display "Agents" vs assumed "Agent_Lookup"). Always verify with `ZohoCreator_getFields` before writing criteria or field access in Deluge.

---

## MCP Tools Reference

| Task | Tool |
|------|------|
| List all forms | `ZohoCreator_getForms` |
| Get fields for a form | `ZohoCreator_getFields` |
| List all reports | `ZohoCreator_getReports` |
| Read records (up to 200) | `ZohoCreator_getCreatorRecords` |
| Add records | `ZohoCreator_addRecords` |
| Update one record | `ZohoCreator_updateRecordByID` |
| Update many records | `ZohoCreator_updateRecords` |
| Get form metadata | `ZohoCreator_getFormMetadata` |
| List pages | `ZohoCreator_getPages` |

All tools are deferred — load with `ToolSearch` before calling:
```
ToolSearch: select:mcp__3ce50d63-c2ad-443e-a560-1c077405f247__ZohoCreator_getForms
```

---

## Old-Style Page Architecture

Old-style Creator pages (`<% %>` Deluge blocks) are the most reliable for server-side data rendering. They support full Deluge, map operations, record queries, and dynamic HTML generation.

### Full Page Template

```html
<%{
%>
<div elName='zc-component' formLinkName='Your_Filter_Form'
  params='zc_Header=false&amp;zc_SuccMsg=Loading...&amp;zc_SubmitVal=Search&amp;zc_ResetVal=Reset'>
  Loading Form...
</div>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@3.3.7/dist/css/bootstrap.min.css">
<style>
  .report1{background:#16AF91;color:#fff;padding:5px}
  .rowBg1{background:#bfd194} .rowBg2{background:none}
  .yes-bgcolor{background:green;color:#fff} .no-bgcolor{background:#970505;color:#fff}
  th{background:#16AF91;color:#fff}
</style>
<%
// --- Read URL params ---
sdate = input.Start_Date;
edate = input.End_Date;

hasStart = sdate != null && sdate != "" && sdate != "null";
hasEnd   = edate != null && edate != "" && edate != "null";

html = "";

if(hasStart && hasEnd)
{
    startDate = sdate.toDate("dd-MMM-yyyy");
    endDate   = edate.toDate("dd-MMM-yyyy");

    // --- Query records ---
    records = Your_Form[Date_Field >= startDate && Date_Field <= endDate];

    tableRows = "";
    rowBg = 0;
    for each r in records
    {
        bg = "rowBg2";
        if(rowBg == 0) { bg = "rowBg1"; rowBg = 1; } else { rowBg = 0; }
        tableRows = tableRows + "<tr class='" + bg + "'><td>" + r.Field + "</td></tr>";
    }

    html = "<table class='table table-bordered table-condensed'>"
         + "<thead><tr class='report1'><th>Column</th></tr></thead>"
         + "<tbody>" + tableRows + "</tbody></table>";
}
else
{
    html = "<p style='color:#999;margin-top:20px;'>Please fill the filters and click Search.</p>";
}
%>
<%=html%>
<%}%>
```

---

## The URL Redirect Filter Pattern (Critical)

**Why it's needed:** The embedded form (`elName='zc-component'`) submits via AJAX — no page reload. The page's server-side Deluge never sees the POST body.

**Solution:** Add an "On Success" workflow to the filter form that builds a URL with values as query params and calls `openUrl`. The page then reads them via `input.fieldName`.

### On Success Workflow (on the filter form)

```deluge
pageLinkName = "Your_Page_Link_Name";
url = "#Page:" + pageLinkName
    + "?Start_Date=" + input.Start_Date
    + "&End_Date=" + input.End_Date;

// For optional lookup fields:
if(input.Optional_Filter != null)
{
    url = url + "&Optional_Filter=" + input.Optional_Filter;
}
openUrl(url, "same window");
```

### Page Variables Tab (critical setup)

In the page's **Variables** tab, create a **Text** variable for every URL param you want to read (e.g., `Start_Date`, `End_Date`, `Account_Filter`).

**Warning:** If you create a page variable with the same name as a URL param, the empty variable silently shadows the URL param. You'll always read empty. Variable names and URL param names must match exactly — that's intentional and correct. The variable declaration is what tells Creator to expose `input.VarName`.

---

## Deluge Gotchas — Battle-Tested Fixes

### 1. No `.first()` — Use `for each` instead
`.first()` throws "Not able to find 'first' function" in old-style pages.

```deluge
// Wrong:
rec = records.first();

// Right (ID filter returns 1 record, loop runs once):
for each rec in records
{
    fieldVal = rec.Field_Name;
}
```

### 2. URL params are strings — cast to number for ID/Lookup comparisons
```deluge
// Wrong (type mismatch error):
evals = Form[ID == agentId];

// Right:
evals = Form[ID == agentId.toLong()];
evals = Form[Lookup_Field == agentId.toLong()];
```

### 3. Lookup fields in URL params — compare with `!= null` not `!= ""`
Lookup fields pass as numeric IDs. An empty lookup is `null`, not `""`.
```deluge
if(input.Account_Filter != null)
{
    // filter is set
}
```

### 4. Map key check: `containKey()` (not `containsKey()`)
`containsKey()` may error in some contexts. Use `containKey()`:
```deluge
if(myMap.containKey(key))
{
    myMap.put(key, myMap.get(key) + value);
}
else
{
    myMap.put(key, value);
}
```

### 5. Subform access in Deluge
Access a parent form's subform using the link name of the subform field (check `getFields` on the parent form — look for type 21 fields):
```deluge
for each row in eval.SubForm  // "SubForm" is the link_name of the subform field
{
    answer = row.Answer;
    score  = row.Score_Actual;
}
```

### 6. Lookup field navigation for display value
Use the lookup field's link name on the parent form, dot the target field:
```deluge
scorecardName = eval.Scorecard_Master.Scorecard_Name;
// eval.Scorecard_Master = link_name of the lookup field on the parent form
// Scorecard_Name        = field on the looked-up form
```

### 7. Date arithmetic
```deluge
// Right:
earlier = zoho.currentdate.subDay(30);

// Wrong (causes type error):
earlier = zoho.currentdate - 30;
```

### 8. Null check — always test all three states
```deluge
hasVal = val != null && val != "" && val != "null";
```

---

## Report Link Names vs Form Link Names

When using `getCreatorRecords` or `updateRecordByID`, you need the **report** link name, not the form link name. Always run `ZohoCreator_getReports` to find it.

Auto-generated reports follow a pattern but casing is unpredictable:
- Form: `Unified_QA_Evaluation` → Report: `All_Unified_Qa_Evaluations` (note lowercase 'a' in 'Qa')
- Form: `Scorecard_Master` → Report: `All_Scorecard_Masters`

Always verify — don't guess.

---

## Adding/Updating Records via API

### Adding records
```json
{
  "data": [
    {
      "Field_Link_Name": "value",
      "Lookup_Field": "record_id_string",
      "Date_Field": "30-Apr-2026"
    }
  ],
  "skip_workflow": ["form_workflow"]
}
```
Use `skip_workflow: ["form_workflow"]` when injecting test data to prevent On Submit workflows (score calculations, email sends) from running and overwriting your values.

### Updating records
Same pattern. Always pass `skip_workflow` when updating raw values that a workflow would normally recalculate.

---

## Score Colour Coding (Standard Pattern)

```deluge
scoreClass = "";
if(pct >= 90) { scoreClass = "yes-bgcolor"; }
else if(pct < 70) { scoreClass = "no-bgcolor"; }

tableRows = tableRows + "<td class='" + scoreClass + "'>" + pct.round(2) + "%</td>";
```

---

## Standard Form Types

| Type | Use case |
|------|----------|
| Type 1 (Regular) | Master data, transactional forms |
| Type 2 (Stateless) | Filter forms — data isn't saved, used for UI input only |

Stateless forms always pair with an On Success URL redirect workflow when used as page filters.

---

## Alternating Row Colours

```deluge
rowBg = 0;
for each r in records
{
    bg = "rowBg2";
    if(rowBg == 0) { bg = "rowBg1"; rowBg = 1; } else { rowBg = 0; }
    tableRows = tableRows + "<tr class='" + bg + "'> ... </tr>";
}
```

---

## New Project Checklist

When starting a Zoho Creator project from scratch:
1. Identify the `account_owner_name` and `app_link_name`
2. Run `ZohoCreator_getForms` — understand what already exists
3. Identify "keep", "enhance", and "legacy" forms
4. Plan master data forms first (lookup sources), then transactional forms
5. Build filter forms as Type 2 (stateless) with On Success URL redirect
6. Build old-style pages that read `input.*` from URL params
7. Seed initial data via `ZohoCreator_addRecords` with `skip_workflow` for clean test data
8. Verify with `ZohoCreator_getCreatorRecords` before declaring done

---

## Task Verification Protocol (Always Run After Each Task)

After every completed task, run the relevant MCP checks automatically — do not wait for the user to ask. Present a clear pass/fail summary before declaring the task done.

### After creating or modifying a form

```
1. ZohoCreator_getFields(form_link_name)
   → Confirm every expected field exists
   → Confirm correct types (e.g., Lookup = type 12, Date = type 10, Subform = type 21)
   → Flag any missing or mistyped fields
```

**Report format:**
```
✅ Form verified — X fields confirmed
  ✅ Field_Name (type: Single Line)
  ✅ Lookup_Field (type: Lookup)
  ❌ Missing_Field — NOT FOUND, needs to be added
```

### After creating a page

```
1. ZohoCreator_getPages()
   → Confirm the new page appears in the list
   → Note the exact link_name for use in openUrl() redirects
```

### After creating a report

```
1. ZohoCreator_getReports()
   → Confirm report exists with correct link_name
   → Note exact casing (critical for API calls)
```

### After any data operation (add/update)

```
1. ZohoCreator_getCreatorRecords(report_link_name, criteria)
   → Confirm records were created/updated correctly
   → Spot-check key field values against what was submitted
```

### What MCP cannot verify (requires manual UI test)

- On Success workflow actually firing after form submit
- URL redirect carrying correct param values
- Page rendering correctly in browser
- Deluge script executing without runtime errors

For these, provide the user with exact test steps and expected result.

---

## Dummy Data Injection Protocol

After verifying structure, always inject realistic dummy data so the user can immediately test the UI. Follow this sequence:

### Step 1 — Identify master data dependencies
Before adding transactional records, ensure lookup targets exist.
```
ZohoCreator_getCreatorRecords(master_report) → check if seeded
If empty → add master records first (agents, scorecards, accounts, etc.)
```

### Step 2 — Inject dummy records

Rules for good dummy data:
- Use **at least 3 records** — enough to see alternating rows, filtering, and sorting
- Vary key values to test all visual states (e.g., scores above 90%, between 70–90%, below 70%)
- Use realistic dates spread across a testable range (last 30–60 days)
- Set `skip_workflow: ["form_workflow"]` to prevent score recalculation from zeroing values
- For lookup fields, always pass the numeric record ID (not the display name)
- For date fields, use `dd-MMM-yyyy` format (e.g., `30-Apr-2026`)

### Step 3 — Confirm data landed

```
ZohoCreator_getCreatorRecords(report_link_name)
→ Verify record count matches what was submitted
→ Spot-check field values (especially scores, dates, lookup names)
```

### Step 4 — Give the user a test scenario

After injecting data, always provide:
```
Test this now:
- Open: [Page Name]
- Filter: Start Date = [X], End Date = [Y], (other filters)
- Expected: [N] rows — row 1 shows green (95%), row 2 shows red (64%), row 3 neutral (84%)
```

### Step 5 — Cleanup note

Remind the user that dummy records can be deleted from the report view once real data is in place, or kept as reference. Never silently delete injected test data.

---

## Verification Summary Template

Use this format at the end of every task:

```
## Task Complete — Verification Results

### Structure checks (MCP)
✅ Form `Form_Name` — 12 fields confirmed
✅ Page `Page_Name` — appears in page list (link: Page_Link_Name)
✅ Report `Report_Name` — confirmed (link: Report_Link_Name)

### Data checks (MCP)
✅ 3 dummy records injected — IDs: 123, 456, 789
✅ Records confirmed via getCreatorRecords

### Manual test required
→ Open [Page Name] → filter [Start: X, End: Y] → expect [N] rows with [description]

### What cannot be verified via MCP
→ On Success workflow redirect (test by submitting the filter form)
→ Deluge runtime errors (test by viewing the page with valid filters)
```
