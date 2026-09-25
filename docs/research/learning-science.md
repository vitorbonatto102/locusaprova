# Ciência da aprendizagem aplicada

## Princípios e tradução para o produto

| Evidência | O que a literatura sustenta | Decisão na Locus |
|---|---|---|
| Retrieval practice | Recuperar uma resposta melhora retenção de longo prazo mais do que reler passivamente. | O aluno responde antes de ver pista, padrão ou comentário. |
| Spacing | Revisões distribuídas superam prática concentrada; o intervalo útil cresce com a estabilidade. | Cada habilidade recebe `stabilityDays` e `nextReviewAt`; erro volta cedo, domínio estável espaça. |
| Interleaving | Alternar categorias melhora discriminação entre problemas parecidos. | A fila evita repetir a mesma categoria quando existe alternativa. |
| Feedback | Feedback ajuda quando reduz a distância entre resposta atual e critério, sem substituir o raciocínio. | Correção mostra cada critério, crédito parcial, termo ausente e resposta oficial. |
| Faded examples | Exemplos com suporte progressivamente reduzido ajudam a transição para solução independente. | Pistas em camadas: pergunta discriminante, indício factual e base legal. |
| Metacognição | Julgamentos de confiança permitem detectar ilusões de competência. | Confiança é registrada antes da correção; erro com confiança 4–5 ganha prioridade. |
| Worked examples | Exemplos resolvidos reduzem carga inicial, mas devem ceder espaço à prática. | Modelo oficial aparece depois da tentativa e é ligado à rubrica, não usado como abertura da sessão. |

## Fontes primárias

- Roediger e Karpicke demonstraram benefício da testagem para retenção tardia em [*Test-enhanced learning*](https://pubmed.ncbi.nlm.nih.gov/16507066/) (2006).
- Karpicke e Blunt compararam recuperação ativa e estudo elaborativo em [*Retrieval practice produces more learning than elaborative studying*](https://pubmed.ncbi.nlm.nih.gov/21252317/) (2011).
- Cepeda et al. sintetizaram a prática distribuída em [*Distributed practice in verbal recall tasks*](https://www.evullab.org/pdf/CepedaPashlerVulWixtedRohrer-PB-2006.pdf) (2006).
- Dunlosky et al. avaliaram técnicas de estudo em [*Improving Students’ Learning With Effective Learning Techniques*](https://doi.org/10.1177/1529100612453266) (2013).
- Renkl et al. estudaram a retirada gradual de passos em [*From example study to problem solving*](https://www.davidlewisphd.com/courses/EDD8121/readings/2002-Renkl_et_al.pdf) (2002).
- Butler e Winne conectaram feedback e autorregulação em [*Feedback and self-regulated learning*](https://doi.org/10.3102/00346543065003245) (1995).
- Rohrer e Pashler discutiram espaçamento e mistura de problemas em [*Increasing retention without increasing study time*](https://journals.sagepub.com/doi/10.1111/j.1467-8721.2007.00500.x) (2007).

## Guardrails pedagógicos

- O scheduler é heurístico e explicável, não um diagnóstico psicológico.
- Pontuação só deriva de rubrica explícita; confiança altera agenda, não nota.
- Pistas custam independência, mas não escondem arbitrariamente conteúdo.
- O usuário pode consultar a fonte oficial em cada exercício.
- O radar não usa linguagem de “aposta”, “chance” ou previsão de peça.
