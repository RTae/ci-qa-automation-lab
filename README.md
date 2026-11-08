# CI QA Automation Lab

A small project for learning **Playwright** end-to-end testing and running the tests on **GitHub Actions**.

It mimics a real team setup: the **dev code** (a small web app) and the **test code** live in the same repo. Every push runs the tests in CI, and pushing a `sit_*` tag deploys the app to a **SIT** (System Integration Testing) environment and tests the deployed app.

The app under test is **Task Tracker** (`app/`). You log in, then add, complete, filter and delete tasks.

## Project layout

```txt
.
├── app/                               # DEV CODE: the Task Tracker web app
│   ├── index.html
│   ├── app.js
│   └── style.css
├── scripts/
│   ├── build.mjs                      # app/ -> dist/, and writes dist/version.json
│   └── serve.mjs                      # serves dist/ on http://localhost:4173
├── tests/                             # TEST CODE (runs against localhost or SIT)
│   ├── helpers.ts                     # login() / addTask() shared by the tests
│   ├── smoke.spec.ts                  # page loads, deployed version is correct
│   ├── login.spec.ts                  # login, wrong password, empty form, logout
│   └── tasks.spec.ts                  # add, validate, complete, filter, delete, reload
├── .github/workflows/
│   ├── ci.yml                         # on push / PR to main: test on the runner
│   └── sit.yml                        # on tag sit_*: build -> deploy SIT -> test SIT
├── playwright.config.ts               # baseURL (localhost or SIT_URL), retries, reporters
└── package.json                       # npm scripts
```

## Run the app

```bash
npm install
npm start          # build + serve at http://localhost:4173  (log in with demo / password123)
```

## Run the tests on your machine

Requirements: Node.js 20 or newer.

```bash
npm install                        # install @playwright/test
npx playwright install
npx playwright install chromium    # download the browser (first time only)

npm test                           # run all tests headless (starts the app for you)
npm run test:headed                # watch the browser while tests run
npm run test:ui                    # interactive UI mode (best for learning and debugging)
npm run report                     # open the last HTML report
```

You don't need to start the app yourself. `webServer` in `playwright.config.ts` runs `npm run build && npm run serve` before the tests and stops it afterwards.

Useful extras:

```bash
npx playwright test tests/tasks.spec.ts      # run one file
npx playwright test -g "delete a task"       # run tests whose name matches
npx playwright test --debug                  # step through a test with the inspector
npx playwright codegen http://localhost:4173 # record clicks and generate test code (app must be running)
```

### Run the tests against SIT from your machine

```bash
SIT_URL=https://<your-username>.github.io/ci-qa-automation-lab/ \
EXPECTED_VERSION=sit_1.0.0 \
npm test
```

When `SIT_URL` is set, Playwright skips starting the local server and tests that URL instead.

## How the tests find elements

The app puts a `data-test="..."` attribute on the elements tests need. In `playwright.config.ts` we set:

```ts
testIdAttribute: 'data-test',
```

so `page.getByTestId('login-button')` finds `<button data-test="login-button">`. Test IDs don't change when designers restyle a page, so tests built on them break less often than tests built on CSS classes.

Assertions such as `await expect(locator).toHaveText(...)` **retry automatically** until they pass or time out (5 seconds by default). That's why the tests need no `sleep` or manual waits.

The tests open the app with `page.goto('./')`, not `page.goto('/')`. On GitHub Pages the app lives under `/ci-qa-automation-lab/`, and `'/'` would jump to the domain root and drop that part.

## The two pipelines

```txt
push / PR to main ──> CI    : npm ci -> build + serve on runner -> all tests
git push tag sit_* ─> SIT   : build (version = tag) -> deploy to GitHub Pages -> wait -> all tests on SIT URL
```

### CI (`.github/workflows/ci.yml`)

Runs on every push to `main`, every pull request into `main`, and by hand from the **Actions** tab (**Run workflow** button).

1. Check out the code
2. Install Node.js and restore the npm cache
3. `npm ci`: a clean install from `package-lock.json`
4. `npx playwright install --with-deps chromium`: the browser plus the Linux libraries it needs
5. `npx playwright test`: builds and serves the app on the runner, then runs the tests
6. Upload `playwright-report/` as an artifact, **even if tests failed**

### SIT (`.github/workflows/sit.yml`)

Runs when you push a tag that starts with `sit_`. It has three jobs, and each one waits for the previous one:

| Job               | What it does                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| **Build app**     | `npm run build` with `APP_VERSION` = the tag name, so `dist/version.json` says e.g. `sit_1.0.0`          |
| **Deploy to SIT** | Deploys `dist/` to GitHub Pages and passes the site URL on to the next job                               |
| **Test SIT**      | Polls `version.json` until SIT serves the new tag (up to 5 min), then runs the tests against the URL     |

The smoke test `the deployed version is the one we built` checks that the version in the page footer equals the tag. If SIT is still serving an old build, this test fails with `Expected: "sit_1.0.1" / Received: "sit_1.0.0"`.

#### One-time GitHub setup for SIT

1. Push this repo to GitHub as a **public** repo (GitHub Pages is free for public repos).
2. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions**.
3. **Settings → Environments → github-pages → Deployment branches and tags:** click **Add deployment branch or tag rule**, choose **Tag**, and enter `sit_*`.
   Without this, GitHub only lets `main` deploy to Pages and the deploy job fails with *"Tag sit_1.0.0 is not allowed to deploy to github-pages due to environment protection rules"*.

#### Deploy to SIT

```bash
git tag sit_1.0.0
git push origin sit_1.0.0
```

Open the **Actions** tab to watch **Deploy to SIT and test**. The deploy job shows the SIT URL, `https://<your-username>.github.io/ci-qa-automation-lab/`.

For the next release, push a new tag (`sit_1.0.1`, `sit_1.1.0`, ...). To re-deploy the same tag, delete it and push it again:

```bash
git tag -d sit_1.0.0 && git push origin :refs/tags/sit_1.0.0
git tag sit_1.0.0 && git push origin sit_1.0.0
```

### Settings that change on CI

GitHub Actions sets `CI=true`, and the config uses it to change behaviour on CI:

| Setting      | Local                                                | CI                                          |
| ------------ | ---------------------------------------------------- | ------------------------------------------- |
| `retries`    | 0                                                    | 2                                           |
| `workers`    | auto                                                 | 2                                           |
| `forbidOnly` | off                                                  | on (a stray `test.only` fails the build)    |
| `reporter`   | HTML, opens on fail                                  | list in the log + HTML file                 |
| `trace`      | on first retry (none, since local has 0 retries)     | on first retry                              |

### Read a failed CI run

1. Open the failed run in the **Actions** tab.
2. Scroll to **Artifacts** and download `playwright-report` (or `sit-playwright-report` for SIT).
3. Unzip it and run `npx playwright show-report path/to/playwright-report`.
4. Click a failed test to see its screenshot and trace (a timeline of every action, DOM snapshot and network call).

## Other practice sites

- [https://demo.playwright.dev/todomvc](https://demo.playwright.dev/todomvc): Playwright's own demo to-do app
- [https://the-internet.herokuapp.com](https://the-internet.herokuapp.com): one page per tricky UI case (iframes, alerts, drag and drop, file upload)
- [practice.expandtesting.com](https://practice.expandtesting.com): forms, tables, and a REST API for API testing
