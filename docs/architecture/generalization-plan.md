# Plano de generalização

## Decisão central

O motor de aprendizagem não pertence à OAB nem à PF. Conteúdo, edital e formato de prova são configuração. Tentativas, erros, revisões e domínio são capacidades compartilhadas.

O domínio da nova arquitetura é identificado por `user_id + knowledge_node_id`. Ele não contém `exam_id`. Uma troca de PF para PC-RS preserva a evidência em Penal, Processo Penal, Constitucional e demais nós comuns; o novo edital apenas altera o conjunto exigido e sua relevância.

## Camadas

1. **Catálogo de provas:** categoria, carreira, instituição, cargo, banca, edital e objetivo.
2. **Árvore de conhecimento:** disciplina, tópico e subtópico com proveniência editorial.
3. **Configuração do edital:** relação entre objetivo e nós exigidos, bloco e página-fonte.
4. **Banco de itens:** questão, formato, fonte, gabarito, explicação e revisão.
5. **Aprendizagem:** tentativa, confiança, erro, domínio e revisão.
6. **Apresentação:** jornadas específicas para OAB discursiva e concurso objetivo.

As tabelas legadas da OAB permanecem durante a migração. A vertical policial usa as tabelas genéricas e funciona como prova da separação.

## Teste de generalização

PF Agente 2025 é o objetivo ativo. PC-RS Inspetor 2025 está cadastrado apenas como teste estrutural. A função de sobreposição compara os conjuntos de nós e identifica base aproveitada, conteúdo novo e conteúdo que deixa de ser exigido. Nenhum percentual de “prontidão” é mostrado sem desempenho do usuário.

## Próximos passos

- aumentar o banco validado da PF sem alterar o modelo;
- ingerir e revisar um edital completo de Polícia Civil;
- migrar gradualmente o domínio legado da OAB para a mesma árvore;
- adicionar versionamento jurídico e rotina de revalidação de questões afetadas.
