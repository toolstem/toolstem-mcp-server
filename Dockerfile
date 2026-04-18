# Build stage: install all deps (including devDeps for tsc) and compile
FROM apify/actor-node:22 AS builder

COPY package*.json ./

RUN npm install --include=dev --audit=false

COPY . ./

RUN npm run build

# Production stage: only prod deps + compiled JS
FROM apify/actor-node:22

COPY package*.json ./

RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && echo "Installed NPM packages:" \
    && (npm list --omit=dev --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version \
    && rm -r ~/.npm

# Copy compiled JS from builder
COPY --from=builder /usr/src/app/dist ./dist

# Copy remaining source files
COPY . ./

CMD ["node", "dist/actor.js"]
