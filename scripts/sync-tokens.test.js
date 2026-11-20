/**
 * Runs scripts/sync-tokens.mjs as a child process. Only ever in --check mode, or with a missing
 * source (which exits before writing), so src/theme/tokens.generated.ts is never touched.
 * Plain JS on purpose: the app's tsconfig has no Node types, and this test needs node:fs/child_process.
 * @jest-environment node
 */
const { spawnSync } = require("node:child_process");
const { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const script = join(root, "scripts/sync-tokens.mjs");
const realSource = resolve(root, "../docs/design-system/tokens.json");
const target = join(root, "src/theme/tokens.generated.ts");

const run = (args, tokensPath) => {
  // Only PATH from the parent, so a HANDYSG_TOKENS in the shell can't change what is checked.
  const envVars = { PATH: process.env.PATH };
  if (tokensPath) envVars.HANDYSG_TOKENS = tokensPath;
  const r = spawnSync(process.execPath, [script, ...args], { cwd: root, env: envVars, encoding: "utf8" });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
};

let dir;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "handysg-tokens-"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("sync-tokens --check", () => {
  const generatedBefore = readFileSync(target, "utf8");
  afterAll(() => expect(readFileSync(target, "utf8")).toBe(generatedBefore));

  (existsSync(realSource) ? it : it.skip)("passes when the generated file matches docs/design-system/tokens.json", () => {
    const r = run(["--check"]);
    expect(r).toMatchObject({ status: 0 });
    expect(r.out).toMatch(/tokens: up to date/);
  });

  it("skips with a note when the source file is missing (checkout without docs)", () => {
    const r = run(["--check"], join(dir, "missing.json"));
    expect(r.status).toBe(0);
    expect(r.out).toMatch(/not found\. Skipping the check\./);
  });

  it("fails sync (not --check) when the source file is missing, without writing", () => {
    const r = run([], join(dir, "missing.json"));
    expect(r.status).toBe(1);
    expect(r.out).toMatch(/not found\./);
    expect(r.out).not.toMatch(/Skipping/);
  });

  (existsSync(realSource) ? it : it.skip)("fails when tokens.json has changed but the generated file wasn't regenerated", () => {
    const tokens = JSON.parse(readFileSync(realSource, "utf8"));
    tokens.color.tokens[0].value.light = "#123456";
    const changed = join(dir, "changed.json");
    writeFileSync(changed, JSON.stringify(tokens));
    const r = run(["--check"], changed);
    expect(r.status).toBe(1);
    expect(r.out).toMatch(/out of date\. Run `npm run tokens:sync`/);
  });

  (existsSync(realSource) ? it : it.skip)("rejects a non-px size value", () => {
    const tokens = JSON.parse(readFileSync(realSource, "utf8"));
    tokens.spacing.tokens[0].value = "1rem";
    const bad = join(dir, "bad-px.json");
    writeFileSync(bad, JSON.stringify(tokens));
    const r = run(["--check"], bad);
    expect(r.status).not.toBe(0);
    expect(r.out).toMatch(/expected a px value, got "1rem"/);
  });

  (existsSync(realSource) ? it : it.skip)("rejects a colour token missing its dark value", () => {
    const tokens = JSON.parse(readFileSync(realSource, "utf8"));
    delete tokens.color.tokens[0].value.dark;
    const bad = join(dir, "no-dark.json");
    writeFileSync(bad, JSON.stringify(tokens));
    const r = run(["--check"], bad);
    expect(r.status).not.toBe(0);
    expect(r.out).toMatch(/has no dark value/);
  });
});
