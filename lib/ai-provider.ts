export type LegalFeedbackInput = { answer: string; modelAnswer: string; rubric: unknown[] };
export type LegalFeedback = { summary: string; suggestions: string[] };

export interface AIProvider {
  name: string;
  isEnabled(): boolean;
  explain(input: LegalFeedbackInput): Promise<LegalFeedback>;
}

export const disabledAIProvider: AIProvider = {
  name: "disabled",
  isEnabled: () => false,
  async explain() {
    return {
      summary: "A explicação por IA está desativada. A correção determinística por rubrica continua disponível.",
      suggestions: [],
    };
  },
};
