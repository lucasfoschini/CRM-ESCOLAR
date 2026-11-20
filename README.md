# Belo Ramo CRM — protótipo

Protótipo para demonstração à escola (decisões D-024 e D-026 da documentação do projeto).
**Todos os dados são fictícios** (D-011). Não usar dados reais neste ambiente.

A documentação oficial (requisitos, regras, decisões) fica no vault do Obsidian, em `docs/`.

## O que o protótipo mostra

- **Atendimento:** tela Hoje, funil de atendimentos (kanban e tabela), ficha do atendimento com linha do tempo, mudança de etapa com campos obrigatórios, automação por etapa (ao agendar, cria a tarefa de visita), desinteresse e desqualificado com motivo, matrícula que converte o interessado em aluno sem duplicar responsáveis.
- **Tarefas e agenda:** abas por prazo, concluir com relato, "Sem contato" (reagenda para o dia seguinte), agenda semanal.
- **Escola:** alunos, responsáveis (cadastro único para captação e matriculados) e turmas.
- **WhatsApp (simulado, D-027):** inbox com filtros, conversa ligada ao responsável pelo telefone (ou associação manual), status, nota interna, mensagens rápidas com `/` e modelos com variáveis. Nada é enviado nem recebido de verdade: use "Simular mensagem recebida".

## Limites conhecidos (de propósito)

- **Sem login nem permissões.** "Ver como" só troca o usuário da demonstração. Login, sessões e permissões entram na Fase 3 (D-008, D-009).
- Sem integração real com WhatsApp (só a inbox simulada da D-027), sem portal, comunicados, documentos, dados sensíveis ou financeiro (fora do escopo da D-026).
- Etapas do funil, turmas e motivos são **exemplos**, a validar com a escola.
- Schema provisório: usa `prisma db push`, sem migrations, até o modelo estabilizar.

## Rodar localmente

Requisitos: Node 22+, pnpm 9, PostgreSQL 18 (binários no PATH).

```bash
pnpm install

# Banco local sem serviço do Windows (porta 5433, pasta .pgdata ignorada pelo git)
initdb -D .pgdata -U postgres -A trust -E UTF8 --locale=C
pg_ctl -D .pgdata -o "-p 5433 -c listen_addresses=localhost" -l .pgdata/server.log start
createdb -h localhost -p 5433 -U postgres belo_ramo_dev

cp .env.example .env
pnpm db:push && pnpm db:generate && pnpm db:seed
pnpm dev            # http://localhost:3000
```

Recriar os dados fictícios do zero: `pnpm db:reset`.

### Com Docker

Requisito: Docker Desktop. Não precisa de Node nem Postgres instalados.

```bash
docker compose up -d --build                    # banco + app em http://localhost:3000
docker compose --profile setup run --rm setup   # schema + seed fictício (apaga dados existentes)
docker compose down                             # parar (dados ficam no volume pgdata; -v apaga)
```

Só o banco em Docker, com `pnpm dev` local: `docker compose up -d db` e use o `.env.example` como está (porta 5433).
Portas ocupadas (ex.: Postgres local na 5433)? Troque com `DB_PORT=5434 WEB_PORT=3001 docker compose up -d`.

O `Dockerfile` gera a imagem de produção do `apps/web` e serve para deploy em qualquer host de containers (Render, Fly, VPS). Lá, passe `DATABASE_URL` e `DIRECT_URL` como variáveis de ambiente.

Para usar a branch `dev` do Neon (D-012) em vez do Postgres local, troque `DATABASE_URL` (string pooled) e `DIRECT_URL` (string direta) no `.env`.

## Estrutura

```
apps/web/            Next.js 16 (App Router, Cache Components)
  src/app/(app)/     páginas do painel
  src/modules/       consultas e Server Actions por módulo (captacao, tarefas, cadastro)
  src/components/    componentes de UI
  src/lib/           banco, datas (fuso de São Paulo), rótulos, sessão de demonstração
packages/db/         schema Prisma, cliente e seed fictício
```

Monólito modular em monorepo pnpm (D-004), começando só com `apps/web` e `packages/db`. `packages/core` e `packages/validation` entram quando houver regra compartilhada com o worker.

## Verificação

```bash
pnpm --filter web typecheck && pnpm --filter web lint
```
