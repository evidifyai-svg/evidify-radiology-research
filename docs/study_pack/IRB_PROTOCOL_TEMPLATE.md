# INSTITUTIONAL REVIEW BOARD
# PROTOCOL TEMPLATE

---

## PROTOCOL TITLE
Measuring Appropriate Reliance on Artificial Intelligence in Mammography Screening: 
A Multi-Site Observer Performance Study Using the Evidify Research Platform

## PROTOCOL VERSION
Version 1.0.0 | Date: [INSERT DATE]

## PRINCIPAL INVESTIGATOR
[Name, Credentials]
[Department]
[Institution]
[Email] | [Phone]

---

## 1. STUDY SUMMARY

### 1.1 Background and Rationale

Artificial intelligence (AI) systems are increasingly being deployed as decision support tools in medical imaging. The FDA has cleared multiple AI systems for mammography, yet little is known about how radiologists interact with AI suggestions in practice. Of particular concern is whether readers demonstrate "appropriate reliance" - accepting AI input when it improves accuracy while maintaining independent judgment when AI is incorrect.

This study uses the Evidify research platform to measure reader behavior in a controlled experimental setting. The platform captures detailed interaction data including timing, confidence levels, and decision changes, enabling precise measurement of the Appropriate Deference to Decision Aid (ADDA) metric.

### 1.2 Study Objectives

**Primary Objective:**
To measure the rate of Appropriate Deference to Decision Aid (ADDA) among radiologists when using AI-assisted mammography interpretation.

**Secondary Objectives:**
- Compare diagnostic accuracy with and without AI assistance
- Measure reader confidence calibration before and after AI reveal
- Assess cognitive workload (NASA-TLX) during AI-assisted interpretation
- Evaluate the impact of AI error rate disclosure on reader behavior

### 1.3 Study Design

Randomized, controlled, multi-reader multi-case (MRMC) observer study with within-subjects crossover design.

**Conditions:**
1. HUMAN_FIRST: Reader locks assessment before seeing AI suggestion
2. AI_FIRST: Reader sees AI suggestion before making assessment
3. CONCURRENT: AI suggestion visible throughout assessment

**Disclosure Formats:**
1. FDR/FOR: False Discovery Rate and False Omission Rate
2. Natural Frequency: "X out of 100" format
3. None: No error rate disclosure

---

## 2. STUDY POPULATION

### 2.1 Inclusion Criteria
- Board-certified radiologists (ABR or equivalent)
- Minimum 1 year post-residency experience
- Regularly interpret screening mammography (≥500 cases/year)
- Able to provide informed consent

### 2.2 Exclusion Criteria
- Financial conflict of interest with AI vendor
- Prior participation in this study
- Visual impairment that would affect image interpretation

### 2.3 Sample Size Justification
Based on published MRMC studies, a sample of N=30 readers and C=100 cases provides 80% power to detect a 5% difference in ADDA between conditions at α=0.05.

---

## 3. STUDY PROCEDURES

### 3.1 Recruitment
Participants will be recruited through [professional societies, institutional networks]. Recruitment materials are provided in Appendix A.

### 3.2 Consent Process
Written informed consent will be obtained electronically through the Evidify platform. The consent form describes:
- Study purpose and procedures
- Data collection and storage
- Risks and benefits
- Compensation
- Voluntary participation and withdrawal rights

### 3.3 Study Sessions

Each participant will complete:
1. **Demographics Survey** (5 minutes)
2. **Platform Tutorial** (10 minutes)
3. **Calibration Cases** (2 cases with feedback, ~10 minutes)
4. **Study Cases** (~100 cases, ~3-4 hours total, may be split across sessions)
5. **Post-Study Survey** (10 minutes)

### 3.4 Data Collection

The Evidify platform automatically captures:
- Timestamp of each interaction
- BI-RADS assessment (initial and final)
- Confidence ratings (before and after AI)
- Deviation rationale (free text)
- Time spent on each phase
- Viewport interactions (zoom, pan, window/level)

All data is cryptographically hashed to ensure integrity.

---

## 4. RISK ASSESSMENT

### 4.1 Risks to Participants
- **Minimal risk**: Study involves interpretation of de-identified medical images
- **No patient contact**: All cases are retrospective with known outcomes
- **Time burden**: Participation requires 4-6 hours total

### 4.2 Risks to Patients
- **None**: Images are fully de-identified and from completed cases
- No clinical decisions are made based on study responses

### 4.3 Benefits
- **Direct**: Continuing medical education credit may be offered
- **Indirect**: Contribution to scientific understanding of AI-human interaction

---

## 5. DATA MANAGEMENT

### 5.1 Data Storage
- All data stored on [cloud provider] with encryption at rest
- Access restricted to approved study personnel
- De-identified exports available for analysis

### 5.2 Data Retention
- Study data retained for 7 years per institutional policy
- Participants may request deletion of their data

### 5.3 Data Sharing
- De-identified datasets may be shared with collaborating institutions
- No individual-level data shared without participant consent

---

## 6. STATISTICAL ANALYSIS PLAN

### 6.1 Primary Analysis
ADDA will be calculated as the proportion of cases where the reader appropriately deferred to AI (changed toward correct AI suggestion) among cases where their initial assessment disagreed with AI.

### 6.2 Secondary Analyses
- iMRMC analysis for sensitivity/specificity
- Mixed-effects models for condition comparisons
- Confidence calibration curves
- NASA-TLX score comparisons

---

## 7. APPENDICES

- Appendix A: Recruitment Materials
- Appendix B: Informed Consent Form
- Appendix C: Demographics Survey
- Appendix D: Post-Study Survey
- Appendix E: NASA-TLX Instrument
- Appendix F: Case Selection Criteria
- Appendix G: Platform Screenshots
- Appendix H: Data Dictionary / Codebook

---

## INVESTIGATOR SIGNATURE

I certify that this protocol accurately describes the research to be conducted and that I will conduct this research in accordance with IRB-approved procedures.

_________________________________    _______________
Principal Investigator Signature        Date

_________________________________
Print Name and Credentials
