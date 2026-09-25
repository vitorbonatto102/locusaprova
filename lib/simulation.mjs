export function evaluateSelfAssessment(rubric = [], selectedIndexes = []) {
  const selected = new Set(selectedIndexes.filter((index) => Number.isInteger(index)));
  const criteria = rubric.map((criterion, index) => {
    const met = selected.has(index);
    return {
      criterion: criterion.criterion,
      earned: met ? criterion.points : 0,
      possible: criterion.points,
      met,
      matchedTerms: [],
      missingTerms: [],
    };
  });
  const score = Math.round(criteria.reduce((sum, item) => sum + item.earned, 0) * 100) / 100;
  const maxScore = Math.round(rubric.reduce((sum, item) => sum + item.points, 0) * 100) / 100;
  return { score, maxScore, ratio: maxScore ? score / maxScore : 0, criteria };
}
