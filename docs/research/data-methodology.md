# Metodologia de dados

## Pipeline

1. Localizar o exame no portal oficial da FGV.
2. Selecionar o padrão definitivo de Direito Penal, nunca resumo de curso ou reprodução de terceiro.
3. Registrar URL, data, número do exame, tipo documental e página.
4. Extrair peça, fase processual, fundamento, prazo, fatos, teses, pedidos e armadilhas.
5. Normalizar teses em IDs estáveis e ligar cada unidade aos exames em que aparece.
6. Modelar exercícios e rubricas com pontuação que nunca exceda o total do item.
7. Marcar `raw`, `parsed`, `reviewed` ou `verified`; somente `verified` entra no treino.

## Esquema editorial

`exam -> professional_piece -> thesis -> rubric_item -> exercise`

- **Exam:** evento, data e fonte oficial.
- **Professional piece:** peça, momento, base, prazo, estrutura e pedidos.
- **Thesis:** conceito reutilizável, elementos factuais, base, efeito, pedidos e confundíveis.
- **Rubric item:** critério atômico com valor e termos verificáveis.
- **Exercise:** prompt, modalidade, resposta, pistas, rubrica e origem.

## Estados e auditoria

- `raw`: documento localizado/baixado;
- `parsed`: campos extraídos;
- `reviewed`: revisão editorial realizada;
- `verified`: conteúdo, página e URL conferidos contra o documento oficial.

O script `npm run validate:data` bloqueia fontes fora do domínio oficial, IDs duplicados, exercícios sem pontuação e itens não verificados. Teses catalogadas sem unidade profunda aparecem como backlog editorial não bloqueante.

## Atualização incremental

Cada novo exame entra como um registro independente. A frequência é calculada no cliente a partir da janela 5, 10 ou 20; não há número manual a desatualizar. Uma alteração no gabarito exige novo `document_type`, data de recuperação e revisão humana antes de promover a `verified`.
