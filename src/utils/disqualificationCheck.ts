import type { OffenseInfo, DisqualificationStatus } from './codeLookup';

export interface DisqualificationAnalysis {
  overallStatus: DisqualificationStatus;
  mandatoryDisqualifiers: OffenseInfo[];
  hasExemptionPath: OffenseInfo[];
  nonDisqualifying: OffenseInfo[];
  recommendations: string[];
  educationalResources: EducationalResource[];
}

export interface EducationalResource {
  title: string;
  description: string;
  type: 'statute' | 'process' | 'resource';
  url?: string;
}

export interface DecisionFrameworkQuestion {
  id: string;
  question: string;
  guidance: string;
  relevantFor: DisqualificationStatus[];
}

/**
 * Decision framework questions for HR professionals
 * These are questions to consider for non-disqualifying offenses
 */
export const decisionFrameworkQuestions: DecisionFrameworkQuestion[] = [
  {
    id: 'time-elapsed',
    question: 'How much time has elapsed since the offense?',
    guidance: 'Consider the time since the offense occurred. Older offenses, especially those 7+ years ago, may indicate rehabilitation. California law limits how far back employers can consider most convictions.',
    relevantFor: ['non-disqualifying', 'has-exemption-path']
  },
  {
    id: 'job-relatedness',
    question: 'Is the offense related to the job duties?',
    guidance: 'Consider whether the nature of the offense has a direct connection to the responsibilities of the position. For example, a financial crime may be more relevant for a position handling school funds.',
    relevantFor: ['non-disqualifying', 'has-exemption-path']
  },
  {
    id: 'disposition',
    question: 'What was the final disposition of the case?',
    guidance: 'Review whether the case resulted in conviction, dismissal, deferred judgment, or acquittal. Dismissed cases and deferred judgments that were successfully completed carry different weight.',
    relevantFor: ['non-disqualifying', 'has-exemption-path']
  },
  {
    id: 'rehabilitation',
    question: 'Is there evidence of rehabilitation?',
    guidance: 'Look for evidence of rehabilitation such as: completed education programs, stable employment history, community involvement, letters of recommendation, or a Certificate of Rehabilitation.',
    relevantFor: ['non-disqualifying', 'has-exemption-path']
  },
  {
    id: 'honesty',
    question: 'Was the applicant honest about their history?',
    guidance: 'Consider whether the applicant disclosed their criminal history when asked. Honesty and transparency can be indicators of character and trustworthiness.',
    relevantFor: ['non-disqualifying', 'has-exemption-path']
  },
  {
    id: 'circumstances',
    question: 'Are there mitigating circumstances?',
    guidance: 'Consider any context around the offense: age at the time, circumstances that led to the offense, whether it was an isolated incident or part of a pattern.',
    relevantFor: ['non-disqualifying', 'has-exemption-path']
  },
  {
    id: 'position-type',
    question: 'What level of student contact does this position involve?',
    guidance: 'Consider the degree of supervision the employee will have over students. Positions with direct, unsupervised student contact warrant more careful review.',
    relevantFor: ['non-disqualifying', 'has-exemption-path']
  }
];

/**
 * Educational resources about exemptions and rehabilitation
 */
export const educationalResources: EducationalResource[] = [
  {
    title: 'Certificate of Rehabilitation',
    description: 'A court order declaring that a person convicted of a felony is rehabilitated. Available to felony offenders after serving their sentence and maintaining a crime-free life. Can lead to a Governor\'s pardon.',
    type: 'process',
    url: 'https://www.courts.ca.gov/1044.htm'
  },
  {
    title: 'Governor\'s Pardon',
    description: 'A pardon from the Governor restores civil and political rights and may remove disqualifications for employment. It does not erase the conviction but recognizes rehabilitation.',
    type: 'process',
    url: 'https://www.gov.ca.gov/clemency/'
  },
  {
    title: 'Education Code 44830.1',
    description: 'Defines disqualifying offenses for certificated K-12 employees (teachers, administrators). Lists violent and serious felonies that bar employment.',
    type: 'statute',
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=44830.1&lawCode=EDC'
  },
  {
    title: 'Education Code 45122.1',
    description: 'Defines disqualifying offenses for classified K-12 employees (support staff). Lists the same violent and serious felonies that bar employment.',
    type: 'statute',
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=45122.1&lawCode=EDC'
  },
  {
    title: 'California Fair Chance Act',
    description: 'Prohibits employers from asking about criminal history before a conditional offer. Requires individualized assessment before rescinding offers based on criminal history.',
    type: 'resource',
    url: 'https://calcivilrights.ca.gov/fair-chance-act/'
  },
  {
    title: 'Penal Code 667.5(c) - Violent Felonies',
    description: 'The complete list of offenses defined as "violent felonies" under California law. These are mandatory disqualifiers for K-12 employment.',
    type: 'statute',
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=667.5.&lawCode=PEN'
  },
  {
    title: 'Penal Code 1192.7(c) - Serious Felonies',
    description: 'The complete list of offenses defined as "serious felonies" under California law. These are mandatory disqualifiers for K-12 employment.',
    type: 'statute',
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1192.7&lawCode=PEN'
  }
];

/**
 * Analyze a list of offenses and determine overall disqualification status
 * Maps review-required and unknown to has-exemption-path for consistency
 */
export function analyzeOffenses(offenses: OffenseInfo[]): DisqualificationAnalysis {
  // Map review-required and unknown to has-exemption-path
  const normalizedOffenses = offenses.map(o => ({
    ...o,
    k12Impact: (o.k12Impact === 'review-required' as any || o.k12Impact === 'unknown')
      ? 'has-exemption-path' as DisqualificationStatus
      : o.k12Impact
  }));

  const mandatoryDisqualifiers = normalizedOffenses.filter(o => o.k12Impact === 'mandatory-disqualifier');
  const hasExemptionPath = normalizedOffenses.filter(o => o.k12Impact === 'has-exemption-path');
  const nonDisqualifying = normalizedOffenses.filter(o => o.k12Impact === 'non-disqualifying');

  // Determine overall status
  let overallStatus: DisqualificationStatus;
  if (mandatoryDisqualifiers.length > 0) {
    overallStatus = 'mandatory-disqualifier';
  } else if (hasExemptionPath.length > 0) {
    overallStatus = 'has-exemption-path';
  } else {
    overallStatus = 'non-disqualifying';
  }

  // Generate recommendations based on findings
  const recommendations: string[] = [];

  if (mandatoryDisqualifiers.length > 0) {
    recommendations.push(
      'One or more offenses are mandatory disqualifiers under California Education Code 44830.1 or 45122.1.'
    );
    recommendations.push(
      'Check if the applicant has obtained a Certificate of Rehabilitation and Pardon, which may provide an exemption.'
    );
    recommendations.push(
      'Consult with legal counsel before making a final determination.'
    );
  }

  if (hasExemptionPath.length > 0 && mandatoryDisqualifiers.length === 0) {
    recommendations.push(
      'Some offenses may have exemption pathways available.'
    );
    recommendations.push(
      'Request documentation of any Certificate of Rehabilitation or court findings of rehabilitation.'
    );
    recommendations.push(
      'Use the decision framework questions to guide individualized assessment.'
    );
  }

  if (nonDisqualifying.length > 0 && mandatoryDisqualifiers.length === 0 && hasExemptionPath.length === 0) {
    recommendations.push(
      'The offenses found are not automatic disqualifiers for K-12 employment.'
    );
    recommendations.push(
      'Consider using the decision framework for a fair, individualized assessment.'
    );
  }

  if (offenses.length === 0) {
    recommendations.push(
      'No criminal offenses were identified in the analysis.'
    );
  }

  // Select relevant educational resources
  const relevantResources = educationalResources.filter(resource => {
    if (mandatoryDisqualifiers.length > 0) {
      return ['Certificate of Rehabilitation', 'Governor\'s Pardon', 'Education Code 44830.1', 'Education Code 45122.1'].includes(resource.title);
    }
    if (hasExemptionPath.length > 0) {
      return true;
    }
    if (nonDisqualifying.length > 0) {
      return ['California Fair Chance Act'].includes(resource.title);
    }
    return false;
  });

  return {
    overallStatus,
    mandatoryDisqualifiers,
    hasExemptionPath,
    nonDisqualifying,
    recommendations,
    educationalResources: relevantResources
  };
}

/**
 * Get relevant decision framework questions based on offense status
 */
export function getRelevantQuestions(status: DisqualificationStatus): DecisionFrameworkQuestion[] {
  return decisionFrameworkQuestions.filter(q => q.relevantFor.includes(status));
}

/**
 * Get the display color class for a disqualification status
 */
export function getStatusColor(status: DisqualificationStatus): string {
  switch (status) {
    case 'mandatory-disqualifier':
      return 'alert';
    case 'has-exemption-path':
      return 'warning';
    case 'non-disqualifying':
      return 'success';
    default:
      return 'warning';
  }
}

/**
 * Get human-readable label for disqualification status
 */
export function getStatusLabel(status: DisqualificationStatus): string {
  switch (status) {
    case 'mandatory-disqualifier':
      return 'Mandatory Disqualifier';
    case 'has-exemption-path':
      return 'Exemption Path Available';
    case 'non-disqualifying':
      return 'Not Disqualifying';
    default:
      return 'Exemption Path Available';
  }
}
