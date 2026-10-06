# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shell.spec.ts >> the profile survives a reload but the app comes back locked, and never shows the name
- Location: e2e/shell.spec.ts:25:1

# Error details

```
Error: Channel closed
```

```
Error: locator.fill: Target page, context or browser has been closed
Call log:
  - waiting for getByLabel('Prénom')

```

```
Error: browserContext._wrapApiCall: Target page, context or browser has been closed
```