/**
 * Multi-Criteria Decision Making (MCDM) Emergency Triage Core
 * Shared single source of truth for both server-side evaluation and client-side simulation.
 */

export interface TriageEvaluation {
  score: number;
  rank: 'Critical' | 'High' | 'Medium' | 'Low';
  explanation: string;
  reasons: string[];
}

export function evaluateTriagePriority(
  type: string,
  severity: string,
  battery: number,
  groupSize: number,
  environment: string
): TriageEvaluation {
  let score = 0;
  const reasons: string[] = [];

  // Battery drain vulnerability factor
  if (battery < 10) {
    score += 25;
    reasons.push(`CRITICAL battery (${battery}%) - imminent communication blackout.`);
  } else if (battery < 20) {
    score += 20;
    reasons.push(`Low battery (${battery}%) - estimated 15-30min survival window.`);
  } else if (battery < 40) {
    score += 10;
    reasons.push(`Battery at ${battery}% - monitoring drain curve.`);
  }

  // Disaster hazard severity coefficient
  const typeScores: Record<string, number> = {
    Trapped: 30,
    Earthquake: 30,
    Fire: 28,
    Chemical: 28,
    Flood: 22,
    Medical: 20,
  };
  const typeMessages: Record<string, string> = {
    Trapped: 'Victim physically trapped under structural collapse.',
    Earthquake: 'Earthquake aftermath with high aftershock risk.',
    Fire: 'Active fire/smoke hazard with rapid spread probability.',
    Chemical: 'HAZMAT chemical exposure detected.',
    Flood: 'Rapidly rising water level with submersion risk.',
    Medical: 'Requires urgent paramedic trauma intervention.',
  };

  score += typeScores[type] || 15;
  reasons.push(typeMessages[type] || `Emergency type: ${type}`);

  // Individual physiological severity
  if (severity === 'Severe') {
    score += 20;
    reasons.push('Severity: CRITICAL - Life-threatening condition.');
  } else if (severity === 'Moderate') {
    score += 10;
    reasons.push('Severity: MODERATE - Requires prompt attention.');
  } else {
    score += 3;
    reasons.push('Severity: MINOR - Stable but needs assistance.');
  }

  // Group casualty multiplier
  if (groupSize > 5) {
    score += 15;
    reasons.push(`Group of ${groupSize} people - Mass casualty protocol.`);
  } else if (groupSize > 2) {
    score += 8;
    reasons.push(`Group of ${groupSize} people at location.`);
  } else if (groupSize > 1) {
    score += 4;
    reasons.push(`${groupSize} people reported at location.`);
  }

  // Environmental adversity modifier
  if (environment === 'Night') {
    score += 8;
    reasons.push('Nighttime operation - reduced visibility, higher search risk.');
  } else if (environment === 'Rain') {
    score += 6;
    reasons.push('Heavy rain/storm conditions complicating rescue operations.');
  } else if (environment === 'Extreme_Heat') {
    score += 5;
    reasons.push('Extreme heat - dehydration and heatstroke risk elevated.');
  }

  score = Math.min(score, 100);

  let rank: 'Critical' | 'High' | 'Medium' | 'Low' = 'Low';
  if (score >= 70) rank = 'Critical';
  else if (score >= 45) rank = 'High';
  else if (score >= 25) rank = 'Medium';

  return {
    score,
    rank,
    explanation: reasons.join(' '),
    reasons,
  };
}
