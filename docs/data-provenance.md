# Proveniência, direitos e controle editorial

## Fontes

Todo conteúdo factual de prova aponta a um PDF no domínio `oab.fgv.br`. O repositório guarda metadados, sínteses próprias, tags e pequenas estruturas de rubrica; não redistribui automaticamente os PDFs. O comando de download existe para pesquisa interna reproduzível e gera hash SHA-256.

## Direitos e uso responsável

- não reproduzir cadernos integrais em páginas públicas;
- manter links para os originais e atribuição à FGV/OAB;
- usar os textos integrais somente no ambiente privado de estudo e manter atribuição e link oficial;
- permitir retirada ou correção editorial sem quebrar IDs históricos;
- revisar regras de uso da fonte antes de qualquer exploração comercial em escala.

## Controle de qualidade

| Campo | Regra |
|---|---|
| `source_url` | HTTPS e domínio oficial |
| `page_reference` | página conferida no PDF |
| `review.status` | `machine_checked`, `manual_verified` ou `machine_checked_no_fractional_table` |
| rubrica oficial | soma exata de 5,00 ou 1,25 quando a tabela existe |
| decomposição pedagógica | explicitamente não pontuada quando a tabela oficial não existe |
| previsão | proibida; frequência é apenas descritiva |
| atualização jurídica | revisão editorial separada do registro histórico da FGV |

## Situação da base

- 20 exames com peça, momento, prazo, teses, pedidos e armadilhas;
- 100 unidades: 20 peças e 80 questões, todas com enunciado, gabarito e fonte;
- 398 critérios oficiais atomizados;
- 75 unidades conferidas por soma automática, 10 por soma e inspeção visual e 15 sem fração oficial;
- 20 unidades de tese curadas + 57 unidades antes ausentes geradas e rastreadas;
- relatório reproduzível em `docs/qa/legal-data-report.md` e amostra manual em `docs/qa/manual-rubric-sample.md`.
