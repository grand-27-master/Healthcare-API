const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.API_KEY;
const BASE_URL = "https://assessment.ksensetech.com/api"

const HEADERS = {
    'x-api-key': API_KEY
};

async function safeGet(url, params = {}, retries = 5) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const response = await axios.get(url, { headers: HEADERS, params });
            return response.data;
        } catch (error) {
            if (error.response && [500, 503].includes(error.response.status)) {
                await new Promise(res => setTimeout(res, 1000));
            } else if (error.response && error.response.status === 429) {
                await new Promise(res => setTimeout(res, 2000));
            } else {
                throw error;
            }
        }
    }
    throw new Error(`Failed after ${retries} retries: ${url}`);
}

function calculateBpScore(systolic, diastolic) {
    systolic = parseFloat(systolic);
    diastolic = parseFloat(diastolic);

    if (isNaN(systolic) || isNaN(diastolic)) return { score: 0, issue: true };

    if (systolic >= 140 || diastolic >= 90) return { score: 3, issue: false };
    if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) return { score: 2, issue: false };
    if (systolic >= 120 && systolic <= 129 && diastolic < 80) return { score: 1, issue: false };
    if (systolic < 120 && diastolic < 80) return { score: 0, issue: false };

    return { score: 0, issue: true };
}

function calculateTempScore(temp) {
    temp = parseFloat(temp);

    if (isNaN(temp)) return { score: 0, issue: true };

    if (temp >= 101.0) return { score: 2, issue: false };
    if (temp >= 99.6 && temp <= 100.9) return { score: 1, issue: false };
    if (temp <= 99.5) return { score: 0, issue: false };

    return { score: 0, issue: true };
}

function calculateAgeScore(age) {
    age = parseInt(age);

    if (isNaN(age)) return { score: 0, issue: true };

    if (age > 65) return { score: 2, issue: false };
    if (age >= 40 && age <= 65) return { score: 1, issue: false };
    if (age < 40) return { score: 0, issue: false };

    return { score: 0, issue: true };
}

async function processPatients() {
    let highRiskPatients = [];
    let feverPatients = [];
    let dataQualityIssues = [];

    let page = 1;
    while (true) {
        const data = await safeGet(`${BASE_URL}/patients`, { page });
        const patients = data.patients || [];

        if (patients.length === 0) break;

        for (const patient of patients) {
            const patientId = patient.id;
            const systolic = patient.blood_pressure?.systolic;
            const diastolic = patient.blood_pressure?.diastolic;
            const temperature = patient.temperature;
            const age = patient.age;

            const { score: bpScore, issue: bpIssue } = calculateBpScore(systolic, diastolic);
            const { score: tempScore, issue: tempIssue } = calculateTempScore(temperature);
            const { score: ageScore, issue: ageIssue } = calculateAgeScore(age);

            const totalRisk = bpScore + tempScore + ageScore;

            if (totalRisk >= 4) highRiskPatients.push(patientId);

            if (!tempIssue && parseFloat(temperature) >= 99.6) feverPatients.push(patientId);

            if (bpIssue || tempIssue || ageIssue) dataQualityIssues.push(patientId);
        }

        page++;
    }

    return {
        high_risk_patients: highRiskPatients,
        fever_patients: feverPatients,
        data_quality_issues: dataQualityIssues
    };
}

async function submitResults(results) {
    try {
        const response = await axios.post(
            `${BASE_URL}/submit-assessment`,
            results,
            { headers: HEADERS }
        );
        console.log(response.status, response.data);
    } catch (error) {
        console.error(error.response.status, error.response.data);
    }
}

(async () => {
    const results = await processPatients();
    console.log("Submission Data:", results);
    await submitResults(results);
})();
