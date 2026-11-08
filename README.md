# CI QA Automation Lab

A small project for learning **Playwright** end-to-end testing and running the tests on **GitHub Actions**.

The tests run against [SauceDemo](https://www.saucedemo.com), a free practice shop built for test automation. It has a login page, a product list, a cart and a checkout flow, and its public test accounts are listed on the login page.

## Project layout

```
.
├── .github/workflows/playwright.yml   # CI: runs the tests on every push / PR
├── tests/
│   ├── login.spec.ts                  # login: success, locked-out user, wrong password, empty form
│   └── checkout.spec.ts               # cart badge, price sorting, full checkout, form validation
├── playwright.config.ts               # baseURL, retries, reporters, browsers
└── package.json                       # npm scripts
```

## Run the tests on your machine

Requirements: Node.js 20 or newer.

```bash
npm install                        # install @playwright/test
npx playwright install chromium    # download the browser (first time only)

npm test                           # run all tests headless
npm run test:headed                # watch the browser while tests run
npm run test:ui                    # interactive UI mode (best for learning and debugging)
npm run report                     # open the last HTML report
```

Useful extras:

```bash
npx playwright test tests/login.spec.ts      # run one file
npx playwright test -g "full checkout"       # run tests whose name matches
npx playwright test --debug                  # step through a test with the inspector
npx playwright codegen https://www.saucedemo.com   # record clicks and generate test code
```

## How the tests find elements

SauceDemo puts a `data-test="..."` attribute on its elements. In `playwright.config.ts` we set:

```ts
testIdAttribute: 'data-test',
```

so `page.getByTestId('login-button')` finds `<input data-test="login-button">`. Test IDs don't change when designers restyle a page, so tests built on them break less often than tests built on CSS classes.

Assertions such as `await expect(locator).toHaveText(...)` **retry automatically** until they pass or time out (5 seconds by default). That's why the tests need no `sleep` or manual waits.

## How CI works

`.github/workflows/playwright.yml` runs on:

- every push to `main`
- every pull request into `main`
- by hand from the **Actions** tab (**Run workflow** button)

Steps:

1. Check out the code
2. Install Node.js and restore the npm cache
3. `npm ci`: a clean install from `package-lock.json`
4. `npx playwright install --with-deps chromium`: the browser plus the Linux libraries it needs
5. `npx playwright test`
6. Upload `playwright-report/` as an artifact, **even if tests failed**

GitHub Actions sets `CI=true`, and the config uses it to change behaviour on CI:

| Setting       | Local                 | CI                                          |
| ------------- | --------------------- | ------------------------------------------- |
| `retries`     | 0                     | 2                                           |
| `workers`     | auto                  | 2                                           |
| `forbidOnly`  | off                   | on (a stray `test.only` fails the build)    |
| `reporter`    | HTML, opens on fail   | list in the log + HTML file                 |
| `trace`       | on first retry (none, since local has 0 retries) | on first retry           |

### Read a failed CI run

1. Open the failed run in the **Actions** tab.
2. Scroll to **Artifacts** and download `playwright-report`.
3. Unzip it and run `npx playwright show-report path/to/playwright-report`.
4. Click a failed test to see its screenshot and trace (a timeline of every action, DOM snapshot and network call).

## Push to GitHub

```bash
git add .
git commit -m "chore: add Playwright tests and CI workflow"
git remote add origin https://github.com/<your-username>/ci-qa-automation-lab.git
git push -u origin main
```

Then open the **Actions** tab of your repo to watch the run.

## Ideas for practice

- **Break a test on purpose** (for example, expect `'3'` in the cart badge) and push it. Watch CI fail, then download the report and read the trace.
- **Add more browsers**: add `firefox` and `webkit` to `projects` in the config, and install them in the workflow.
- **Page Object Model**: move the login steps into a `LoginPage` class in `tests/pages/` and reuse it.
- **Log in once**: use a [setup project with `storageState`](https://playwright.dev/docs/auth) so tests skip the login form.
- **Test the other SauceDemo users**: `problem_user`, `performance_glitch_user` and `error_user` each have a different bug to find.
- **Shard in CI**: split the tests across several machines with a [matrix and `--shard`](https://playwright.dev/docs/test-sharding).

## Other practice sites

- https://demo.playwright.dev/todomvc: Playwright's own demo to-do app
- https://the-internet.herokuapp.com: one page per tricky UI case (iframes, alerts, drag and drop, file upload)
- https://practice.expandtesting.com: forms, tables, and a REST API for API testing
