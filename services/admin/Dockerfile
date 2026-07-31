# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json tsconfig.json ./
COPY packages/shared ./packages/shared
COPY services/admin ./services/admin
RUN npm ci
RUN npm run build --workspace=@openeventhub/shared \
  && npm run build --workspace=@openeventhub/admin

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3101
RUN useradd --create-home --uid 10001 oeh
COPY --from=build /app/services/admin/.next/standalone ./
COPY --from=build /app/services/admin/.next/static ./services/admin/.next/static
COPY --from=build /app/services/admin/public ./services/admin/public
USER oeh
EXPOSE 3101
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=25s \
  CMD node -e "fetch('http://127.0.0.1:3101/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "services/admin/server.js"]
