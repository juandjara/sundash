/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ["@remix-run/eslint-config", "@remix-run/eslint-config/node"],
  rules: {
    semi: ["error", "never"]
  },
  ignorePatterns: ["node_modules/", "storage/", "public/", "build/"]
}
