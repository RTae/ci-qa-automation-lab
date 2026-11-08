// A small custom Playwright reporter that writes the test results as Markdown
// to the GitHub Actions job summary, so you can see them on the run page
// without downloading the HTML report.
//
// GitHub sets GITHUB_STEP_SUMMARY to a file path on the runner. Anything
// written to that file shows up on the run's Summary page. Locally the
// variable is not set, so this reporter does nothing.
import { appendFileSync } from 'node:fs';
import { relative } from 'node:path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
} from '@playwright/test/reporter';

const ICON = { expected: '✅', unexpected: '❌', flaky: '⚠️', skipped: '⏭️' } as const;
const LABEL = { expected: 'passed', unexpected: 'failed', flaky: 'flaky', skipped: 'skipped' } as const;

// Error messages contain terminal color codes; strip them for Markdown.
const stripAnsi = (s: string) => s.replace(/\u001b\[[0-9;]*m/g, '');
// A "|" inside a table cell would start a new column.
const cell = (s: string) => s.replace(/\|/g, '\\|');
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

export default class GitHubSummaryReporter implements Reporter {
  private suite!: Suite;
  private rootDir = process.cwd();

  onBegin(config: FullConfig, suite: Suite) {
    this.suite = suite;
    this.rootDir = config.rootDir;
  }

  // This reporter writes to a file, not the terminal, so the list reporter
  // keeps the terminal to itself.
  printsToStdio() {
    return false;
  }

  onEnd(result: FullResult) {
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (!summaryFile) return;

    const tests = this.suite.allTests();
    const count = (outcome: keyof typeof ICON) =>
      tests.filter((t) => t.outcome() === outcome).length;

    const target = process.env.SIT_URL ?? 'localhost (built on the runner)';
    const lines: string[] = [];

    lines.push(`## Playwright results: ${result.status === 'passed' ? 'passed ✅' : 'failed ❌'}`);
    lines.push('');
    lines.push(`- Tested: ${target}`);
    if (process.env.EXPECTED_VERSION) lines.push(`- Expected version: \`${process.env.EXPECTED_VERSION}\``);
    lines.push(
      `- ${count('expected')} passed, ${count('unexpected')} failed, ` +
        `${count('flaky')} flaky, ${count('skipped')} skipped in ${seconds(result.duration)}`,
    );
    lines.push('');

    const failed = tests.filter((t) => t.outcome() === 'unexpected');
    if (failed.length > 0) {
      lines.push('### Failures');
      lines.push('');
      for (const test of failed) {
        const last = test.results[test.results.length - 1];
        const message = stripAnsi(last?.error?.message ?? 'No error message').slice(0, 2000);
        lines.push('<details open>');
        lines.push(`<summary><b>${escapeHtml(this.title(test))}</b> (${escapeHtml(this.location(test))})</summary>`);
        lines.push('');
        lines.push('<pre>' + escapeHtml(message) + '</pre>');
        lines.push('</details>');
        lines.push('');
      }
    }

    lines.push('### All tests');
    lines.push('');
    lines.push('| Result | Test | File | Time |');
    lines.push('| --- | --- | --- | --- |');
    for (const test of tests) {
      const outcome = test.outcome();
      const time = test.results.reduce((sum, r) => sum + r.duration, 0);
      const retries = test.results.length > 1 ? ` (${test.results.length - 1} retries)` : '';
      lines.push(
        `| ${ICON[outcome]} ${LABEL[outcome]} | ${cell(this.title(test))} | ` +
          `\`${cell(this.location(test))}\` | ${seconds(time)}${retries} |`,
      );
    }
    lines.push('');

    appendFileSync(summaryFile, lines.join('\n') + '\n');
  }

  // "Tasks › add a task" (titlePath is ['', project, file, ...describes, title]).
  private title(test: TestCase) {
    return test.titlePath().slice(3).join(' › ');
  }

  private location(test: TestCase) {
    return `${relative(this.rootDir, test.location.file)}:${test.location.line}`;
  }
}
