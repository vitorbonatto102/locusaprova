# Motor de estudo adaptativo

## Evidência coletada

Cada resposta registra correção, saldo conforme a banca, confiança de 1 a 5, duração, questão, tópicos e tipo de sessão. O sistema separa nota da prova de sinal pedagógico: uma certeza errada reduz estabilidade e antecipa revisão.

## Atualização de domínio

O domínio começa sem estimativa. A primeira evidência produz uma atualização conservadora e nunca transforma um acerto isolado em 100%. Taxa de aprendizagem diminui conforme o número de evidências cresce. Acertos aumentam estabilidade; erros a reduzem.

Estados: `unseen`, `learning`, `developing` e `stable`. Agregações de disciplina consideram apenas tópicos medidos e exibem explicitamente a cobertura da amostra.

## Fila diária

A pontuação interna combina:

- revisão vencida;
- lacuna de domínio;
- esquecimento relativo à estabilidade;
- falta de evidência;
- dificuldade;
- exposição recente;
- tempo disponível;
- alternância de matérias.

O diagnóstico é balanceado por matéria. Sessões ativas são retomadas do índice persistido, inclusive após sair da página.

## Erros

Erros são inicialmente classificados como lacuna, falha de raciocínio ou modelo mental incorreto. Confiança alta sugere `misconception`. O aluno pode recategorizar como leitura ou atenção. Todo erro cria revisão; alta confiança usa intervalo menor.
