import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// O .env fica na raiz do monorepo, não na pasta deste pacote.
config({ path: "../../.env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: env("DIRECT_URL") },
});
