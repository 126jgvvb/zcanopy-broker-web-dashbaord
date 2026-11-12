import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

/**
 * ESLint flat config for the broker dashboard.
 *
 * `next lint` was removed in Next 16, so the config is run with the eslint
 * CLI directly (`npm run lint` -> `eslint .`).
 */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // API responses and decrypted payloads can hold customer PII, so a
      // response body must never be logged.
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // The console loads its data in an effect on purpose (the pages are
      // client rendered behind a session). Moving every fetch to a data
      // library is a separate refactor, so this stays a warning for now.
      "react-hooks/set-state-in-effect": "warn",
      // The subscription countdown reads the clock during render on purpose:
      // it is a label that is recomputed on every render of that page.
      "react-hooks/purity": "warn",
    },
  },
];

export default eslintConfig;
