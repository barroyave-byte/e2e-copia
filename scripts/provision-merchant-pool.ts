// Kept on purpose: github-actions regression_tests.yml runs this path, and the release branches
// already cut carry it. The provisioning lives in scripts/merchant-pool/cli/provision.ts; prefer
// `npm run merchant-pool:provision` in anything new.
import './merchant-pool/cli/provision';
