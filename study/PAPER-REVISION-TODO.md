# Paper revision to-do (evaluation: ISO + TAM + IT experts)

Base file: `AMSON_FINAL_MANUSCRIPT_NOV23.docx` (checked Nov 23).
Anything in `[brackets]` is a number you fill in from the survey data.

**Tables in Word:** every table below comes as a tab-separated block. Copy it, paste it into Word, select the pasted lines, go to **Insert → Table → Convert Text to Table**, make sure **Separate text at: Tabs** is selected, and click OK.

Assumed data:
- **IT experts:** 2 respondents, ISO survey (20 questions, Excellent to Unacceptable).
- **TAM:** the 3 staff (Branch Manager, Technical Staff, Sales Staff), 11 statements, Strongly Agree to Strongly Disagree. Printed form: `study/reference/TAM_Survey_Staff.pdf`.
- **Total respondents:** **55** (53 + 2 experts). The TAM survey uses the same 3 staff, so they aren't counted twice.

---

## Done (found in the Nov 23 file)

- ☑ **Objective 4** reworded (TAM for staff; ISO for end-users and IT professionals).
- ☑ **Theoretical Framework** paragraph added.
- ☑ **Statistical Tool** section added after the Agile "Review:" paragraph, with the Frequency and Percentage, Weighted Mean and Rank parts and the interpretation table.
- ☑ **p.102:** 55 respondents, the 2 new bullets, and the new scale paragraph.

---

## ☐ 1. Small fixes to what's already in the paper (no data needed)

**1a. Caption the interpretation table.** It has no caption yet. Put this above it:

```
Table 1. Interpretation of Weighted Mean
```

**1b. Add a "LIST OF TABLES"** page after LIST OF CHARTS. The paper doesn't have one yet, and the new tables need it. Use the same layout as LIST OF CHARTS:

```
Table	Title	Page
Table 1	Interpretation of Weighted Mean	[ ]
Table 2	Mapping of Survey Items to ISO/IEC 25010 and TAM	[ ]
Table 3	ISO/IEC 25010 Results by Characteristic	[ ]
Table 4	ISO/IEC 25010 Results by Respondent Group	[ ]
Table 5	Technology Acceptance Model Results	[ ]
```

The table numbers here (1–5) replace the "6.1 / 6.2 / 6.3" numbers in the old list. Your paper numbers its charts by section (2.x, 3.x), but there are only 5 tables, so plain 1–5 is simpler. If your adviser wants section numbers, rename them.

**1c. Abstract (p.ii) still says "53 respondents".** Fix it in step 6 once you have the numbers.

---

## ☐ 2. Item mapping table (optional, recommended; no data needed)

**Where:** in the Statistical Tool section, right after the Rank paragraph.

This answers "where is ISO in your questionnaire?", since the Admin Survey form doesn't say ISO.

Paragraph:

```
The survey items were written in simple language for the respondents and grouped under the ISO/IEC 25010 characteristics and the TAM constructs as shown in Table 2.
```

Caption: **Table 2. Mapping of Survey Items to ISO/IEC 25010 and TAM**

```
ISO/IEC 25010 Characteristic	Staff Survey Items	Customer Survey Items	IT Expert Survey Items
Functional Suitability	7, 8, 9, 10, 14	Functional Suitability 1–5	1–4
Performance Efficiency	4, 5, 6	Performance Efficiency 1	5–8
Usability	1, 2, 3	Usability 1–4	9–12
Reliability	11	Reliability 1	13–16
Security	12, 13	Security 1	17–20
Overall Satisfaction (not ISO)	15	Overall Satisfaction 1–2	–
```

Then, right under it, a second small table for TAM. It can also stay part of Table 2: paste it below the first table and convert it separately.

```
TAM Construct	Survey Items
Perceived Usefulness	1, 2, 3, 4
Perceived Ease of Use	5, 6, 7, 8
Intention to Use	9, 10, 11
```

---

## ☐ 3. Collect and compute

1. ☐ Print the TAM forms (1 per role), have the 3 staff answer and sign, and **write down the date**.
2. ☐ Get the second IT expert's answers.
3. ☐ For each new item: the frequency (count of 5s, 4s, 3s, 2s, 1s), the percentage, and the weighted mean.
4. ☐ For each characteristic or construct: the weighted mean (the average of its item means), the interpretation, and the rank.

Shortcut: send photos of the filled forms (or type the answers) and I'll fill every `[ ]` in this file.

---

## ☐ 4. Implementation Results: add 2 new parts (needs data)

**Where:** after Chart 3.8 (Customers), before "Summary of Survey Results" / Chart 4.1.
**Renumber** the current summary chart from **Chart 4.1 → Chart 6.1** and update the LIST OF CHARTS.

### 4a. IT Expert Evaluation (2 respondents): create **6 charts** (stacked bar, same style as the others)

| Chart | Content |
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

### 4b. Staff User Acceptance (TAM, 3 respondents): create **3 charts**

| Chart | Content |
| --- | --- |
| Chart 5.1 Perceived Usefulness of Staff | Q1–4 |
| Chart 5.2 Perceived Ease of Use of Staff | Q5–8 |
| Chart 5.3 Intention to Use of Staff | Q9–11 |

Under each chart:

```
This section shows that the branch staff gave the [construct] of the system a weighted mean of [x.xx] ([Strongly Agree/Agree]). [Highest item] received the highest rating of [x.xx], while [lowest item] received [x.xx]. The result indicates that the staff [strongly agree / agree] that the system is [useful in their work / easy to use / something they will continue to use].
```

**Optional per-chart frequency table.** Use it if your adviser wants the numbers shown and not just the chart. One per chart; add a row per item:

```
Item	5	4	3	2	1	Weighted Mean	Interpretation
1. [statement]	[ ]	[ ]	[ ]	[ ]	[ ]	[ ]	[ ]
2. [statement]	[ ]	[ ]	[ ]	[ ]	[ ]	[ ]	[ ]
Average						[ ]	[ ]
```

---

## ☐ 5. Summary of Findings (new heading; needs data)

**Where:** after the Chart 6.1 paragraph (the renamed summary chart), before **CONCLUSION**.

Heading:

```
Summary of Findings
```

### Table 3. ISO/IEC 25010 Results by Characteristic

Fill the existing groups (Customers, Branch Manager, Technical Staff, Sales Staff) from your Chart 4.1 data. Only the IT Experts column is new.

```
Criteria	Customers	Branch Manager	Technical Staff	Sales Staff	IT Experts	Weighted Mean	Interpretation	Rank
Functional Suitability	[ ]	[ ]	[ ]	[ ]	[ ]	[ ]	[ ]	[ ]
Performance Efficiency	[ ]	[ ]	[ ]	[ ]	[ ]	[ ]	[ ]	[ ]
Usability	[ ]	[ ]	[ ]	[ ]	[ ]	[ ]	[ ]	[ ]
Reliability	[ ]	[ ]	[ ]	[ ]	[ ]	[ ]	[ ]	[ ]
Security	[ ]	[ ]	[ ]	[ ]	[ ]	[ ]	[ ]	[ ]
Overall						[ ]	[ ]	–
```

"Weighted Mean" = the average of the 5 group columns, so each group counts equally. Ask your adviser if they'd rather weight by the number of respondents.

```
Table 3 summarizes the ISO/IEC 25010 evaluation across all respondent groups. [Highest characteristic] ranked first with a weighted mean of [x.xx] ([interpretation]), followed by [2nd] ([x.xx]), [3rd] ([x.xx]), [4th] ([x.xx]), and [5th] ([x.xx]). The overall weighted mean of [x.xx] ([interpretation]) indicates that the system meets the software quality requirements of the ISO/IEC 25010 standard as evaluated by both the end-users and IT professionals.
```

### Table 4. ISO/IEC 25010 Results by Respondent Group

```
Criteria	Weighted Mean	Interpretation	Rank
Branch Manager Survey (Charts 2.2–2.7)	[ ]	[ ]	[ ]
Technical Staff Survey (Charts 2.8–2.13)	[ ]	[ ]	[ ]
Sales Staff Survey (Charts 2.14–2.19)	[ ]	[ ]	[ ]
Customer Survey (Charts 3.3–3.8)	[ ]	[ ]	[ ]
IT Expert Survey (Charts 4.2–4.6)	[ ]	[ ]	[ ]
Overall Results	[ ]	[ ]	–
```

```
This table summarizes the evaluation results across the respondent groups, showing that the [group] achieved the highest weighted mean of [x.xx] ([interpretation], Rank 1), followed by [group] ([x.xx], Rank 2), [group] ([x.xx], Rank 3), [group] ([x.xx], Rank 4), and [group] ([x.xx], Rank 5), resulting in an overall weighted mean of [x.xx] ([interpretation]) that indicates high software quality across user roles and technical evaluators.
```

### Table 5. Technology Acceptance Model Results

```
Criteria	Weighted Mean	Interpretation	Rank
Perceived Usefulness (Chart 5.1)	[ ]	[ ]	[ ]
Perceived Ease of Use (Chart 5.2)	[ ]	[ ]	[ ]
Intention to Use (Chart 5.3)	[ ]	[ ]	[ ]
Overall Results	[ ]	[ ]	–
```

```
Table 5 shows that the branch staff [strongly agree / agree] that the system is useful and easy to use. [Highest construct] ranked first with a weighted mean of [x.xx] ([interpretation]), followed by [2nd] ([x.xx]) and [3rd] ([x.xx]). The overall weighted mean of [x.xx] ([interpretation]) indicates a high level of user acceptance among the branch staff, satisfying the Technology Acceptance Model component of the fourth objective.
```

---

## ☐ 6. Conclusion, Abstract, existing averages (needs data)

**6a. Conclusion (p.~119):** replace "It was evaluated by 53 respondents… across functional suitability, performance efficiency, usability, reliability, and security." with:

```
It was evaluated by 55 respondents, consisting of the Branch Manager, the Technical Staff, the Sales Staff, 50 customers, and 2 IT professionals, using the ISO/IEC 25010 quality characteristics, while the branch staff also evaluated their acceptance of the system using the Technology Acceptance Model. The system obtained an overall ISO/IEC 25010 weighted mean of [x.xx] ([interpretation]) and an overall TAM weighted mean of [x.xx] ([interpretation]).
```

**6b. Conclusion:** replace the "Fourth, …" sentence with:

```
Fourth, the evaluation shows that the branch staff accept the system as useful and easy to use and intend to continue using it (TAM overall weighted mean of [x.xx], [interpretation]), and that the end-users and IT professionals rated the system as meeting the ISO/IEC 25010 quality characteristics (overall weighted mean of [x.xx], [interpretation]).
```

**6c. Abstract (p.ii):** replace "The system was evaluated by 53 respondents… showing that the study's objectives were achieved." with:

```
The system was evaluated by 55 respondents, the Branch Manager, the Technical Staff, the Sales Staff, 50 customers, and 2 IT professionals, using the ISO/IEC 25010 quality characteristics, with an overall weighted mean of [x.xx] ([interpretation]). The branch staff also rated their acceptance of the system using the Technology Acceptance Model, with an overall weighted mean of [x.xx] ([interpretation]), showing that the study's objectives were achieved.
```

**6d. Existing averages:** add the meaning after each number, e.g. "Reliability rated highest at 4.82" → "**4.82 (Excellent)**". This is in the Chart 6.1 paragraph and the Conclusion.

---

## ☐ 7. Front and back matter (do last; page numbers shift)

- ☐ **LIST OF CHARTS:** add Charts 4.1–4.6 and 5.1–5.3; rename the summary chart to 6.1.
- ☐ **LIST OF TABLES:** fill in the page numbers (step 1b).
- ☐ **Appendices:** add the 2 new questionnaires (IT expert and TAM), plus scans of the signed TAM forms.
- ☐ **TABLE OF CONTENTS:** add "Statistical Tool" and "Summary of Findings", then right-click → Update Field → Update entire table.

---

## Order

1. ☐ Steps 1–2 now (no data needed)
2. ☐ Step 3: collect TAM (now) and the second IT expert (when available)
3. ☐ Step 4: charts
4. ☐ Step 5: Summary of Findings tables
5. ☐ Step 6: Conclusion, Abstract, averages
6. ☐ Step 7: lists, appendices, TOC
