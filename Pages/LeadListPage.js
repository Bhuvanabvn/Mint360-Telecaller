/**
 * LeadListPage - Page Object for viewing leads assigned to the Tele Caller.
 *
 * Navigation:
 *  Sidebar "New Leads" (#/tele/new-leads) -> summary page for the
 *  Assigned stage -> a "list icon" (View Entire Lead List) opens the full
 *  table at #/tele/new-leads-list, which can be filtered via the search box.
 */
class LeadListPage {
  constructor(page) {
    this.page = page;

    // ---- Sidebar ----
    // "New Leads" is where leads created with Stage = "Assigned" land.
    this.newLeadsNavLink = page.getByRole('link', { name: 'New Leads' });

    // ---- New Leads summary page (#/tele/new-leads) ----
    this.viewEntireLeadListIcon = page.getByRole('link', { name: 'View Entire Lead List' });

    // ---- Full lead list page (#/tele/new-leads-list) ----
    this.searchInput = page.getByPlaceholder('Search by Name, Email, Phone Number or LeadID');
    this.filtersButton = page.getByRole('button', { name: 'Filters' });
    this.backButton = page.getByRole('button', { name: 'Back' });
    this.resultsTable = page.locator('table');
    this.tableRows = page.locator('table tbody tr');
    this.entriesCaption = page.getByText(/Showing \d+ to \d+ of \d+ Entries/);
  }

  /** Go to the "Assigned" stage summary page from the sidebar */
  async goToAssignedStage() {
    await this.newLeadsNavLink.click();
    await this.viewEntireLeadListIcon.waitFor({ state: 'visible' });
  }

  /** Click the list icon to open the full lead list/table */
  async openLeadList() {
    await this.viewEntireLeadListIcon.click();
    await this.searchInput.waitFor({ state: 'visible' });
  }

  /** Convenience: sidebar -> Assigned stage -> full lead list, in one call */
  async goToAssignedLeadList() {
    await this.goToAssignedStage();
    await this.openLeadList();
  }

  /**
   * Search the lead list by name, email, phone number, or lead ID.
   * @param {string} query
   */
  async search(query) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    // wait for the table to re-render with filtered results
    await this.page.waitForTimeout(500);
  }

  /** Returns the number of rows currently shown in the table */
  async getRowCount() {
    return this.tableRows.count();
  }

  /**
   * Returns a locator for a specific row matching the given phone number
   * (as displayed, e.g. partially masked "91******80") or lead name.
   * @param {string} text
   */
  rowByText(text) {
    return this.page.locator('table tbody tr', { hasText: text });
  }

  /**
   * Searches for a lead by mobile number and asserts it appears in the
   * filtered results with the expected project.
   * @param {Object} params
   * @param {string} params.mobileNumber - full 10-digit number used at creation
   * @param {string} [params.project] - expected project name to cross-check
   * @returns {Promise<boolean>} true if a matching row was found
   */
  async verifyLeadExists({ mobileNumber, project }) {
    await this.search(mobileNumber);

    const rowCount = await this.getRowCount();
    if (rowCount === 0) return false;

    if (project) {
      const row = this.rowByText(project);
      return (await row.count()) > 0;
    }

    return rowCount > 0;
  }
}

module.exports = { LeadListPage };
