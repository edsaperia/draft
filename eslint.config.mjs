// Lint gate (PRODUCTION.md stage 1, decision 434): correctness rules only,
// no formatter and no stylistic rules — the codebase's comments are
// hand-wrapped prose and must never be machine-reflowed. Scope is the
// TypeScript packages; design/ is hand-crafted browser code with its own
// conventions (probe-guarded), deliberately out of scope for now.
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'design/**',
      'dist/**',
      '**/dist/**',
      'coverage/**',
      'node_modules/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      // The engine passes context objects whose fields are genuinely open —
      // `any` at those seams is a deliberate choice, not an accident, and
      // the strict alternative is a cast that says less.
      '@typescript-eslint/no-explicit-any': 'off',
      // Non-null assertions after an existence check the type system cannot
      // see (seg[seg.length - 1]!) are the codebase's idiom; banning them
      // would trade one honest ! for a lying fallback value.
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Underscore-prefixed means "deliberately unused" here.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
