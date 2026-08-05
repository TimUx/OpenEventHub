# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json tsconfig.json ./
COPY packages ./packages
COPY services/search ./services/search
RUN npm ci
RUN npm run build --workspace=@openeventhub/shared \
  && npm run build --workspace=@openeventhub/service-runtime \
  && npm run build --workspace=@openeventhub/search

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3006
RUN useradd --create-home --uid 10001 oeh
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/services/search ./services/search
COPY docker/scripts/load-secrets-entrypoint.sh /usr/local/bin/load-secrets-entrypoint.sh
RUN chmod 755 /usr/local/bin/load-secrets-entrypoint.sh
USER oeh
WORKDIR /app/services/search
EXPOSE 3006
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3006/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/local/bin/load-secrets-entrypoint.sh"]
CMD ["node", "dist/main.js"]
