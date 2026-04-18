FROM apify/actor-node:20 AS builder

COPY --chown=myuser package*.json ./
RUN npm ci

COPY --chown=myuser . ./
RUN npm run build

FROM apify/actor-node:20

COPY --from=builder --chown=myuser /home/myuser/dist ./dist
COPY --chown=myuser package*.json ./
RUN npm ci --omit=dev --omit=optional

CMD ["node", "dist/actor.js"]
