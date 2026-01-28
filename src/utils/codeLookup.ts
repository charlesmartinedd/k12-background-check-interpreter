import violentFelonies from '../data/ca-violent-felonies.json';
import seriousFelonies from '../data/ca-serious-felonies.json';
import penalCodes from '../data/ca-penal-codes.json';
import ncicCodes from '../data/ncic-codes.json';

export type DisqualificationStatus =
  | 'mandatory-disqualifier'
  | 'has-exemption-path'
  | 'review-required'
  | 'non-disqualifying'
  | 'unknown';

export interface OffenseInfo {
  code: string;
  statute?: string;
  description: string;
  category: string;
  k12Impact: DisqualificationStatus;
  citations?: string[];
  note?: string;
  isViolentFelony: boolean;
  isSeriousFelony: boolean;
  exemptionAvailable: boolean;
}

export interface ParsedCode {
  rawCode: string;
  normalizedCode: string;
  statute: string;
  subdivision?: string;
}

/**
 * Parse a code string into its components
 * Handles formats like: "484 PC", "PC 484", "667.5(c) PC", "1301" (NCIC)
 */
export function parseCodeString(input: string): ParsedCode {
  const cleaned = input.trim().toUpperCase();

  // Check if it's a pure NCIC code (4 digits)
  if (/^\d{4}$/.test(cleaned)) {
    return {
      rawCode: input,
      normalizedCode: cleaned,
      statute: 'NCIC'
    };
  }

  // Pattern: "123.45(a)(1) PC" or "PC 123.45(a)(1)"
  const codePattern = /^(?:(\w+)\s+)?(\d+(?:\.\d+)?(?:\([a-z0-9]+\))*)(?:\s+(\w+))?$/i;
  const match = cleaned.match(codePattern);

  if (match) {
    const prefix = match[1] || '';
    const codeNum = match[2];
    const suffix = match[3] || '';

    // Extract base code and subdivision
    const baseMatch = codeNum.match(/^(\d+(?:\.\d+)?)((?:\([a-z0-9]+\))*)$/i);
    const baseCode = baseMatch ? baseMatch[1] : codeNum;
    const subdivision = baseMatch && baseMatch[2] ? baseMatch[2] : undefined;

    // Determine statute type
    let statute = 'PC'; // Default to Penal Code
    if (prefix === 'VC' || suffix === 'VC') statute = 'VC';
    else if (prefix === 'HS' || suffix === 'HS') statute = 'HS';
    else if (prefix === 'PC' || suffix === 'PC') statute = 'PC';
    else if (prefix === 'BP' || suffix === 'BP') statute = 'BP';
    else if (prefix === 'WI' || suffix === 'WI') statute = 'WI';
    else if (prefix || suffix) statute = prefix || suffix;

    return {
      rawCode: input,
      normalizedCode: baseCode,
      statute,
      subdivision
    };
  }

  // Fallback: just return as-is
  return {
    rawCode: input,
    normalizedCode: cleaned.replace(/\s+/g, ''),
    statute: 'UNKNOWN'
  };
}

/**
 * Look up an offense code and return detailed information
 */
export function lookupCode(input: string): OffenseInfo {
  const parsed = parseCodeString(input);

  // Check if it's an NCIC code
  if (parsed.statute === 'NCIC' || /^\d{4}$/.test(parsed.normalizedCode)) {
    const ncicInfo = (ncicCodes.codes as Record<string, any>)[parsed.normalizedCode];
    if (ncicInfo) {
      return {
        code: parsed.normalizedCode,
        statute: 'NCIC',
        description: ncicInfo.description,
        category: ncicInfo.category,
        k12Impact: ncicInfo.k12Impact as DisqualificationStatus,
        isViolentFelony: ncicInfo.k12Impact === 'mandatory-disqualifier' &&
          ['Homicide', 'Sex Offense', 'Kidnapping', 'Robbery'].includes(ncicInfo.category),
        isSeriousFelony: ncicInfo.k12Impact === 'mandatory-disqualifier',
        exemptionAvailable: ncicInfo.k12Impact === 'review-required'
      };
    }
  }

  // Check California Penal Code reference
  const penalInfo = (penalCodes.codes as Record<string, any>)[parsed.normalizedCode];

  // Check violent felonies list
  const violentMatch = violentFelonies.offenses.find(
    o => o.code === parsed.normalizedCode
  );

  // Check serious felonies list
  const seriousMatch = seriousFelonies.offenses.find(
    o => o.code === parsed.normalizedCode
  );

  const isViolentFelony = !!violentMatch;
  const isSeriousFelony = !!seriousMatch;

  // Determine K-12 impact
  let k12Impact: DisqualificationStatus = 'unknown';
  let citations: string[] = [];
  let note: string | undefined;
  let description = `${parsed.statute} ${parsed.normalizedCode}`;
  let category = 'Other';

  if (penalInfo) {
    description = penalInfo.description;
    category = penalInfo.category;
    k12Impact = penalInfo.k12Impact as DisqualificationStatus;
    citations = penalInfo.citations || [];
    note = penalInfo.note;
  }

  // Override with specific felony information
  if (violentMatch) {
    description = violentMatch.description;
    category = 'Violent Felony';
    k12Impact = 'mandatory-disqualifier';
    citations.push(`PC 667.5${violentMatch.subdivision}`);
    if (violentMatch.note) note = violentMatch.note;
  }

  if (seriousMatch && !violentMatch) {
    description = seriousMatch.description;
    category = 'Serious Felony';
    k12Impact = seriousMatch.alsoViolent ? 'mandatory-disqualifier' : 'has-exemption-path';
    citations.push(`PC 1192.7${seriousMatch.subdivision}`);
    if (seriousMatch.note) note = seriousMatch.note;
  }

  // Deduplicate citations
  citations = [...new Set(citations)];

  return {
    code: `${parsed.normalizedCode}${parsed.subdivision || ''}`,
    statute: parsed.statute,
    description,
    category,
    k12Impact,
    citations: citations.length > 0 ? citations : undefined,
    note,
    isViolentFelony,
    isSeriousFelony,
    exemptionAvailable: k12Impact === 'has-exemption-path' ||
      (isSeriousFelony && !isViolentFelony)
  };
}

/**
 * Look up multiple codes at once
 */
export function lookupCodes(codes: string[]): OffenseInfo[] {
  return codes.map(code => lookupCode(code));
}

/**
 * Get a list of all known codes for autocomplete purposes
 */
export function getKnownCodes(): { code: string; description: string }[] {
  const codes: { code: string; description: string }[] = [];

  // Add CA Penal Codes
  for (const [code, info] of Object.entries(penalCodes.codes as Record<string, any>)) {
    codes.push({ code: `${code} PC`, description: info.description });
  }

  // Add NCIC codes
  for (const [code, info] of Object.entries(ncicCodes.codes as Record<string, any>)) {
    codes.push({ code, description: info.description });
  }

  return codes;
}
