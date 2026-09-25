# Pesquisa dos padrões FGV — 2ª fase Penal

## Escopo e recorte

A amostra contém 20 padrões oficiais definitivos, do XXVII Exame ao 46º Exame, aplicados entre 20/01/2019 e 21/06/2026. O 47º estava em andamento na data de corte (19/09/2026), portanto o 46º é o exame concluído mais recente. A lista de certames foi conferida no [portal oficial de exames da FGV](https://conhecimento.fgv.br/exames); cada registro aponta diretamente para o respectivo PDF oficial em `data/fgv-penal-exams.json`.

O formato observado permanece estável: uma peça valendo 5,00 pontos e quatro questões de 1,25 ponto, em cinco horas. O dado foi conferido nos cadernos/padrões oficiais; por exemplo, o [39º padrão de Penal](https://oab.fgv.br/arq/642/153378_B005%20-%20DIREITO%20PENAL(CNS25).pdf) e o [46º padrão definitivo](https://oab.fgv.br/arq/649/369161_OAB%2046%20-%20PADR%C3%83O%20DE%20RESPOSTA%20-%20B005%20-%20DIREITO%20PENAL.pdf).

## Frequência de peças

| Peça | Ocorrências | Exames |
|---|---:|---|
| Apelação | 7 | 30, 33, 35, 39, 40, 41, 44 |
| Resposta à acusação | 3 | 36, 42, 46 |
| Alegações finais por memoriais | 3 | 32, 37, 45 |
| Recurso em sentido estrito | 3 | 28, 31, 34 |
| Contrarrazões de apelação | 2 | 27, 43 |
| Agravo em execução | 2 | 29, 38 |

São seis famílias de peça em 20 exames. A apelação representa 35% da amostra, mas isso não autoriza inferir a próxima prova. A plataforma usa a recorrência apenas como um dos fatores de prioridade.

## Padrões de cobrança observados

1. **O momento processual decide a peça.** “Denúncia recebida + citação” aponta à resposta à acusação; “instrução encerrada” conduz a memoriais; “sentença condenatória” exige identificar rito, órgão e recurso.
2. **Artigo isolado não pontua de forma confiável.** As rubricas frequentemente separam tese, fundamento, aplicação ao fato e consequência/pedido. O treino reproduz esses critérios separadamente.
3. **Prazo, idade e datas são fatos jurídicos.** Prescrição, menoridade relativa, prazo do JECRIM e marcos interruptivos exigem cálculo ou classificação, não simples memória verbal.
4. **A consequência integra a resposta.** Reconhecer prova ilícita sem pedir desentranhamento, ou apontar uma nulidade sem indicar o efeito processual, deixa pontos na mesa.
5. **Tesem confundíveis são uma fonte recorrente de erro.** Tentativa × desistência voluntária; erro de tipo permissivo × estado de necessidade real; rejeição da denúncia × absolvição sumária; atenuante × causa de diminuição.
6. **Dosimetria e execução exigem cadeia decisória.** Circunstância, fase da pena, efeito, regime e benefício são corrigidos em itens distintos.

## Taxonomia criada

- identificação de peça e marco processual;
- pressupostos e prazos recursais;
- nulidades, prova e justa causa;
- tipicidade, ilicitude e culpabilidade;
- concurso de crimes e iter criminis;
- dosimetria, regime, substituição e sursis;
- prescrição e execução penal;
- pedidos e consequências jurídicas.

## Limitações

- A amostra é ampla para análise editorial, mas pequena para previsão estatística.
- Mudanças legislativas e jurisprudenciais posteriores ao exame não reescrevem o que a FGV efetivamente pontuou; são tratadas em revisão editorial separada.
- O catálogo registra todas as teses encontradas, mas a unidade didática profunda foi priorizada para 20 teses de maior utilidade transversal.
- A extração é semi-automatizada e toda alteração que chega ao status `verified` requer conferência humana do PDF e da página.
