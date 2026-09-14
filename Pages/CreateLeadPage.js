/**
 * CreateLeadPage - Page Object for the Mint360 "Create Lead" 3-step wizard.
 *
 * Steps (tabs):
 *  1. Personal -> Name*, Country*, Mobile Number*, Project*, Email, Gender
 *  2. Contact  -> Stage*, Base Lead Source*, Lead Source*, Lead Sub Source, Lead Type*
 *  3. Property -> BHK, Buy Reason, Tele Manager remarks, Campaign Code, Project Interested In
 *
 * On Submit, a modal appears:
 *   - Success -> heading "SUCCESS", text "Lead saved successfully"
 *   - Failure (e.g. duplicate mobile) -> heading "WARNING!", text "Lead Already exists!"
 *
 * NOTE: the duplicate-mobile check fires as soon as the Mobile Number field
 * loses focus (blur) - NOT only on final Submit. `fillPersonalDetails()`
 * accounts for this and will retry with a freshly generated number if the
 * "Lead Already exists!" warning appears while still on Step 1.
 */

/** Generates a random 10-digit Indian mobile number, e.g. "9123456780" */
function generateRandomMobileNumber() {
  return '9' + Math.floor(100000000 + Math.random() * 900000000).toString();
}

class CreateLeadPage {
  constructor(page) {
    this.page = page;
    this.url = 'https://qa.mint360.in/#/tele/createlead';

    // ---- Sidebar / navigation ----
    this.createLeadNavLink = page.getByRole('link', { name: 'Create lead' });

    // ---- Wizard tabs ----
    this.personalTab = page.getByText('Personal', { exact: true });
    this.contactTab = page.getByText('Contact', { exact: true });
    this.propertyTab = page.getByText('Property', { exact: true });

    // ---- Step 1: Personal ----
    this.nameInput = page.getByPlaceholder('Enter Name');
    this.countrySelect = page.locator('select').nth(0); // defaults to "India"
    this.mobileNumberInput = page.getByPlaceholder('10 Digits');
    this.projectSelect = page.locator('select').nth(1);
    this.emailInput = page.getByPlaceholder('Enter Email ID');
    this.genderSelect = page.locator('select').nth(2);
    this.nextButton = page.getByRole('button', { name: 'Next' });

    // ---- Step 2: Contact ----
    this.stageSelect = page.locator('select').nth(0);
    this.baseLeadSourceSelect = page.locator('select').nth(1);
    this.leadSourceSelect = page.locator('select').nth(2);
    this.leadSubSourceSelect = page.locator('select').nth(3);
    this.leadTypeSelect = page.locator('select').nth(4);
    this.prevButton = page.getByRole('button', { name: 'Prev' });

    // ---- Step 3: Property ----
    this.bhkSelect = page.locator('select').nth(0);
    this.buyReasonSelect = page.locator('select').nth(1); // defaults to "End Use"
    this.remarksInput = page.getByPlaceholder('Enter Remarks');
    this.campaignCodeInput = page.getByPlaceholder('Enter Campaign Code'); // prefilled "DEFAULT"
    this.submitButton = page.getByRole('button', { name: 'Submit' });

    // ---- Result popup ----
    this.successHeading = page.getByRole('heading', { name: 'SUCCESS' });
    this.successMessage = page.getByText('Lead saved successfully');
    this.warningHeading = page.getByRole('heading', { name: 'WARNING!' });
    this.duplicateLeadMessage = page.getByText('Lead Already exists!');
    this.popupCloseIcon = page.locator('.close'); // "x" icon on the success/warning modal
  }

  /** Close the success/warning popup by clicking its "x" icon */
  async closePopup() {
    await this.popupCloseIcon.click();
    await this.popupCloseIcon.waitFor({ state: 'hidden' }).catch(() => {});
  }

  /** Open the Create Lead page from the sidebar */
  async open() {
    await this.createLeadNavLink.click();
    await this.nameInput.waitFor({ state: 'visible' });
  }

  /** Navigate directly via URL instead of clicking the sidebar link */
  async goto() {
    await this.page.goto(this.url);
    await this.nameInput.waitFor({ state: 'visible' });
  }

  /**
   * Quickly checks (short timeout) whether the "Lead Already exists!"
   * warning popup is currently visible, without waiting the full default.
   * @param {number} timeout
   * @returns {Promise<boolean>}
   */
  async isDuplicateWarningVisible(timeout = 2500) {
    try {
      await this.warningHeading.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  // ---------------- STEP 1: Personal ----------------
  /**
   * Fills the Personal step. If the mobile number entered collides with an
   * existing lead, the "Lead Already exists!" popup fires immediately on
   * blur - this method detects that, closes the popup, generates a fresh
   * random mobile number, and retries (up to `maxDuplicateRetries` times).
   *
   * @param {Object} data
   * @param {string} [data.name]
   * @param {string} [data.mobileNumber] - 10 digit number; if omitted, one is generated
   * @param {string} [data.country] - defaults to "India" pre-selected
   * @param {string} data.project - project name as shown in dropdown
   * @param {string} [data.email]
   * @param {string} [data.gender] - "Male" | "Female"
   * @param {number} [maxDuplicateRetries] - default 3
   * @returns {Promise<string>} the mobile number that was actually accepted
   */
  async fillPersonalDetails(data, maxDuplicateRetries = 3) {
    await this.nameInput.fill(data.name);

    if (data.country) {
      await this.countrySelect.selectOption({ label: data.country });
    }

    let mobileNumber = data.mobileNumber || generateRandomMobileNumber();
    let attempts = 0;

    // Fill mobile number, blur to trigger the live duplicate check, and
    // retry with a new random number if "Lead Already exists!" appears.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await this.mobileNumberInput.fill(mobileNumber);
      await this.mobileNumberInput.press('Tab'); // blur to trigger validation

      const isDuplicate = await this.isDuplicateWarningVisible();
      if (!isDuplicate) break;

      attempts += 1;
      if (attempts > maxDuplicateRetries) {
        throw new Error(
          `Mobile number kept colliding with an existing lead after ${maxDuplicateRetries} retries`
        );
      }

      await this.closePopup();
      mobileNumber = generateRandomMobileNumber();
    }

    // Project becomes selectable once Name + Mobile are filled
    await this.projectSelect.selectOption({ label: data.project });

    if (data.email) {
      await this.emailInput.fill(data.email);
    }

    if (data.gender) {
      await this.genderSelect.selectOption({ label: data.gender });
    }

    return mobileNumber;
  }

  /** Click "Next" to move from Personal -> Contact step */
  async goToContactStep() {
    await this.nextButton.click();
    await this.stageSelect.waitFor({ state: 'visible' });
  }

  // ---------------- STEP 2: Contact ----------------
  /**
   * @param {Object} data
   * @param {string} data.stage - "Assigned" | "Drop" | "Opportunity" | "SV Opportunity" | "RNR"
   * @param {string} data.baseLeadSource - e.g. "Offline", "Online", "Channel Partners"
   * @param {string} data.leadSource - depends on baseLeadSource, e.g. "Newspaper Ads"
   * @param {string} [data.leadSubSource]
   * @param {string} data.leadType - "Calls" | "Facebook" | "Form Fills"
   */
  async fillContactDetails(data) {
    await this.stageSelect.selectOption({ label: data.stage });
    await this.baseLeadSourceSelect.selectOption({ label: data.baseLeadSource });

    // Lead Source options are populated dynamically after Base Lead Source is chosen
    await this.page.waitForTimeout(500);
    await this.leadSourceSelect.selectOption({ label: data.leadSource });

    if (data.leadSubSource) {
      await this.page.waitForTimeout(300);
      await this.leadSubSourceSelect.selectOption({ label: data.leadSubSource });
    }

    await this.leadTypeSelect.selectOption({ label: data.leadType });
  }

  /** Click "Next" to move from Contact -> Property step */
  async goToPropertyStep() {
    await this.nextButton.click();
    await this.submitButton.waitFor({ state: 'visible' });
  }

  // ---------------- STEP 3: Property ----------------
  /**
   * All fields on this step are optional / pre-filled with defaults
   * (Buy Reason = "End Use", Campaign Code = "DEFAULT").
   * @param {Object} [data]
   * @param {string} [data.bhk]
   * @param {string} [data.buyReason]
   * @param {string} [data.remarks]
   * @param {string} [data.campaignCode]
   */
  async fillPropertyDetails(data = {}) {
    if (data.bhk) {
      await this.bhkSelect.selectOption({ label: data.bhk });
    }
    if (data.buyReason) {
      await this.buyReasonSelect.selectOption({ label: data.buyReason });
    }
    if (data.remarks) {
      await this.remarksInput.fill(data.remarks);
    }
    if (data.campaignCode) {
      await this.campaignCodeInput.fill(data.campaignCode);
    }
  }

  /** Click the final "Submit" button */
  async submitLead() {
    await this.submitButton.click();
  }

  /**
   * Waits for the result popup and returns true if the lead was created
   * successfully, false if a "Lead Already exists" warning was shown.
   */
  async getSubmissionResult() {
    const result = await Promise.race([
      this.successHeading
        .waitFor({ state: 'visible', timeout: 10000 })
        .then(() => 'success'),
      this.warningHeading
        .waitFor({ state: 'visible', timeout: 10000 })
        .then(() => 'warning'),
    ]).catch(() => 'none');

    return result;
  }

  /**
   * End-to-end helper: opens the wizard, fills all 3 steps, submits, and
   * reports the outcome.
   *
   * @param {Object} leadData - { personal, contact, property }
   * @returns {Promise<{success: boolean, mobileNumber: string}>}
   *   `mobileNumber` is the number that actually got accepted - it may
   *   differ from `leadData.personal.mobileNumber` if a duplicate-mobile
   *   retry kicked in, so callers should use the returned value for any
   *   later lookups (e.g. verifying the lead in the list).
   */
  async createLead(leadData) {
    await this.open();

    const mobileNumber = await this.fillPersonalDetails(leadData.personal);
    await this.goToContactStep();

    await this.fillContactDetails(leadData.contact);
    await this.goToPropertyStep();

    await this.fillPropertyDetails(leadData.property);
    await this.submitLead();

    const result = await this.getSubmissionResult();
    return { success: result === 'success', mobileNumber };
  }
}

module.exports = { CreateLeadPage, generateRandomMobileNumber };
