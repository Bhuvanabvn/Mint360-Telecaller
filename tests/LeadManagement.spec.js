const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../Pages/LoginPage');
const { CreateLeadPage, generateRandomMobileNumber } = require('../Pages/CreateLeadPage');
const { LeadListPage } = require('../Pages/LeadListPage');

const CREDENTIALS = {
  email: 'telecaller@adglobal360.com',
  password: 'Mint@360',
};

test.describe('Mint360 - Login & Create Lead', () => {
  test('Login, create a new lead, and verify it in the Assigned lead list', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const createLeadPage = new CreateLeadPage(page);
    const leadListPage = new LeadListPage(page);

    const leadName = 'Automation Test Lead';
    const project = 'Red Field';
    // A starting mobile number is generated up front for reference, but
    // CreateLeadPage transparently retries with a new one if this collides
    // with an existing lead (the duplicate check fires on blur, not just
    // on final Submit).
    let mobileNumber = generateRandomMobileNumber();
  
    await test.step('Step 1: Login to Mint360', async () => {
      await loginPage.login(CREDENTIALS.email, CREDENTIALS.password);
      await expect(page).toHaveURL(/tele\/dashboard/);
    });

    await test.step('Step 2 & 3: Create a new lead (Personal -> Contact -> Property)', async () => {
      const leadData = {
        personal: {
          name: leadName,
          mobileNumber,
          project,
          email: `automation.${Date.now()}@example.com`,
          gender: 'Male',
        },
        contact: {
          stage: 'Assigned',
          baseLeadSource: 'Offline',
          leadSource: 'Newspaper Ads',
          leadType: 'Calls',
        },
        property: {
          remarks: 'Created via Playwright automation',
        },
      };
    

      const { success, mobileNumber: acceptedMobileNumber } = await createLeadPage.createLead(leadData);

      // The mobile number actually accepted may differ from the one we
      // started with if a duplicate-mobile retry happened along the way.
      mobileNumber = acceptedMobileNumber;

      expect(success).toBeTruthy();
      await expect(createLeadPage.successMessage).toBeVisible();
    });

    await test.step('Step 4: Close the "Lead saved successfully" popup', async () => {
      await createLeadPage.closePopup();
      await expect(createLeadPage.successHeading).toBeHidden();
    });

    await test.step('Step 5: Go to Assigned stage and open the lead list', async () => {
      await leadListPage.goToAssignedLeadList();
      await expect(page).toHaveURL(/new-leads-list/);
    });

    await test.step('Step 6: Search and verify the newly created lead is listed', async () => {
      const leadFound = await leadListPage.verifyLeadExists({ mobileNumber, project });
      expect(leadFound).toBeTruthy();

      // Also assert directly against the visible (masked) phone number and project
      const maskedTail = mobileNumber.slice(-2);
      await expect(leadListPage.rowByText(project)).toBeVisible();
      await expect(page.getByRole('cell', { name: new RegExp(`${maskedTail}$`) })).toBeVisible();
    });
  });
});
