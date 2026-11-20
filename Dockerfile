# Imagem de produção do apps/web (monorepo pnpm).
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile
COPY . .
# Valores fictícios só para o build: generate e next build não conectam no banco.
ENV DATABASE_URL=postgresql://build@localhost/build DIRECT_URL=postgresql://build@localhost/build
RUN pnpm db:generate && pnpm build

FROM base AS runtime
ENV NODE_ENV=production
# shortcut: copia o workspace inteiro (com devDeps, usadas no setup do banco); trocar por output "standalone" se o tamanho da imagem pesar.
COPY --from=build /app /app
USER node
EXPOSE 3000
CMD ["pnpm", "--filter", "web", "start"]
