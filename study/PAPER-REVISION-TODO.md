# Paper revision to-do (evaluation: ISO + TAM + IT experts)

Base file: `AMSON_FINAL_MANUSCRIPT_OCT_30.docx`. Page numbers are from the printed Nov 12 copy.
Anything in `[brackets]` is a number you fill in from the survey data.

Assumed data:
- **IT experts:** 2 respondents, ISO survey (20 questions, Excellent to Unacceptable).
- **TAM:** the 3 staff (Branch Manager, Technical Staff, Sales Staff), 11 questions, Strongly Agree to Strongly Disagree.
- **Customers and staff ISO:** unchanged (already in the paper).
- **Total respondents:** still **55 people** (53 + 2 experts). The TAM survey uses the same 3 staff, so don't count them twice.

---

## ☐ 1. Compute the numbers first

For each new question, get the **frequency** (how many chose 5, 4, 3, 2, 1), the **percentage**, and the **weighted mean**.

For each characteristic or construct, get the **weighted mean** (the average of its question means) plus its **interpretation** and **rank**.

You need:

| Survey | Rows you need |
| --- | --- |
| IT experts | Functional Suitability, Performance Efficiency, Usability, Reliability, Security, Overall |
| TAM (staff) | Perceived Usefulness, Perceived Ease of Use, Intention to Use, Overall |

Shortcut: export each Google Form's responses as .csv, send them to me, and I'll fill every `[bracket]` in this file.

---

## ☐ 2. Objective 4 (Introduction, Objectives, p.~13): replace the 4th bullet

```
To evaluate the level of user acceptance of the developed system using the Technology Acceptance Model (TAM), in terms of perceived usefulness, perceived ease of use, and intention to use, as rated by the branch staff of Amson Pharmaceuticals, and to assess the system's software quality using five characteristics of the ISO/IEC 25010 Software Quality Model (functional suitability, performance efficiency, usability, reliability, and security, including compliance with applicable rules) as rated by the end-users and IT professionals.
```

---

## ☐ 3. Theoretical Framework (pp.23–24): add at the end of the section

```
In this study, TAM was measured directly through a separate questionnaire answered by the branch staff, covering perceived usefulness, perceived ease of use, and intention to use. The ISO/IEC 25010 characteristics were rated by both the end-users and IT professionals with at least one year of industry experience, who evaluated the technical quality of the system.
```

---

## ☐ 4. Methodology: new "Statistical Tool" section

**Where:** right after the Agile phase descriptions, after the **"Review:"** paragraph and before "For each sprint, 2 to 4 features…".

Paste this text:

```
Statistical Tool

To evaluate the functional suitability, performance efficiency, usability, reliability, and security of the Web-Based Sales and Inventory Management System with Integrated Real-Time Expiry Monitoring for Amson Pharmaceuticals based on the ISO/IEC 25010 Software Quality Model, and the user acceptance of the system based on the Technology Acceptance Model (TAM), the researchers used descriptive statistics to summarize and interpret the survey responses gathered from the Branch Manager, Technical Staff, Sales Staff, customers, and IT professionals.

Frequency and Percentage Distribution:
```

Insert an Equation (Insert → Equation): **P = f / N × 100**

```
Used to show how many and what proportion of respondents selected each rating option per survey item. Where P is the percentage, f is the frequency of responses for a given rating, and N is the total number of respondents.

Weighted Mean:
```

Insert an Equation: **x̄ = Σ(f · w) / N**

```
Used to compute the average rating of the respondents on a five-point scale to determine the overall rating of each evaluated characteristic. Where x̄ is the weighted mean, f is the frequency of each response, w is the assigned weight of each scale point (5 down to 1), and N is the total number of respondents. The weighted mean was interpreted using the scale below, where each range has an equal width of 0.80, computed as (5 − 1) ÷ 5.
```

Then insert this table (**Table [x]. Interpretation of Weighted Mean**):

| Weight | Mean Range | ISO/IEC 25010 Interpretation | TAM Interpretation |
| --- | --- | --- | --- |
| 5 | 4.21 – 5.00 | Excellent | Strongly Agree |
| 4 | 3.41 – 4.20 | Good | Agree |
| 3 | 2.61 – 3.40 | Fair | Neutral |
| 2 | 1.81 – 2.60 | Poor | Disagree |
| 1 | 1.00 – 1.80 | Unacceptable | Strongly Disagree |

```
Rank:

The rank is computed with the weighted mean of each evaluated characteristic or respondent group, arranged in descending order from the highest to the lowest value. The highest weighted mean receives the top rank, which is 1, while lower weighted means are placed in sequence below it. When two or more criteria share the exact same weighted mean, they receive the same tied rank. Overall summary rows are left unranked because they represent an aggregate across categories rather than an individual criterion.
```

---

## ☐ 5. Results and Discussion, System Evaluation and Testing Methodology (p.102)

**5a. Respondent list:** add 2 bullets after "Customers (50 respondents)…", and change "fifty-three (53)" to **fifty-five (55)**.

```
-   IT Professionals (2 respondents): Evaluated the technical quality of the system under the five ISO/IEC 25010 characteristics. Each has at least one (1) year of experience in the IT industry.
-   User Acceptance (Branch Manager, Technical Staff, and Sales Staff): Answered a separate Technology Acceptance Model (TAM) questionnaire on perceived usefulness, perceived ease of use, and intention to use the system.
```

**5b. Replace** the paragraph "Feedback was collected using Likert-scale survey questionnaires…" with:

```
Feedback was collected using five-point Likert-scale survey questionnaires. The end-users and IT professionals rated the system from 1 to 5 (5 – Excellent, 4 – Good, 3 – Fair, 2 – Poor, 1 – Unacceptable), with the questions grouped under the ISO/IEC 25010 quality characteristics of Functional Suitability, Performance Efficiency, Usability, Reliability, and Security. The branch staff also answered a TAM questionnaire rated from 1 to 5 (5 – Strongly Agree, 4 – Agree, 3 – Neutral, 2 – Disagree, 1 – Strongly Disagree), with the questions grouped under Perceived Usefulness, Perceived Ease of Use, and Intention to Use. The responses were interpreted using the weighted mean and the scale described in the Statistical Tool.
```

---

## ☐ 6. Implementation Results: add 2 new parts after the Customer charts (after Chart 3.8, before Chart 4.1)

Renumber the summary chart from **4.1 → 6.1** (or keep 4.1 and number the new charts 4.x / 5.x; just stay consistent).

### 6a. IT Expert Evaluation (2 respondents): create **6 charts** (stacked bar, same style as the others)

| Create | Questions on it |
| --- | --- |
| Chart 4.1 Respondents' Years of Experience (pie) | profile question 4 |
| Chart 4.2 Functional Suitability of IT Experts | Q1–4 |
| Chart 4.3 Performance Efficiency of IT Experts | Q5–8 |
| Chart 4.4 Usability of IT Experts | Q9–12 |
| Chart 4.5 Reliability of IT Experts | Q13–16 |
| Chart 4.6 Security of IT Experts | Q17–20 |

Under each chart, list its questions (as the staff sections do), then this paragraph:

```
This section shows that the IT professionals rated the [characteristic] of the system with a weighted mean of [x.xx] ([Excellent/Good]). [Highest item] received the highest rating of [x.xx], while [lowest item] received the lowest rating of [x.xx]. The result indicates that the system [meets / highly meets] the [characteristic] requirements of the ISO/IEC 25010 standard.
```

### 6b. Staff User Acceptance (TAM, 3 respondents): create **3 charts**

| Create | Questions on it |
| --- | --- |
| Chart 5.1 Perceived Usefulness of Staff | Q1–4 |
| Chart 5.2 Perceived Ease of Use of Staff | Q5–8 |
| Chart 5.3 Intention to Use of Staff | Q9–11 |

Under each chart:

```
This section shows that the branch staff gave the [construct] of the system a weighted mean of [x.xx] ([Strongly Agree/Agree]). [Highest item] received the highest rating of [x.xx], while [lowest item] received [x.xx]. The result indicates that the staff [strongly agree / agree] that the system is [useful in their work / easy to use / something they will continue to use].
```

---

## ☐ 7. Summary of Findings (new heading)

**Where:** after the Implementation Results charts, before **CONCLUSION**. Replace the current Chart 4.1 paragraph with this section, or put it right after that paragraph.

### Table 6.1 ISO/IEC 25010 results by characteristic (all ISO respondents)

| Criteria | Customers | Branch Manager | Technical Staff | Sales Staff | IT Experts | Weighted Mean | Interpretation | Rank |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Functional Suitability | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Performance Efficiency | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Usability | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Reliability | 4.82 | [ ] | 5.00 | [ ] | [ ] | [ ] | [ ] | [ ] |
| Security | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Overall** | | | | | | **[ ]** | **[ ]** | – |

The "Weighted Mean" column is the average of the 5 group columns, so each group counts equally. If your adviser wants each person to count equally instead, weight by respondents: (50 × customer mean + 1 × BM + 1 × TS + 1 × SS + 2 × expert mean) ÷ 55. Ask which one; classmates' format (one row per group) suggests the simple average.

```
Table 6.1 summarizes the ISO/IEC 25010 evaluation across all respondent groups. [Highest characteristic] ranked first with a weighted mean of [x.xx] ([interpretation]), followed by [2nd] ([x.xx]), [3rd] ([x.xx]), [4th] ([x.xx]), and [5th] ([x.xx]). The overall weighted mean of [x.xx] ([interpretation]) indicates that the system meets the software quality requirements of the ISO/IEC 25010 standard as evaluated by both the end-users and IT professionals.
```

### Table 6.2 Results by respondent group (same layout as your classmates')

| Criteria | Weighted Mean | Interpretation | Rank |
| --- | --- | --- | --- |
| Branch Manager Survey (Charts 2.2–2.7) | [ ] | [ ] | [ ] |
| Technical Staff Survey (Charts 2.8–2.13) | [ ] | [ ] | [ ] |
| Sales Staff Survey (Charts 2.14–2.19) | [ ] | [ ] | [ ] |
| Customer Survey (Charts 3.3–3.8) | [ ] | [ ] | [ ] |
| IT Expert Survey (Charts 4.2–4.6) | [ ] | [ ] | [ ] |
| **Overall Results** | **[ ]** | **[ ]** | – |

```
This table summarizes the evaluation results across the respondent groups, showing that the [group] achieved the highest weighted mean of [x.xx] ([interpretation], Rank 1), followed by [group] ([x.xx], Rank 2), [group] ([x.xx], Rank 3), [group] ([x.xx], Rank 4), and [group] ([x.xx], Rank 5), resulting in an overall weighted mean of [x.xx] ([interpretation]) that indicates high software quality across user roles and technical evaluators.
```

### Table 6.3 Technology Acceptance Model results (branch staff)

| Criteria | Weighted Mean | Interpretation | Rank |
| --- | --- | --- | --- |
| Perceived Usefulness (Chart 5.1) | [ ] | [ ] | [ ] |
| Perceived Ease of Use (Chart 5.2) | [ ] | [ ] | [ ] |
| Intention to Use (Chart 5.3) | [ ] | [ ] | [ ] |
| **Overall Results** | **[ ]** | **[ ]** | – |

```
Table 6.3 shows that the branch staff [strongly agree / agree] that the system is useful and easy to use. [Highest construct] ranked first with a weighted mean of [x.xx] ([interpretation]), followed by [2nd] ([x.xx]) and [3rd] ([x.xx]). The overall weighted mean of [x.xx] ([interpretation]) indicates a high level of user acceptance among the branch staff, satisfying the Technology Acceptance Model component of the fourth objective.
```

---

## ☐ 8. Conclusion (p.~119): update 2 places

1. Replace "It was evaluated by 53 respondents… across functional suitability, performance efficiency, usability, reliability, and security." with:

```
It was evaluated by 55 respondents, consisting of the Branch Manager, the Technical Staff, the Sales Staff, 50 customers, and 2 IT professionals, using the ISO/IEC 25010 quality characteristics, while the branch staff also evaluated their acceptance of the system using the Technology Acceptance Model. The system obtained an overall ISO/IEC 25010 weighted mean of [x.xx] ([interpretation]) and an overall TAM weighted mean of [x.xx] ([interpretation]).
```

2. Replace the "Fourth, …" sentence with:

```
Fourth, the evaluation shows that the branch staff accept the system as useful and easy to use and intend to continue using it (TAM overall weighted mean of [x.xx], [interpretation]), and that the end-users and IT professionals rated the system as meeting the ISO/IEC 25010 quality characteristics (overall weighted mean of [x.xx], [interpretation]).
```

---

## ☐ 9. Abstract (p.~ii): update the evaluation sentences

```
The system was evaluated by 55 respondents, the Branch Manager, the Technical Staff, the Sales Staff, 50 customers, and 2 IT professionals, using the ISO/IEC 25010 quality characteristics, with an overall weighted mean of [x.xx] ([interpretation]). The branch staff also rated their acceptance of the system using the Technology Acceptance Model, with an overall weighted mean of [x.xx] ([interpretation]), showing that the study's objectives were achieved.
```

---

## ☐ 10. Existing customer and staff results: add the interpretation after every average

Example: "with Reliability rated highest at 4.82" → "with Reliability rated highest at **4.82 (Excellent)**". Do this in the Chart 4.1 paragraph and the Conclusion.

---

## ☐ 11. Front matter and back matter

- **List of Charts:** add the new IT expert and TAM charts and renumber the summary chart.
- **List of Tables:** add the Interpretation of Weighted Mean table and Tables 6.1–6.3.
- **Appendices:** add the 2 new questionnaires (IT expert survey, TAM survey) next to the existing survey forms.
- **Table of Contents:** add "Statistical Tool" and "Summary of Findings", then right-click → Update Field → Update entire table.

---

## Order to do it in

1. ☐ Compute the numbers (step 1)
2. ☐ Methodology: Statistical Tool (step 4) and p.102 (step 5). No numbers needed, so you can start these now.
3. ☐ Objective 4 and Theoretical Framework (steps 2–3). Also no numbers needed.
4. ☐ Charts (step 6)
5. ☐ Summary of Findings tables (step 7)
6. ☐ Conclusion, Abstract, existing averages (steps 8–10)
7. ☐ Lists, appendices, TOC (step 11), done last because page numbers shift
