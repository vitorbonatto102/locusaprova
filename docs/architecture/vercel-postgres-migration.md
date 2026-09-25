# Next.js, Postgres e preservação do D1

O aplicativo agora usa Next.js padrão (`next dev`, `next build`, `next start`) e Postgres. Não há mais dependência de runtime Cloudflare/Vinext para a aplicação. O diretório `drizzle/` contém o histórico SQLite antigo; `drizzle-postgres/` contém as migrações novas. Não execute as migrações SQLite em Postgres.

## O que já está protegido

- O D1 local original não é alterado pelo transferidor.
- Antes de qualquer importação, o transferidor faz um snapshot consistente em `.migration-backups/`, ignorado pelo Git.
- As tabelas de aplicação no Postgres de destino precisam estar vazias. A importação é transacional e compara as contagens de todas as tabelas copiadas.
- As rotas ainda usam o usuário único `local-learner`. Por segurança, acesso ao banco em qualquer implantação Vercel fica bloqueado até a etapa de autenticação. **Não configure uma publicação pública funcional com dados reais antes de substituir esse usuário fixo por uma identidade verificada.**

## Preparar o banco

Crie um banco Postgres vazio. Para a aplicação em funções serverless da Vercel, use uma conexão com pool transacional; para executar migrações, prefira uma conexão direta ou de sessão. O provedor do banco fornece ambas. Guarde a URL em `.env.local` como `DATABASE_URL`; esse arquivo é ignorado pelo Git. Não cole a senha em issues, mensagens ou commits.

Com `DATABASE_URL` apontando para o banco vazio:

```bash
npm run db:migrate
```

O comando aplica somente `drizzle-postgres/`.

## Preservar e transferir o progresso

Para criar apenas um snapshot do D1 local e conferir quantas linhas ele contém:

```bash
npm run db:transfer -- --backup-only
```

Para transferir esse D1 local ao Postgres vazio:

```bash
npm run db:transfer
```

Se o progresso real estiver em outro arquivo SQLite/D1 exportado, informe o caminho explicitamente:

```bash
npm run db:transfer -- --source caminho/para/exportacao.sqlite
```

O transferidor copia todas as tabelas de aplicação, incluindo usuário, tentativas, domínio, revisões, sessões, simulados e catálogo. Datas em milissegundos do SQLite são convertidas para `timestamp with time zone`; inteiros booleanos são convertidos para booleanos. Se o destino contiver dados ou a estrutura não corresponder, a operação é interrompida sem apagar nem sobrescrever registros. Guarde o arquivo de backup até conferir o app com o Postgres.

## Vercel

Conecte o repositório como projeto Next.js padrão. O build é `npm run build`; não há comando de build específico do Sites. Configure variáveis de ambiente no painel Vercel, nunca no código. A interface está pronta para o build, mas as APIs de dados permanecerão bloqueadas na Vercel até a próxima etapa: autenticação e isolamento por usuário. Depois disso, migre o progresso do `local-learner` para a conta real do proprietário antes de abrir a plataforma a outros alunos.
