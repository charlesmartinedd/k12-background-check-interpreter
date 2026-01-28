# K-12 Background Check Interpreter

A privacy-first web application that helps K-12 HR professionals interpret DOJ/FBI background check codes and make informed, fair employment decisions.

## Features

- **Privacy First**: All data processing happens in-browser. No data is stored, transmitted, or saved.
- **Code Translation**: Translates California Penal Codes, Health & Safety Codes, Vehicle Codes, and NCIC codes into plain English.
- **K-12 Disqualification Analysis**: Automatically identifies mandatory disqualifiers under California Education Code 44830.1 and 45122.1.
- **Decision Framework**: Provides structured questions for HR professionals to conduct fair, individualized assessments.
- **Exemption Pathways**: Information about Certificate of Rehabilitation and other exemption options.
- **Restorative Justice Focus**: Not all convictions disqualify candidates - the app educates HR on what truly matters.

## Supported Code Types

- **California Penal Code (PC)**: e.g., `484 PC`, `211 PC`, `459 PC`
- **Health & Safety Code (HS)**: e.g., `11350 HS`, `11377 HS`
- **Vehicle Code (VC)**: e.g., `23152 VC`
- **NCIC Codes**: 4-digit uniform offense codes

## Disqualification Categories

| Category | Description | Example |
|----------|-------------|---------|
| Mandatory Disqualifier | Violent felonies (PC 667.5(c)) and serious felonies (PC 1192.7(c)) | Murder, Rape, Robbery |
| Exemption Available | Serious felonies with rehabilitation pathways | Some PC 1192.7(c) offenses |
| Review Required | Offenses needing individualized assessment | Drug sales, some weapons charges |
| Non-Disqualifying | Offenses that don't bar K-12 employment | Petty theft, DUI, simple drug possession |

## Tech Stack

- React + TypeScript
- Tailwind CSS (v4)
- Vite
- PDF.js (client-side PDF parsing)
- Playwright (testing)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Usage

1. **Manual Entry**: Enter offense codes separated by commas (e.g., `484 PC, 23152 VC, 11377 HS`)
2. **PDF Upload**: Upload a California DOJ RAP sheet - only offense codes are extracted (no PII)
3. **Review Results**: See each offense categorized with plain-English descriptions
4. **Use Decision Framework**: For non-disqualifying offenses, use the guided questions for fair assessment
5. **Clear All**: Click to reset before processing the next background check

## Privacy & Compliance

- **No Server**: All processing happens client-side
- **No Storage**: Data cleared on page refresh or manual clear
- **No PII Extraction**: PDF parser extracts ONLY offense codes, ignoring names, DOB, addresses
- **FERPA/HIPAA**: Background checks are employee records, not student or health records

## Legal References

- [CA Education Code 44830.1](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=44830.1&lawCode=EDC) - Certificated employee disqualification
- [CA Education Code 45122.1](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=45122.1&lawCode=EDC) - Classified employee disqualification
- [CA Penal Code 667.5(c)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=667.5.&lawCode=PEN) - Violent felony definitions
- [CA Penal Code 1192.7(c)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1192.7&lawCode=PEN) - Serious felony definitions

## Disclaimer

This tool is for educational purposes only. It does not constitute legal advice. Employment decisions should be made in consultation with legal counsel and in compliance with all applicable laws including the California Fair Chance Act.

## License

MIT
