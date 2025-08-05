# Patient Risk Scoring System (JavaScript)

This project is a part of an assessment that implements a risk scoring system for patients using the Healthcare API.

## Task Overview
- Retrieve patient data from a paginated API.
- Handle API rate limiting and intermittent failures.
- Calculate risk scores based on blood pressure, temperature, and age.
- Generate alert lists for:
  - High-Risk Patients (score ≥ 4)
  - Fever Patients (temperature ≥ 99.6°F)
  - Data Quality Issues (invalid/missing data)
- Submit results back to the API.