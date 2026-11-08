# CI QA Automation Lab

This project is for learning Playwright end-to-end testing and running the tests on GitHub Actions.

The dev code and the test code live in the same repo, as they often do on a real team. Pushing a `sit_*` tag deploys the app to SIT, the System Integration Testing environment, and runs the tests against the deployed app. Pushing to `main` runs nothing.

The app under test is Task Tracker, in `app/`. You log in, then add, complete, filter and delete tasks.

## Project layout

```txt
.
├── app/                               # dev code: the Task Tracker web app
│   ├── index.html
│   ├── app.js
│   └── style.css
├── scripts/
│   ├── build.mjs                      # copies app/ to dist/ and writes dist/version.json
│   └── serve.mjs                      # serves dist/ on http://localhost:4173
├── tests/                             # test code, runs against localhost or SIT
│   ├── helpers.ts                     # login() and addTask(), shared by the tests
│   ├── smoke.spec.ts                  # page loads, deployed version is correct
│   ├── login.spec.ts                  # login, wrong password, empty form, logout
│   └── tasks.spec.ts                  # add, validate, complete, filter, delete, reload
├── .github/workflows/
│   ├── ci.yml                         # manual only: test on the runner
│   └── sit.yml                        # on a sit_* tag: build, deploy to SIT, test SIT
├── playwright.config.ts               # baseURL (localhost or SIT_URL), retries, reporters
└── package.json                       # npm scripts
```

## Run the app

```bash
npm install
npm start          # builds the app and serves it at http://localhost:4173
```

Log in with `demo` and `password123`.

## Run the tests on your machine

You need Node.js 20 or newer.

```bash
npm install                        # install @playwright/test
npx playwright install
npx playwright install chromium    # download the browser (first time only)

npm test                           # run all tests headless (starts the app for you)
npm run test:headed                # watch the browser while tests run
npm run test:ui                    # interactive UI mode, good for learning and debugging
npm run report                     # open the last HTML report
```

You don't need to start the app yourself. `webServer` in `playwright.config.ts` runs `npm run build && npm run serve` before the tests and stops the server afterwards.

Other useful commands:

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

When you set `SIT_URL`, Playwright skips the local server and tests that URL instead.

## How the tests find elements

The app puts a `data-test="..."` attribute on each element the tests use. `playwright.config.ts` tells Playwright to use that attribute:

```ts
testIdAttribute: 'data-test',
```

With this setting, `page.getByTestId('login-button')` finds `<button data-test="login-button">`. Test IDs don't change when designers restyle a page, so tests built on them break less often than tests built on CSS classes.

Assertions such as `await expect(locator).toHaveText(...)` retry until they pass or until the 5-second default timeout runs out. That's why the tests need no `sleep` or manual waits.

The tests open the app with `page.goto('./')`, not `page.goto('/')`. On GitHub Pages the app lives under `/ci-qa-automation-lab/`, and `'/'` would jump to the domain root and drop that part.

## The two pipelines

| Trigger                        | Workflow | What it does                                                                                              |
| ------------------------------ | -------- | --------------------------------------------------------------------------------------------------------- |
| Run workflow button (manual)   | CI       | Installs dependencies, builds and serves the app on the runner, runs the tests                            |
| Push a `sit_*` tag             | SIT      | Builds the app with the tag as its version, deploys it to GitHub Pages, waits for it, runs the tests on it |

### CI (`.github/workflows/ci.yml`)

The CI workflow runs only when you start it by hand. In the Actions tab, pick CI and click **Run workflow**. Pushes and pull requests to `main` don't trigger it. Use it to test a change on GitHub without deploying to SIT. It has these steps:

1. Check out the code.
2. Install Node.js and restore the npm cache.
3. Run `npm ci`, which installs the exact versions in `package-lock.json`.
4. Run `npx playwright install --with-deps chromium` to install the browser and the Linux libraries it needs.
5. Run `npx playwright test`, which builds and serves the app on the runner and then runs the tests.
6. Upload `playwright-report/` as an artifact, even when tests fail.

### SIT (`.github/workflows/sit.yml`)

The SIT workflow runs when you push a tag that starts with `sit_`. It has three jobs, and each job starts after the previous one finishes.

| Job           | What it does                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| Build app     | Runs `npm run build` with `APP_VERSION` set to the tag name, so `dist/version.json` holds, for example, `sit_1.0.0` |
| Deploy to SIT | Deploys `dist/` to GitHub Pages and passes the site URL to the next job                                    |
| Test SIT      | Polls `version.json` for up to 5 minutes until SIT serves the new tag, then runs the tests against the URL |

The smoke test `the deployed version is the one we built` checks that the version in the page footer equals the tag. If SIT still serves an old build, this test fails and reports `Expected: "sit_1.0.1" / Received: "sit_1.0.0"`.

#### One-time GitHub setup for SIT

1. Push this repo to GitHub as a public repo. GitHub Pages is free for public repos.
2. In the repo's Settings, open Pages. Under Build and deployment, set Source to **GitHub Actions**.
3. In Settings, open Environments, then `github-pages`. Under Deployment branches and tags, click **Add deployment branch or tag rule**, choose Tag, and enter `sit_*`.

Without the tag rule, GitHub lets only `main` deploy to Pages, and the deploy job fails with "Tag sit_1.0.0 is not allowed to deploy to github-pages due to environment protection rules".

#### Deploy to SIT

```bash
git tag sit_1.0.0
git push origin sit_1.0.0
```

Open the Actions tab to watch the "Deploy to SIT and test" run. The deploy job shows the SIT URL, `https://<your-username>.github.io/ci-qa-automation-lab/`.

For the next release, push a new tag such as `sit_1.0.1` or `sit_1.1.0`. To deploy the same tag again, delete it and push it again:

```bash
git tag -d sit_1.0.0 && git push origin :refs/tags/sit_1.0.0
git tag sit_1.0.0 && git push origin sit_1.0.0
```

### Settings that change on CI

GitHub Actions sets `CI=true`. `playwright.config.ts` reads it and changes these settings:

| Setting      | Local                                              | CI                                        |
| ------------ | -------------------------------------------------- | ----------------------------------------- |
| `retries`    | 0                                                  | 2                                         |
| `workers`    | auto                                               | 2                                         |
| `forbidOnly` | off                                                | on, so a stray `test.only` fails the build |
| `reporter`   | HTML report, opens when a test fails               | list in the log, plus an HTML report      |
| `trace`      | on first retry, so never, because local runs don't retry | on first retry                      |

### Read a failed CI run

1. Open the failed run in the Actions tab.
2. Scroll to Artifacts and download `playwright-report`. For a SIT run, the artifact is `sit-playwright-report`.
3. Unzip it and run `npx playwright show-report path/to/playwright-report`.
4. Click a failed test to see its screenshot and trace. The trace is a timeline of every action, with DOM snapshots and network calls.

## Other practice sites

- [https://demo.playwright.dev/todomvc](https://demo.playwright.dev/todomvc) is the Playwright team's demo to-do app.
- [https://the-internet.herokuapp.com](https://the-internet.herokuapp.com) has one page for each hard UI case, such as iframes, alerts, drag and drop, and file upload.
- [practice.expandtesting.com](https://practice.expandtesting.com) has forms, tables, and a REST API for API testing.
