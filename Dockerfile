# Base image with Node.js installed
# Playwright is not supported on Alpine Linux, so we are using a Debian-based image.
# Same Node as .nvmrc, which every CI workflow reads (node-version-file): Node 24 LTS with npm 11.
FROM node:24.22.1-bookworm-slim

WORKDIR /app

# The image installs exactly what CI installs: same lockfile, same tool (npm ci).
# Only the manifests are copied first so this layer (and the browser layer below)
# stays cached until package-lock.json changes; a code-only push rebuilds just
# the final COPY layer.
COPY package.json package-lock.json ./

# HUSKY=0: the `prepare` script installs git hooks, useless inside the image.
# PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1: transitive packages such as
# @playwright/browser-chromium would download a second Chromium for *their*
# Playwright version; the only browser the tests use is installed below.
RUN HUSKY=0 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --no-audit --no-fund

# Chromium plus its system libraries, at the revision pinned by the installed
# @playwright/test version.
RUN npx playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*

COPY . .

# Expose the port used by your application (if necessary)
EXPOSE 3065

# Pre-production overrides this command (slot-test-runner runs `npx playwright test`
# from /app); this default is for running the image by hand.
CMD ["npm", "run", "testdocker"]
