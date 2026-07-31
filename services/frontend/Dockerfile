# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json tsconfig.json ./
COPY packages/shared ./packages/shared
COPY services/frontend ./services/frontend
RUN npm ci
RUN npm run build --workspace=@openeventhub/shared \
  && npm run build --workspace=@openeventhub/frontend

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3100
RUN useradd --create-home --uid 10001 oeh
COPY --from=build /app/services/frontend/.next/standalone ./
COPY --from=build /app/services/frontend/.next/static ./services/frontend/.next/static
COPY --from=build /app/services/frontend/public ./services/frontend/public
USER oeh
EXPOSE 3100
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=25s \
  CMD node -e "fetch('http://127.0.0.1:3100/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "services/frontend/server.js"]
