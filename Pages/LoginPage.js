/**
 * LoginPage - Page Object for Mint360 Sign In flow.
 *
 * Flow:
 *  1. Landing page
 *  2. Click Sign In
 *  3. AWS Cognito Hosted UI
 *  4. Enter email/password
 *  5. Submit
 *  6. Redirect to Mint360 dashboard
 *
 * NOTE on Cognito locators:
 * The Cognito Hosted UI renders a hidden "Advanced Security Features"
 * (ASF) fingerprinting form alongside the real sign-in form, and it
 * reuses the SAME ids (#signInFormUsername / #signInFormPassword) and
 * the same name attribute on the submit control. Plain #id / [name=...]
 * selectors therefore resolve to 2 elements, with the hidden ASF clone
 * often matching first - which is why waitFor({state:'visible'}) can
 * hang forever. We use Playwright's `:visible` pseudo-class (or a
 * role-based locator) to always target the real, rendered element.
 */

class LoginPage {
  constructor(page) {
    this.page = page;

    this.url = 'https://qa.mint360.in/#/auth/signin';

    // ---- Landing page ----
    this.signInButton = page.getByRole('button', {
      name: 'Sign In'
    });

    // ---- Cognito Hosted UI ----
    this.emailInput = page.locator('#signInFormUsername:visible');
    this.passwordInput = page.locator('#signInFormPassword:visible');
    this.submitButton = page.getByRole('button', { name: 'submit' });

    this.forgotPasswordLink = page.getByRole('link', {
      name: 'Forgot your password?'
    });
  }

  /**
   * Navigate to Mint360 sign-in page
   */
  async goto() {
    await this.page.goto(this.url);
    await this.signInButton.waitFor({
      state: 'visible',
      timeout: 30000
    });
  }

  /**
   * Click Sign In and handle Cognito page
   *
   * Cognito may open in the same page or a new page.
   */
  async clickSignIn() {
    const context = this.page.context();
    const pagesBefore = context.pages();

    await this.signInButton.click();

    // Give the redirect/new page a moment to start
    await this.page.waitForTimeout(1000);

    const pagesAfter = context.pages();

    if (pagesAfter.length > pagesBefore.length) {
      // Cognito opened in a new tab/page
      this.page = pagesAfter[pagesAfter.length - 1];

      await this.page.waitForLoadState('domcontentloaded');
    } else {
      // Cognito opened in the same page
      await this.page.waitForLoadState('domcontentloaded');
    }

    console.log('Login page URL:', this.page.url());

    // Re-create Cognito locators using the active page
    this.emailInput = this.page.locator('#signInFormUsername:visible');
    this.passwordInput = this.page.locator('#signInFormPassword:visible');
    this.submitButton = this.page.getByRole('button', { name: 'submit' });
  }

  /**
   * Fill Cognito email and password
   */
  async fillCredentials(email, password) {
    await this.emailInput.waitFor({
      state: 'visible',
      timeout: 30000
    });

    await this.emailInput.fill(email);

    await this.passwordInput.waitFor({
      state: 'visible',
      timeout: 30000
    });

    await this.passwordInput.fill(password);
  }

  /**
   * Click Cognito Sign In button
   */
  async submit() {
    await this.submitButton.waitFor({
      state: 'visible',
      timeout: 30000
    });

    await this.submitButton.click();
  }

  /**
   * Complete login flow
   *
   * Returns the active Playwright page.
   */
  async login(email, password) {
    await this.goto();

    await this.clickSignIn();

    await this.fillCredentials(email, password);

    await this.submit();

    // Wait for Mint360 dashboard
    await this.page.waitForURL('**/#/tele/dashboard', {
      timeout: 30000
    });

    console.log('Login successful:', this.page.url());

    return this.page;
  }
}

module.exports = { LoginPage };