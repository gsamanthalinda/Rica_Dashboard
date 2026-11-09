# Rica — Authentication Screens (Next.js)

The six Rica screens, built in Next.js and linked to each other in the same order as the designs.

## Run it

1. Unzip and open the `rica-auth` folder in VS Code.
2. Open the terminal (**Terminal → New Terminal**) and run:

   ```bash
   npm install
   npm run dev
   ```

3. Open **http://localhost:3000** in your browser.

You need Node.js 20.9 or newer (`node -v` to check).

## Screens and flow

| URL                | Screen                | Goes to                                                                                                 |
| ------------------ | --------------------- | ------------------------------------------------------------------------------------------------------- |
| `/`                | Splash (logo)         | Sign In, automatically after ~2 seconds                                                                 |
| `/login`           | Welcome / Sign In     | "Sign In" → Two-step verification · "Forgot password?" → Password reset · "Activate" → Activate Account |
| `/verify`          | Two-step verification | "Continue" → the app · "Resend" sends a new code                                                        |
| `/activate`        | Activate Account      | "Activate Account" → Sign In                                                                            |
| `/forgot-password` | Password reset        | "Send" → Create New password                                                                            |
| `/reset-password`  | Create New password   | "Reset password" → Sign In                                                                              |

## The two ways through

- **Returning user:** Sign In → `/verify` → enter the code emailed to you → _Continue_.
- **First-time user:** Sign In → _Activate_ → `/activate` (activation code, password, confirm password) → _Activate Account_ → Sign In → `/verify` → _Continue_.

## What works

- Navigation between all screens.
- Email and password validation, with messages under the fields.
- The 6-digit code boxes jump to the next box as you type. Backspace goes back, and pasting a full code fills every box.
- The email you sign in with is remembered for the session, so `/verify` can show which account the code was sent to.
- New password and confirm password must match (at least 8 characters).
- Loading states on the buttons.
- The sign-in screen is prefilled with the email you used, and after a password reset it takes you straight back to it.

## Backend

The screens talk to the Rica API on **`http://<your-host>:8000`** (`API_BASE_URL` in `lib/auth.js`). Run the API from the `heliks-backend` project: `uv run --no-sync uvicorn main:app --reload`.

| Screen             | Endpoint                                               | Notes                                                                                         |
| ------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `/login`           | `POST /auth/login`                                     | `200` = signed in, `202` = MFA challenge, `403` = account not activated, `429` = rate limited |
| `/verify`          | `POST /auth/mfa/verify-login`, `POST /auth/mfa/resend` | 6-digit code; resend reuses the same `challenge_id`                                           |
| `/activate`        | `POST /auth/activate`                                  | The 6-digit code identifies the account, so no email is sent                                  |
| `/forgot-password` | `POST /auth/forgot-password`                           | The token comes back in the response body                                                     |
| `/reset-password`  | `POST /auth/reset-password`                            | Also accepts `?token=` from the emailed link                                                  |

Codes and reset tokens are emailed. In development the API prints the email body to its console (`Email (development console)`), which is where you read the 6-digit code.

## Project structure

```
app/
  layout.js                 font + global styles
  globals.css               colors, sizes, all styling
  page.js                   Splash
  login/page.js             Sign In
  activate/page.js          Activate Account
  forgot-password/page.js   Password reset
  verify/page.js            Two-step verification
  reset-password/page.js    Create New password
components/
  AuthLayout.js             navy left panel + white panel
  CodeInput.js              6-digit code boxes
  Logo.js                   Rica logo (SVG)
lib/
  auth.js                   API calls + session storage helpers
```

## Notes

- **Colors** from the designs: navy `#262262`, green `#0AC297`, input border `#E2E1E1`.
- **Font:** Instrument Sans, installed locally through npm (no internet needed at runtime).
- **Sizing:** every size is measured from the design frames and scales with the window, so the screens keep the same proportions on any laptop or desktop. On phones the two panels stack.
- **Logo:** the logo is redrawn as an SVG from the screenshots. For a pixel-perfect logo, drop your original file into `public/` (for example `public/logo.svg`) and follow the one-line instruction at the top of `components/Logo.js`.

## Pull Request Rules

Every PR uses the [PR template](.github/pull_request_template.md). Fill in every section.

### 1. Open PRs as a draft

Always open a new PR as a **Draft**. Keep it as a draft while you are still working on it.

### 2. Add screenshots and a recording

In the **Screenshots & Recordings** section of the PR description:

- Drag and drop a **recording** of the changes (.mp4 / .mov, or a Loom / YouTube / Google Drive link).
- Drag and drop **at least 2 screenshots** across different screens (mobile, tablet, desktop), with before and after where it applies.

### 3. Add the Figma designs

In the **Figma Designs** section of the PR description:

- Paste the **Figma link** (a `figma.com` URL).
- Drag and drop **at least 1 screenshot** of the design.

### 4. Only mark as "Ready for review" when everything passes

The **Ready for Review** checklist at the bottom of the PR description has 4 items:

| Item                                                               | Who ticks it |
| ------------------------------------------------------------------ | ------------ |
| 🤖 All CI checks pass (build, lint, tests)                         | CI           |
| 🤖 Recording and screenshots across different screens are attached | CI           |
| 🤖 Figma design screenshots and link are attached                  | CI           |
| Self-reviewed the code and tested the changes locally              | You          |

Don't tick the 🤖 items yourself. CI checks them on every update and ticks or unticks them to match what it finds. Mark the PR as **Ready for review** only when all 4 are ticked.

### How this is enforced

The [PR Ready Check](.github/workflows/pr-ready-check.yml) workflow ([script](.github/scripts/pr-ready-check.js)) runs whenever a PR is opened, edited, gets new commits, or is marked ready for review. It:

1. Waits up to 10 minutes for the PR's other CI checks to finish.
2. Looks for the recording, screenshots, Figma link and Figma screenshot in the PR description.
3. Ticks or unticks the 🤖 items in the PR description to match.
4. **Draft PRs:** never fails, so you can see what's still missing.
5. **PRs marked Ready for review:** fails if any item is unticked. The failure message and the run summary say what is missing.

To fix a failing check, add what's missing to the PR description (or fix the failing CI check and push). The check runs again when you edit the description or push. If another CI check finished after the 10-minute wait, re-run the **Ready for Review checklist** check from the PR's Checks tab.

A PR cannot be merged into `main` or `develop` until all required checks pass.
