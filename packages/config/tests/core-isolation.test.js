// Proves the isolation rule really fails: it must reject browser APIs and React in packages/core,
// and must not flag the same code elsewhere.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ESLint } from "eslint";
import config from "../eslint.js";

const lint = async (code, filePath) => {
  const eslint = new ESLint({
    cwd: new URL("../../..", import.meta.url).pathname,
    overrideConfigFile: true,
    overrideConfig: config,
  });
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.severity === 2).map((m) => m.ruleId);
};

const core = "packages/core/src/ports/probe.ts";

test("core rejects the window global", async () => {
  assert.ok(
    (await lint("export const w = window.location;\n", core)).includes("no-restricted-globals"),
  );
});

test("core rejects document, indexedDB and the global crypto", async () => {
  for (const g of ["document", "indexedDB", "crypto"]) {
    const rules = await lint(`export const x = ${g};\n`, core);
    assert.ok(rules.includes("no-restricted-globals"), g);
  }
});

test("core rejects globalThis.window access", async () => {
  assert.ok(
    (await lint("export const w = globalThis.window;\n", core)).includes(
      "no-restricted-properties",
    ),
  );
});

test("core rejects React imports", async () => {
  assert.ok(
    (await lint('import { useState } from "react";\nexport const s = useState;\n', core)).includes(
      "no-restricted-imports",
    ),
  );
});

test("core accepts pure TypeScript", async () => {
  assert.deepEqual(
    await lint("export const add = (a: number, b: number): number => a + b;\n", core),
    [],
  );
});

test("the same browser access is allowed in apps/web", async () => {
  const rules = await lint("export const w = window.location;\n", "apps/web/src/probe.ts");
  assert.ok(!rules.includes("no-restricted-globals"));
});
