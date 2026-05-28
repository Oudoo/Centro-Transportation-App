# Centro TMS — Full Setup Guide
## Headless Transportation Management System on Zoho Creator

---

## Current App State (Re-audited via MCP — 2026)
- **App Link**: `centrocdx/transportation-app` (production environment)
- **Existing Forms** (KEEP — do not delete):
  - `Employee_Registration` — employee master. **Keep + enhance.** Verified fields: `Name` (composite First/Last), `Email`, `Phone_Number`, `HITS_ID`, `Campaign` (dropdown). The booking workflow looks employees up by **`Email`** (not `Employee_Email`).
  - `Bus_Schedule` — legacy schedule: `Bus_Code`, `Dropoff_Point` (dropdown), `Available_From`, `Available_To`, `Number_of_Seats`. Keep as employee-app fallback; retire after `Active_Timings` is live.
  - `New_Booking_Request` — legacy booking, all lookup fields. Keep as fallback; retire after `Bookings` is live.
- **Existing Reports**: `All_Employee_Registrations`, `All_Bus_Schedules`, `All_Bookings`
- **Existing Pages**: None
- **Existing Data**: test records only (1 employee, 2 schedules, 3 bookings, mid-2024) — safe to keep or clear.

---

## Build Order (create in this sequence — a lookup needs its target form to exist first)

1. **Extend `Employee_Registration`** with the eco fields (Phase 2) — *master*
2. **`Buses`** — its `Driver` lookup → `Employee_Registration` — *master*
3. **`Active_Timings`** — its `Bus` lookup → `Buses` — *trips*
4. **`Bookings`** — `Employee_Name` lookup → `Employee_Registration`; `Trip_ID` holds an `Active_Timings` record id — *transactional*
5. **`Overflow_Standby`, `Live_Tracking_Logs`, `Heatmap_Data`, `AI_Fleet_Recommendations`, `Incident_Reports`** — *supporting, no cross-deps*
6. **`Commute_Templates`** (F1) and **`Driver_Performance`** (F2) — *feature forms, no cross-deps*
7. **Reports** auto-generate per form; build the `Eco_Leaderboard` view last.

> New since the feature build: `Commute_Templates`, `Driver_Performance`, plus added fields on `Active_Timings` (`Actual_Departure_Time`, `Optimized_Sequence`, `Optimized_At`) and `Bookings` (`Seat_Number`, `Seat_Released`, `Cancelled_At`, `Source`). All are flagged **F1/F2/F3/I2/Cancel** in the tables below.

> After you create each form, I verify it via MCP (`getFields`) and seed realistic test data before you move on — per the verification protocol.

---

## Phase 1: New Forms to Create in Creator

### 1. `Buses` Form
| Field Display Name     | Link Name       | Type          | Notes                          |
|------------------------|-----------------|---------------|--------------------------------|
| Bus Code               | Bus_Code        | Single Line   | Mandatory, Unique              |
| License Plate          | License_Plate   | Single Line   | Mandatory                      |
| Capacity               | Capacity        | Number        | Mandatory                      |
| Driver                 | Driver          | Lookup        | Lookup → Employee_Registration |
| Status                 | Status          | Dropdown      | Active / Maintenance / Idle    |
| Origin_Zone            | Origin_Zone     | Single Line   |                                |
| Last_Service_Date      | Last_Service    | Date          |                                |

**Report**: `All_Buses`

---

### 2. `Active_Timings` Form (Trips)
| Field Display Name     | Link Name          | Type          | Notes                       |
|------------------------|--------------------|---------------|-----------------------------|
| Trip ID (auto)         | ID                 | Auto Number   | System                      |
| Bus                    | Bus_Code           | Lookup        | Lookup → Buses              |
| Route                  | Route              | Single Line   | Mandatory                   |
| Origin Zone            | Origin_Zone        | Single Line   |                             |
| Departure Time         | Departure_Time     | Time          | Mandatory                   |
| Total Seats            | Total_Seats        | Number        |                             |
| Available Seats        | Available_Seats    | Number        | Default = Total_Seats       |
| Status                 | Status             | Dropdown      | Active/In_Progress/Full/Completed/Cancelled |
| Driver Name            | Driver_Name        | Single Line   |                             |
| Driver Email           | Driver_Email       | Email         |                             |
| Dest Lat               | Dest_Lat           | Decimal       | Destination GPS             |
| Dest Lng               | Dest_Lng           | Decimal       | Destination GPS             |
| Origin Lat             | Origin_Lat         | Decimal       |                             |
| Origin Lng             | Origin_Lng         | Decimal       |                             |
| Route Distance Km      | Route_Distance_Km  | Decimal       | For CO2 calculation         |
| Last Known Lat         | Last_Known_Lat     | Single Line   | Updated by tracking         |
| Last Known Lng         | Last_Known_Lng     | Single Line   |                             |
| Last Ping Time         | Last_Ping_Time     | DateTime      |                             |
| Proximity Alert Sent   | Proximity_Alert_Sent | Checkbox    | Prevent duplicate alerts    |
| Stop Alert Sent        | Stop_Alert_Sent    | Checkbox      |                             |
| Anomaly Flagged        | Anomaly_Flagged    | Checkbox      |                             |
| Anomaly Type           | Anomaly_Type       | Single Line   |                             |
| Boarded Count          | Boarded_Count      | Number        | Auto-incremented             |
| Actual Start           | Actual_Start       | DateTime      |                             |
| Actual End             | Actual_End         | DateTime      |                             |
| Actual Departure Time  | Actual_Departure_Time | DateTime   | **F2** — set when trip starts; vs `Departure_Time` for punctuality |
| Distance Km (Actual)   | Distance_Km        | Decimal       |                             |
| Optimized Sequence     | Optimized_Sequence | Multi Line    | **I2** — AI pickup order, shown to driver |
| Optimized At           | Optimized_At       | DateTime      | **I2** — when sequence was generated |
| Notes                  | Notes              | Multi Line    |                             |

**Report**: `All_Active_Timings`

---

### 3. `Bookings` Form (Enhanced TMS Bookings)
| Field Display Name     | Link Name              | Type      | Notes                          |
|------------------------|------------------------|-----------|--------------------------------|
| Employee ID            | Employee_ID            | Single Line|                               |
| Employee Email         | Employee_Email         | Email     | Mandatory                      |
| Employee Name          | Employee_Name          | Lookup    | Lookup → Employee_Registration |
| HITS ID                | HITS_ID                | Single Line|                               |
| Trip                   | Trip_ID                | Single Line| ID of Active_Timings record    |
| QR Hash                | QR_Hash                | Single Line| Generated by workflow          |
| Status                 | Status                 | Dropdown  | Confirmed/Boarded/Cancelled/No_Show |
| CO2 Saved              | CO2_Saved              | Decimal   | Calculated in Deluge           |
| Booking Time           | Booking_Time           | DateTime  | Auto = zoho.currenttime        |
| Boarded At             | Boarded_At             | DateTime  |                                |
| Driver Email           | Driver_Email           | Email     | Set on scan                    |
| Proximity Alert Sent   | Proximity_Alert_Sent   | Checkbox  |                                |
| Alert Time             | Alert_Time             | DateTime  |                                |
| Synced From Offline    | Synced_From_Offline    | Checkbox  |                                |
| Sync Time              | Sync_Time              | DateTime  |                                |
| Dropoff Point          | Dropoff_Point          | Single Line|                               |
| Route                  | Route                  | Single Line|                               |
| Seat Number            | Seat_Number            | Number    | **F3** — seat chosen in the picker |
| Seat Released          | Seat_Released          | Checkbox  | **Cancel** — idempotency flag, set by 07 |
| Cancelled At           | Cancelled_At           | DateTime  | **Cancel** — set by 07          |
| Source                 | Source                 | Single Line| **F1** — `Recurring_Auto` for auto-booked trips |

**Report**: `All_TMS_Bookings`

> **Status dropdown must include `Cancelled`** — the On-Edit cancel workflow (07) keys on it.

---

### 4. `Live_Tracking_Logs` Form
| Field          | Link Name     | Type       | Notes               |
|----------------|---------------|------------|---------------------|
| Trip ID        | Trip_ID       | Single Line| Mandatory           |
| Latitude       | Lat           | Decimal    | Mandatory           |
| Longitude      | Lng           | Decimal    | Mandatory           |
| Timestamp      | Timestamp     | DateTime   | Auto = currenttime  |
| Driver Email   | Driver_Email  | Email      |                     |

**Report**: `All_Live_Tracking_Logs`
**Important**: Sort by `-Timestamp` in the default view.

---

### 5. `Heatmap_Data` Form
| Field         | Link Name      | Type      |
|---------------|----------------|-----------|
| Pickup Zone   | Pickup_Zone    | Single Line|
| Dropoff Zone  | Dropoff_Zone   | Single Line|
| Demand Score  | Demand_Score   | Decimal   |
| Timestamp     | Timestamp      | DateTime  |
| Last Updated  | Last_Updated   | DateTime  |

**Report**: `All_Heatmap_Data`

---

### 6. `Overflow_Standby` Form
| Field           | Link Name        | Type       |
|-----------------|------------------|------------|
| Employee ID     | Employee_ID      | Single Line|
| Employee Email  | Employee_Email   | Email      |
| Employee Name   | Employee_Name    | Lookup     |
| Trip ID         | Trip_ID          | Single Line|
| Status          | Status           | Dropdown   | Waiting/Confirmed/Expired |
| Request Time    | Request_Time     | DateTime   |
| Upgraded At     | Upgraded_At      | DateTime   |

**Report**: `All_Overflow_Standby`

---

### 7. `AI_Fleet_Recommendations` Form
| Field                  | Link Name              | Type       |
|------------------------|------------------------|------------|
| Recommendation Title   | Recommendation_Title   | Single Line|
| Recommendation Body    | Recommendation_Body    | Multi Line |
| Priority               | Priority               | Dropdown   | Low/Medium/High/Critical |
| Confidence Score       | Confidence_Score       | Number     |
| Type                   | Type                   | Single Line| fleet/optimization/overflow/missing_route/route_optimization |
| Route                  | Route                  | Single Line|
| Demand Count           | Demand_Count           | Number     |
| Trip ID                | Trip_ID                | Single Line|
| Utilization Pct        | Utilization_Pct        | Number     |
| Recommended Bus        | Recommended_Bus        | Single Line|
| Status                 | Status                 | Dropdown   | Pending/Approved/Dismissed |
| Generated At           | Generated_At           | DateTime   |
| Target Date            | Target_Date            | Date       |
| Analysis Type          | Analysis_Type          | Single Line|
| Approved At            | Approved_At            | DateTime   |

**Report**: `All_AI_Fleet_Recommendations`

---

### 8. `Incident_Reports` Form
| Field          | Link Name      | Type       |
|----------------|----------------|------------|
| Trip ID        | Trip_ID        | Single Line|
| Driver Email   | Driver_Email   | Email      |
| Incident Type  | Incident_Type  | Dropdown   | breakdown/accident/medical/route_deviation/security/SOS_EMERGENCY/GHOST_BUS_REQUEST |
| Description    | Description    | Multi Line |
| Location Coords| Location_Coords| Single Line|
| Status         | Status         | Dropdown   | Open/Critical/Acknowledged/Resolved |
| Priority       | Priority       | Dropdown   | Low/Medium/High |
| Timestamp      | Timestamp      | DateTime   |

**Report**: `All_Incident_Reports`

---

### 9. `Eco_Leaderboard` Report (View)
Create a report on `Employee_Registration` sorted by `CO2_Total_Saved DESC`.
Add these fields to Employee_Registration first:
- `CO2_Total_Saved` (Decimal)
- `Eco_Points` (Number)
- `Total_Trips` (Number)
- `Eco_Level` (Single Line)

---

### 10. `Commute_Templates` Form (F1 — Smart Recurring Commute)
| Field Display Name | Link Name        | Type        | Notes                                   |
|--------------------|------------------|-------------|-----------------------------------------|
| Employee ID        | Employee_ID      | Single Line |                                         |
| Employee Email     | Employee_Email   | Email       | Mandatory                               |
| Route              | Route            | Single Line | Must match an `Active_Timings.Route`    |
| Days Active        | Days_Active      | Single Line | Comma list, lowercase: `mon,tue,wed,thu,fri` |
| Active             | Active           | Dropdown    | `Yes` / `No` (script filters `Active == "Yes"`) |
| Departure Window   | Departure_Window | Single Line | Optional, informational                 |
| Last Auto Booked   | Last_Auto_Booked | Date        | Stamped by script 08                    |

**Report**: `All_Commute_Templates`
**Used by**: script 08 (read/update), employee app "Schedule" tab (add/list/delete).

---

### 11. `Driver_Performance` Form (F2 — Punctuality Scorecard)
| Field Display Name | Link Name       | Type        | Notes                       |
|--------------------|-----------------|-------------|-----------------------------|
| Driver Email       | Driver_Email    | Email       | Mandatory                   |
| Driver Name        | Driver_Name     | Single Line |                             |
| Week Start         | Week_Start      | Date        |                             |
| Week End           | Week_End        | Date        |                             |
| Trips Completed    | Trips_Completed | Number      |                             |
| On Time Count      | On_Time_Count   | Number      |                             |
| Late Count         | Late_Count      | Number      |                             |
| On Time Pct        | On_Time_Pct     | Decimal     |                             |
| Anomaly Count      | Anomaly_Count   | Number      |                             |
| Avg Delay Min      | Avg_Delay_Min   | Decimal     |                             |
| Score              | Score           | Decimal     | 0–100 composite             |
| Rank               | Rank            | Number      | 1 = best that week          |

**Report**: `All_Driver_Performances`
**Used by**: script 09 (write), management "Driver Scorecard" view (read).

---

## Phase 2: Upgrade Existing Employee_Registration Form

Add to existing `Employee_Registration` form:
- `CO2_Total_Saved` (Decimal, default 0)
- `Eco_Points` (Number, default 0)
- `Total_Trips` (Number, default 0)
- `Department` (Single Line)
- `Pickup_Zone` (Single Line)

---

## Phase 3: Deluge Workflows to Configure

### Workflow 1: On Booking Submit
- **Form**: `Bookings` (the new TMS form only — **not** `New_Booking_Request`, which lacks `Trip_ID`/`Status`/`QR_Hash` and would error at runtime)
- **Trigger**: On Add
- **Script**: `tms/deluge/01_on_booking_submit.dg`
- **What it does**: Validates seat count, generates QR hash, updates CO2 savings, sends Cliq notification

### Workflow 2: Geofencing + Anomaly Detection
- **Form**: `Live_Tracking_Logs`
- **Trigger**: On Add
- **Script**: `tms/deluge/02_geofencing_alerts.dg`
- **What it does**: Checks 1km proximity, sends passenger alerts, detects route deviation + stationary anomalies

### Custom Function: Offline QR Sync
- **Type**: API-enabled Stateless Custom Function
- **Name**: `syncOfflineScans`
- **Script**: `tms/deluge/03_offline_qr_sync.dg`
- **Endpoint**: `/api/v2/centrocdx/transportation-app/function/syncOfflineScans`

### Scheduled Function 1: Hourly Demand Analysis
- **Type**: Schedule
- **Interval**: Every 1 hour
- **Script**: `tms/deluge/04_ai_demand_heatmap_schedule.dg`

### Scheduled Function 2: Nightly AI Fleet Allocation
- **Type**: Schedule
- **Time**: 02:00 AM (Cairo)
- **Script**: `tms/deluge/05_ai_fleet_nightly.dg`

### Workflow 3: Overflow Standby Manager
- **Form**: `Overflow_Standby`
- **Trigger**: On Add
- **Script**: `tms/deluge/06_overflow_standby.dg`

### Workflow 4: On Booking Cancel (seat release + standby promotion)
- **Form**: `Bookings`
- **Trigger**: **On Edit** (fires when `Status` becomes `Cancelled`)
- **Script**: `tms/deluge/07_on_booking_cancel.dg`
- **What it does**: Returns the seat to the trip (or promotes the first standby into it), idempotent via `Seat_Released`. Replaces the old `Just_Cancelled` hack.

### Scheduled Function 3: F1 — Recurring Commute Auto-Booker
- **Type**: Schedule
- **Time**: 03:00 AM (Cairo) — *after* the nightly fleet allocation
- **Script**: `tms/deluge/08_recurring_commute_nightly.dg`
- **Depends on**: `Commute_Templates` form; creates `Bookings` (re-fires Workflow 1).

### Scheduled Function 4: F2 — Driver Punctuality Scorecard
- **Type**: Schedule
- **Time**: Monday 06:00 AM (Cairo), weekly
- **Script**: `tms/deluge/09_driver_scorecard_weekly.dg`
- **Depends on**: `Driver_Performance` form; reads `Active_Timings` (needs `Actual_Departure_Time`).

### Scheduled Function 5: I2 — AI Route (Pickup-Sequence) Optimization
- **Type**: Schedule
- **Time**: 02:30 AM (Cairo) — between fleet allocation (02:00) and recurring booking (03:00)
- **Script**: `tms/deluge/10_ai_route_optimization_nightly.dg`
- **Depends on**: `GEMINI_API_KEY` in Secrets; writes `Active_Timings.Optimized_Sequence` + an `AI_Fleet_Recommendations` row.

> **Secrets to add** (Settings → Secrets): `GEMINI_API_KEY`, `GHOST_BUS_WEBHOOK_URL`.

---

## Phase 4: Dashboard Deployment (Creator Pages)

### How to Deploy HTML Dashboards in Zoho Creator Pages
1. Go to **Creator Studio** → Your App → **Pages**
2. Click **Add Page** → Choose **HTML**
3. Paste the HTML content from:
   - `tms/dashboards/employee-app.html`
   - `tms/dashboards/driver-app.html`
   - `tms/dashboards/management-dashboard.html`
4. Set **Access Permissions**:
   - Employee App → All users
   - Driver App → Drivers group only
   - Management Dashboard → Management role only

### Important: Wire the webhooks (no secrets in client HTML)
The dashboards **no longer embed the Gemini key**. AI runs through a server-side proxy.
In each HTML dashboard, replace the placeholder URLs:
```
employee-app.html        → APP_CONFIG.aiProxyUrl   = REPLACE_WITH_AI_PROXY_WEBHOOK_URL
management-dashboard.html→ APP_CONFIG.aiProxyUrl   = REPLACE_WITH_AI_PROXY_WEBHOOK_URL
driver-app.html          → APP_CONFIG.cliqWebhook  = YOUR_ZOHO_CLIQ_WEBHOOK_URL
```
- **AI Proxy** is a **Zoho Flow** webhook trigger that accepts `{ "prompt": "..." }`, calls Gemini server-side with the key from Secrets, and returns `{ "text": "..." }` (the dashboards also accept the raw Gemini shape as a fallback). This keeps `GEMINI_API_KEY` off the client entirely.
- Server-side Deluge (scripts 05, 10) reads `GEMINI_API_KEY` directly from **Zoho Secrets** — never hardcode it.
- `GHOST_BUS_WEBHOOK_URL` is read from Secrets by script 06 (not a client value).

---

## Phase 5: Zoho Integrations

### Zoho People Integration
Connect `Employee_Registration` data automatically:
1. Create a **Zoho Flow** workflow that triggers when a new employee joins Zoho People
2. Auto-creates their record in Creator `Employee_Registration`
3. This eliminates manual registration

### Zoho Cliq Channels to Create
- `#transportation-ops` — Management/dispatcher alerts
- `#transportation-alerts` — Employee proximity notifications

### Zoho Flow Webhooks
1. **Ghost Bus Webhook**: Receives payload → posts alert to Cliq + creates Incident
2. **AI Proxy Webhook**: Receives AI prompt from frontend → calls Gemini → returns response (keeps API key server-side)

---

## Phase 6: Progressive Web App (PWA) Setup

For the Employee and Driver apps to work as PWA (offline capable), deploy the ready-made files in **`tms/pwa/`** (`employee-manifest.json`, `driver-manifest.json`, `sw.js`) as Creator Page resources. They are reproduced below for reference:

### `employee-manifest.json`
```json
{
  "name": "Centro Employee App",
  "short_name": "Centro TMS",
  "theme_color": "#6366f1",
  "background_color": "#0f0e2a",
  "display": "standalone",
  "scope": "/",
  "start_url": "/employee-app",
  "icons": [{"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"}]
}
```

### Service Worker Registration
Add to the `<head>` of employee-app.html and driver-app.html:
```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

---

## Additional Enhancements (Recommended)

### 1. WhatsApp Notifications (via Zoho Flow)
- Connect Zoho Flow → WhatsApp Business API
- Send departure reminders 30 min before trip
- Route: Creator Booking Submit → Zoho Flow → WhatsApp

### 2. Zoho People HR Integration
- Auto-sync employee data from Zoho People to eliminate duplicate registration
- Use Zoho Flow with Zoho People API to sync new joiners daily

### 3. Microsoft Teams / Slack Integration (via Zoho Flow)
- Mirror Cliq notifications to Teams/Slack for management who prefer it

### 4. Zoho Analytics Dashboard
- Connect `All_TMS_Bookings`, `All_Live_Tracking_Logs`, `All_Heatmap_Data` to Zoho Analytics
- Build long-term trend reports: monthly CO2 savings, route popularity, peak hours

### 5. Biometric Check-In (Future)
- Implement Face ID/Touch ID via Web Authentication API in the Employee App
- Store credential hash in `Employee_Registration` for secure re-authentication

---

## API Quick Reference

### ZOHO.CREATOR.API (Frontend JS SDK)
```javascript
// Get records
await ZOHO.CREATOR.API.getAllRecords({
  appName: 'transportation-app',
  reportName: 'All_Active_Timings',
  criteria: 'Status == "Active"',
  max_records: 50
});

// Add record
await ZOHO.CREATOR.API.addRecord({
  appName: 'transportation-app',
  formName: 'Bookings',
  data: { Employee_Email: '...', Trip_ID: '...', QR_Hash: '...' }
});

// Update record
await ZOHO.CREATOR.API.updateRecord({
  appName: 'transportation-app',
  reportName: 'All_TMS_Bookings',
  id: recordId,
  data: { Status: 'Boarded' }
});
```

### Offline QR Sync API (POST)
```
POST /api/v2/centrocdx/transportation-app/function/syncOfflineScans
Authorization: Zoho-oauthtoken <token>
Content-Type: application/json

{
  "scans": [
    {"hash":"CTMS-A1B2C3D4","emp":"emp@centro.com","trip":"12345","scanned_at":"2026-05-28T08:15:00Z","offline":true,"driver":"driver@centro.com"}
  ]
}
```

---

## Improvements & Ideas Added to This Build

Beyond the original spec, the following enhancements were built in:

| # | Feature | Location |
|---|---------|----------|
| 1 | Arabic/English RTL toggle | Employee App |
| 2 | Voice booking via Web Speech API | Employee App → AI Chat |
| 3 | Standby auto-upgrade when cancellation frees seat | Deluge: overflow_standby.dg |
| 4 | Driver SOS emergency button | Driver App |
| 5 | Incident reporting form (in-app) | Driver App |
| 6 | Bus swap & route cancel from UI | Management Dashboard |
| 7 | Route deviation detection (cross-track) | Deluge: geofencing_alerts.dg |
| 8 | Stationary anomaly (speed 0 > 10 min) | Deluge: geofencing_alerts.dg |
| 9 | Live booking search in Management panel | Management Dashboard |
| 10 | Confidence scores on all AI recommendations | Nightly AI + Hourly schedule |
| 11 | Early warning at 5 standby (before 10) | overflow_standby.dg |
| 12 | Fallback rule-based allocation if AI fails | ai_fleet_nightly.dg |
| 13 | Eco level gamification (5 tiers) | Employee App |
| 14 | Trees-equivalent CO2 visualization | Employee App |
| 15 | GPS distance tracking for drivers | Driver App |
| 16 | Offline GPS ping cache (localStorage) | Driver App |
| 17 | Fleet utilization doughnut chart | Management Dashboard |
| 18 | Radar demand vs capacity chart | Management Dashboard |
| 19 | Global AI analysis trigger button | Management Dashboard |
| 20 | Zoho People integration guide | This setup guide |

### Headline features added in the latest build

| Feature | What it does | Backend | Frontend |
|---------|--------------|---------|----------|
| **F1 — Smart Recurring Commute** | Employees save a weekly pattern; seats auto-book nightly | `08_recurring_commute_nightly.dg` + `Commute_Templates` | Employee "Schedule" tab |
| **F2 — Driver Punctuality Scorecard** | Weekly ranked on-time/anomaly scoring per driver | `09_driver_scorecard_weekly.dg` + `Driver_Performance` | Management "Driver Scorecard" view |
| **F3 — Seat Selection Map** | Visual seat picker; taken seats greyed; seat shown on manifest | `Seat_Number` on Bookings | Employee booking modal + Driver manifest |
| **I2 — AI Route Optimization** | Gemini orders pickup stops to cut travel time | `10_ai_route_optimization_nightly.dg` | Driver pickup-order card + Management AI Insights |
| **Cancel workflow** | Idempotent seat release + standby promotion on cancel | `07_on_booking_cancel.dg` | (Status → Cancelled) |
