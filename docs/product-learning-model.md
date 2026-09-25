# Modelo pedagógico do produto

## Jornada principal

1. O usuário informa data-alvo e tempo por sessão.
2. Um diagnóstico curto amostra peça, tese, fundamento, estrutura e discursiva.
3. A fila diária combina itens vencidos, domínio baixo, recorrência histórica e erros confiantes.
4. O usuário responde e registra confiança antes de ver qualquer resposta.
5. A rubrica concede crédito parcial por critério.
6. O scheduler atualiza domínio, estabilidade e data da próxima revisão.
7. Erros viram objetos revisáveis no caderno, não apenas uma nota perdida.

## Heurística de prioridade

`prioridade = 45 × lacuna_de_domínio + 20 × risco_de_esquecimento + 18 × erro_confiante + 8 × repetição_de_erro + 4 × recência + 5 × recorrência_histórica`

Domínio e esquecimento respondem por 65% da escala antes dos bônus; recorrência histórica fica limitada a 5%. Os pesos são parâmetros auditáveis, não uma alegação científica de otimalidade. A fila é intercalada e rotacionada por data para evitar repetição imediata.

## Scheduler

- erro com confiança 4–5: revisão em aproximadamente seis horas;
- domínio baixo: estado `learning` e intervalo curto;
- domínio intermediário: estado `review` e intervalo mínimo de três dias;
- domínio ≥ 86%: estado `mastered` e intervalo mínimo de sete dias;
- cada nova tentativa combina 72% do domínio anterior com 28% da qualidade atual.

## Correção

A rubrica determinística normaliza acentos e pontuação, procura evidências mínimas por critério e concede fração proporcional quando há mais de um elemento obrigatório. Ela informa pontos deixados e agenda corretivo. Não “entende” mérito jurídico aberto; por isso cada exercício exibe o padrão oficial e a página para autoauditoria. Se a FGV não publicou frações, pesos pedagógicos aparecem como tais e nunca são atribuídos à banca.

Uma IA futura pode reescrever o feedback em linguagem natural, mas não pode alterar nota, gabarito, artigo ou agenda sem validação determinística.

## Métricas de qualidade

- retenção por habilidade após 7 e 21 dias;
- redução de erros de alta confiança;
- cobertura tese + fato + fundamento + consequência;
- transferência entre exames, não repetição literal;
- tempo para identificar peça e estruturar pedidos;
- abandono por duração de sessão.
