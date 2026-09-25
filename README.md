# Locus

Plataforma adaptativa para provas. O aluno escolhe o objetivo; o sistema organiza o que estudar hoje a partir do edital, do domínio observado, dos erros e das revisões. OAB 2ª fase Penal e PF Agente 2025 são as duas verticais reais atuais.

## O que está implementado

- painel diário e sessões curtas adaptativas;
- agenda diária recalculada, leitura ativa e treinos por habilidade;
- modos `Não Confunda`, construção de peça com redução de ajuda e correção por componentes;
- diagnóstico, mapa de domínio, radar histórico, caderno de erros e biblioteca;
- simulado real de 5 horas com escolha entre 20 provas, enunciados, editor, cronômetro, correção lado a lado e histórico;
- persistência Postgres de tentativas, domínio, agenda e erros;
- corpus de 20 exames oficiais (XXVII ao 46º), 20 peças, 80 questões, 100 unidades e 398 critérios oficiais atomizados;
- 77 unidades de tese normalizadas: 20 curadas e 57 geradas a partir dos padrões oficiais;
- interface opcional de provedor de IA, desativada por padrão e sem dependência para correção;
- duas ferramentas WebMCP: iniciar treino e consultar resumo de domínio.
- onboarding genérico OAB/Concursos, com carreira policial e PF Agente 2025;
- edital PF 2025 estruturado em 10 disciplinas, com 5 aprofundadas nesta versão;
- diagnóstico policial de 20 itens autorais, confiança, estratégia Cebraspe e retomada automática;
- árvore de conhecimento reutilizável entre PF e PC-RS, com domínio independente da prova;
- mapa do edital, caderno de erros e revisão antecipada de certezas erradas.

## Executar

Requer Node.js 22.13 ou superior.

Para usar o aplicativo com dados e login, configure `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` em `.env.local` e aplique as migrações Postgres antes de iniciar. Veja [login, Supabase e preservação do progresso](docs/architecture/vercel-postgres-migration.md). O build não exige um banco conectado.

```bash
npm install
npm run dev
```

Abra `http://localhost:5173` para ver a apresentação pública da Locus. Depois do login, a área de estudos fica em `http://localhost:5173/estudar`. Para validar tudo:

```bash
npm run validate:data
npm test
npm run lint
npm run build
```

Para gerar uma nova migração após alterar `db/schema.ts`:

```bash
npm run db:generate
```

## Ingestão FGV

O manifesto já está em `data/fgv-penal-exams.json`. A rotina não publica conteúdo automaticamente.

```bash
npm run ingest:fgv
npm run ingest:fgv -- --download
```

Com `--download`, os PDFs oficiais são verificados pelo cabeçalho, gravados em `data/raw/fgv` e acompanhados por manifesto SHA-256. Os binários são ignorados pelo Git; metadados e fontes permanecem versionados.

## Ingestão de editais e provas objetivas

As rotinas produzem candidatos para revisão e nunca publicam automaticamente:

```bash
npm run ingest:notice -- caminho/edital.pdf https://fonte.oficial/edital.pdf
npm run ingest:exam -- caminho/prova.pdf caminho/gabarito.json https://fonte.oficial/prova.pdf
npm run seed:police
```

## Arquitetura

- `app/locus-app.tsx`: aplicação navegável e jornada de treino;
- `app/api/attempts`: correção, persistência e reagendamento;
- `app/api/progress`: agregados de domínio, erros e tentativas;
- `app/api/daily-plan`: montagem da fila diária por habilidade;
- `app/api/simulations`: correção e histórico de simulados completos;
- `data/exam-units.json`: corpus completo e rastreável de 100 unidades;
- `data/knowledge-graph.json`: relações tese ↔ prova ↔ habilidade ↔ fundamento;
- `lib/learning.mjs`: avaliador, classificador, scheduler e interleaving;
- `lib/adaptive-engine.mjs`: domínio genérico, agenda objetiva, Cebraspe e sobreposição de editais;
- `data/police/`: edital PF, objetivos policiais e banco inicial auditável;
- `db/schema.ts`: modelo Drizzle/Postgres;
- `data/`: catálogo editorial auditável;
- `docs/`: pesquisa, proveniência e decisões de produto.

O sistema usa avaliação determinística como fonte da verdade. Uma futura IA só pode explicar feedback já ancorado na rubrica; ela não altera pontuação, base legal ou proveniência.

## Documentação

- [Padrões FGV](docs/research/fgv-penal-patterns.md)
- [Ciência da aprendizagem](docs/research/learning-science.md)
- [Metodologia dos dados](docs/research/data-methodology.md)
- [Modelo pedagógico do produto](docs/product-learning-model.md)
- [Proveniência e controle editorial](docs/data-provenance.md)
- [Plano de generalização](docs/architecture/generalization-plan.md)
- [Pesquisa PF Agente 2025](docs/research/pf-agent-2025.md)
- [Motor adaptativo genérico](docs/product/adaptive-study-engine.md)
- [Jornada policial](docs/product/police-track.md)

## Limites editoriais

Os 20 padrões têm enunciado, gabarito, proveniência e estrutura de treino. Em 85 unidades a tabela oficial fracionada soma exatamente 5,00 ou 1,25; dez delas foram também verificadas visualmente contra o PDF. Em 15 unidades antigas, o documento oficial não traz tabela fracionada: o total é preservado e os componentes pedagógicos permanecem explicitamente sem pontuação oficial. Frequência histórica é observação, nunca previsão.
