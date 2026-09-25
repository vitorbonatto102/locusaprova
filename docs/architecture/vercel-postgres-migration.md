# Next.js, Supabase e preservação do progresso

O Locus roda em Next.js padrão na Vercel. Supabase Auth gerencia o cadastro/login; o Postgres do mesmo projeto guarda o progresso. A aplicação usa acesso ao banco **somente pelo servidor**, filtrando cada leitura e gravação pelo ID verificado da conta. As 34 tabelas do Locus ficam no schema `locus`; o schema `public` e as tabelas de licenças de outro produto não são alterados.

## Configurar o projeto Supabase

1. No projeto `xbqwmydckectglcnmoya`, confira em **Authentication → Providers** que e-mail/senha está habilitado. Não crie manualmente tabelas em `auth.users`: Supabase Auth faz isso quando alguém se cadastra.
2. Em **Project Settings → API Keys** (ou **Connect**), copie a **Project URL** e a **publishable key**. A publishable key é própria para o navegador. Nunca use a `service_role` ou secret key nas variáveis `NEXT_PUBLIC_*`.
3. Em **Connect**, obtenha a URI Postgres. Use a conexão direta ou session pooler para aplicar migrações e importar dados. Para o runtime da Vercel, use o transaction pooler apropriado a funções serverless. A senha fica apenas em `.env.local` e nas variáveis privadas da Vercel, nunca no Git ou em mensagens.
4. Em **Authentication → URL Configuration**, defina `https://locusaprova.vercel.app` como **Site URL** e permita `http://localhost:5173/auth/callback` e `https://locusaprova.vercel.app/auth/callback` em **Redirect URLs**. A URL de produção deve usar HTTPS.
5. Para oferecer cadastro por e-mail ao público, configure um **SMTP próprio**. O SMTP padrão do Supabase é restrito e serve apenas para testes com endereços autorizados no projeto.

Crie `.env.local` na raiz do projeto, a partir de `.env.example`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://xbqwmydckectglcnmoya.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
DATABASE_URL=<URI Postgres do projeto>
```

O projeto de licenças e o Locus **compartilharão o cadastro de usuários do Supabase Auth**. Isso é aceitável aqui porque o outro projeto é só de teste. O progresso de cada app fica em suas próprias tabelas. Não exponha o schema `locus` na Data API do Supabase; o Locus usa acesso server-side e suas próprias rotas autenticadas.

## Criar as tabelas e trazer o D1

O histórico SQLite antigo continua em `drizzle/`; somente `drizzle-postgres/` se aplica ao Postgres. A migração inicial cria o schema `locus` e 34 tabelas. Ela não contém comandos para apagar tabelas existentes.

```bash
npm run db:migrate
npm run db:transfer -- --backup-only
npm run db:transfer
```

O transferidor não altera o D1 original. Primeiro cria snapshot consistente em `.migration-backups/` (ignorado pelo Git); depois verifica estrutura, exige tabelas de destino vazias e importa numa transação. Confere as contagens antes de confirmar. Se o D1 real estiver em outro arquivo, use `npm run db:transfer -- --source caminho/para/exportacao.sqlite`.

O D1 antigo usa o ID `local-learner`. **Não abra o site para outras pessoas antes de associar esse progresso à sua conta.** Cadastre sua própria conta no Supabase Auth e confirme o e-mail. Em **Authentication → Users**, copie o UUID dessa conta. Configure em `.env.local` (somente local):

```dotenv
LEGACY_OWNER_USER_ID=<UUID da sua conta>
LEGACY_OWNER_EMAIL=<e-mail dessa mesma conta>
```

Confira a prévia e depois faça a associação:

```bash
npm run db:claim
npm run db:claim -- --apply
```

O comando verifica UUID e e-mail contra `auth.users`, recusa uma conta que já tenha progresso e transfere os registros numa transação. O backup D1 permanece intacto.

## Vercel

Conecte o repositório como projeto Next.js padrão. Configure as três variáveis de execução (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`) no painel da Vercel. Não coloque `LEGACY_OWNER_*` na Vercel: servem apenas para a migração local. Execute as migrações e a importação uma vez, fora do build da Vercel, antes de liberar o site. O login e as APIs dependem do banco já criado; o build sozinho não configura o Supabase.
