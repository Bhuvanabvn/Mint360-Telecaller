# Mint360 QA Automation (Playwright + Page Object Model)

Automates: **Login** (via AWS Cognito Hosted UI) → **Create Lead** (3-step wizard: Personal → Contact → Property) → asserts the "Lead saved successfully" popup.

## Project structure
```
mint360-automation/
├── Pages/
│   ├── LoginPage.js          # Landing page + Cognito hosted sign-in form
│   ├── CreateLeadPage.js     # 3-step Create Lead wizard + popup handling
│   └── LeadListPage.js       # Assigned-stage lead list, search, verification
├── tests/
│   └── LeadManagement.spec.js  # Single spec: login -> create lead -> verify in list
├── playwright.config.js
├── package.json
└── README.md
```

## What the spec does, end to end
1. **Login** via the Cognito Hosted UI.
2. **Create a lead** through all 3 steps (Personal -> Contact -> Property) and submit.
3. **Close** the "Lead saved successfully" popup.
4. **Go to the Assigned stage** ("New Leads" in the sidebar).
5. **Click the list icon** ("View Entire Lead List") to open the full table.
6. **Search** for the lead by mobile number and **assert** it's listed with the correct project.

## Setup
```bash
npm install
npx playwright install chromium
```

## Run
```bash
npm test              # headless
npm run test:headed   # see the browser
npm run report        # open HTML report after a run
```

## Notes / things to know about the app
- **Login is NOT on `qa.mint360.in`.** The "Sign In" button on the landing page
  (`#/auth/signin`) redirects to an **AWS Cognito Hosted UI** on a different
  domain (`*.auth.ap-south-1.amazoncognito.com`) where the actual email/password
  form lives. `LoginPage` handles both pages since Playwright locators simply
  follow the same `page` object across the redirect.
- After a successful login, Cognito redirects back to
  `https://qa.mint360.in/#/tele/dashboard`.
- **Mobile Number must be unique, and the duplicate check fires on blur** -
  not only on final Submit. As soon as the Mobile Number field loses focus,
  a `WARNING! Lead Already exists!` popup can appear if that number is
  already in the system. `CreateLeadPage.fillPersonalDetails()` detects this,
  closes the popup, generates a new random number, and retries automatically
  (up to 3 times by default). Because of this, the mobile number actually
  accepted can differ from the one originally passed in — `createLead()`
  returns `{ success, mobileNumber }`, and callers (see the spec) should use
  the returned `mobileNumber` for any later lookups.
- **The same "x" icon (`.close`) closes both the SUCCESS and WARNING popups**,
  so `CreateLeadPage.closePopup()` works for either case.
- **Project dropdown** on Step 1 only becomes selectable after Name +
  Mobile Number are filled in.
- **Lead Source dropdown** on Step 2 is populated dynamically based on the
  selected **Base Lead Source** — a short wait is built into
  `fillContactDetails()` to let the options load before selecting.
- **Step 3 (Property)** has no mandatory fields — Buy Reason defaults to
  "End Use" and Campaign Code defaults to "DEFAULT", so the wizard can be
  submitted as-is (remarks is optional and included as an example).
- **"Assigned" stage → "New Leads" section.** A lead created with
  Stage = "Assigned" shows up under the sidebar's "New Leads" link (its
  Status column reads "New"). From there, the list icon ("View Entire Lead
  List") opens the full searchable table at `#/tele/new-leads-list`.
- **List search** accepts name, email, phone number, or Lead ID, and needs
  an `Enter` keypress (or `press('Enter')`) after typing to filter the table
  — filling the box alone does not trigger it.

## Credentials used
| Field | Value |
|---|---|
| URL | https://qa.mint360.in/#/auth/signin |
| Email | telecaller@adglobal360.com |
| Password | Mint@360 |

> Consider moving credentials to environment variables / a `.env` file for
> anything beyond local/demo use.
