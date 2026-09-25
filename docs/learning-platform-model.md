# Modelo da plataforma de aprendizagem

O Locus separa o motor adaptativo do conteúdo específico de cada prova.

```text
exam_family
  └── exam_track
        ├── subject
        │     └── topic
        │           ├── learning_item
        │           └── question
        ├── exam
        └── skill (reutilizável entre tópicos)

user + study_goal
  ├── attempt
  ├── mastery
  ├── error_log
  ├── review
  ├── training_session
  └── simulation
```

## Responsabilidades

- `exam_track`: define o percurso, as capacidades habilitadas e o modo de simulado.
- `subject` e `topic`: organizam a matriz de conteúdo sem codificar uma disciplina no motor.
- `skill`: representa a operação observável, como recordar, distinguir, aplicar, fundamentar ou redigir.
- `learning_item`: unidade treinável, incluindo lei seca, explicação, caso, tese ou roteiro offline.
- `question`: item objetivo ou discursivo com resposta, explicação, fonte e estado de validação.
- `attempt`: evidência imutável de desempenho e confiança.
- `mastery`: estimativa por usuário, percurso e habilidade.
- `review`: fila explícita de revisão espaçada.
- `error_log`: diagnóstico do erro e ligação com o treino corretivo.
- `exam`: definição de prova e estrutura de simulado.
- `study_goal`: prazo, rotina e sinal inicial de dificuldade escolhido no onboarding.

## Regra de disponibilidade

Um percurso pode existir no catálogo com `contentStatus: planned`, mas só pode ser ativado quando estiver `complete`. Assim, a navegação pode apresentar a visão futura do produto sem criar cursos vazios.

## Modos de treino

- `objective-screen`: questões e simulados respondidos na tela.
- `paper-guided`: a plataforma controla tempo e correção; a redação acontece no papel.
- `hybrid`: combina atividades objetivas na tela com etapas discursivas ou práticas fora dela.

O motor usa a dificuldade declarada apenas como sinal inicial. Tentativas, confiança, retenção e erros recorrentes prevalecem na priorização diária.
