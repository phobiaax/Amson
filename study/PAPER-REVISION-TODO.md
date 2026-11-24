# Paper revision to-do (evaluation: ISO + TAM + IT experts)

Checked against `AMSON_FINAL_MANUSCRIPT_NOV24newcmpressedpics.docx`.
Results files: `study/reference/TAM_Results.docx`, `study/reference/IT_Expert_and_Summary_Results.docx`.

## Done

- ☑ Objective 4, Theoretical Framework paragraph
- ☑ Statistical Tool section and interpretation table (Chart 1.1)
- ☑ p.102: 55 respondents, bullets, scale paragraph
- ☑ IT Expert Evaluation, Charts 4.1–4.6
- ☑ Staff User Acceptance Evaluation, Charts 5.1–5.3
- ☑ Summary of Findings heading, with the Chart 6.2, 6.3 and 6.4 tables and paragraphs
- ☑ Conclusion (55 respondents, 4.50 and 4.94), the "Fourth, …" sentence, the Recommendations line
- ☑ Abstract (55 respondents, 4.50 and 4.94)
- ☑ TAM Survey forms in Appendix O

## Left to do

1. ☐ **Two charts are numbered 4.1.** The IT experts' pie chart is 4.1, and so is the old summary chart ("Chart 4.1. Summary of Survey Results"). Rename the summary chart to **Chart 6.1**, in its caption and in LIST OF CHARTS.
2. ☐ **Two charts are numbered 1.1.** Rename the Gantt chart caption (p.97) and its LIST OF CHARTS line to **Chart 1.2**.
3. ☑ Captions for Charts 6.2, 6.3 and 6.4 (they're there; the txt export had dropped them)
4. ☐ **LIST OF CHARTS:** change the Gantt line to 1.2 and the summary line to 6.1, then add the lines below (paste, select, Insert → Table → Convert Text to Table, Tabs). Fill in the page numbers last.
   ```
   Chart 4.1	Pie Chart (IT Experts' Years of Experience)	
   Chart 4.2	Stacked Bar Chart (Functional Suitability of IT Experts)	
   Chart 4.3	Stacked Bar Chart (Performance Efficiency of IT Experts)	
   Chart 4.4	Stacked Bar Chart (Usability of IT Experts)	
   Chart 4.5	Stacked Bar Chart (Reliability of IT Experts)	
   Chart 4.6	Stacked Bar Chart (Security of IT Experts)	
   Chart 5.1	Stacked Bar Chart (Perceived Usefulness of Staff)	
   Chart 5.2	Stacked Bar Chart (Perceived Ease of Use of Staff)	
   Chart 5.3	Stacked Bar Chart (Intention to Use of Staff)	
   Chart 6.1	Clustered Column Chart (Summary of Survey Results)	
   Chart 6.2	Table (ISO/IEC 25010 Results by Characteristic)	
   Chart 6.3	Table (ISO/IEC 25010 Results by Respondent Group)	
   Chart 6.4	Table (Technology Acceptance Model Results)	
   ```
   Also fill in the page number on the existing Chart 1.1 line.
5. ☐ **Appendix O:** add a heading **IT Expert Survey** with screenshots of the Google Form, after TAM Survey.
   Also make the LIST OF APPENDICES names match the headings in the body:
   - O: list says "Survey Questions", body says "Evaluation Tool/Test Documents"
   - P: "Transcript for Survey and Testing" vs "Transcript of Survey Testing"
   - H: "PayMongo Pricing" vs "PayMongo Pricing Limitation"
   - I: "Lalamove API Instruction" vs "Lalamove API Limitation"
   - R: "Sample Input/Output Reports" vs "Sample Input/Output/Reports"
   - A–G use "Appendix A:" in the body but "Appendix A." elsewhere; pick one
6. ☐ **TABLE OF CONTENTS:** add "Statistical Tool" and "Summary of Findings" if they aren't listed, then right-click → Update Field → Update entire table.
7. ☐ **Last:** update all page numbers in LIST OF CHARTS and LIST OF APPENDICES. Appendix O and P moved when pages were added.

## Round 2 (added Nov 24)

Order: R1 → R2 → R3 need nothing from anyone. R4 needs the customer survey CSV. R5 needs the signed letters.

### ☐ R1. Research Instrument + Sampling Technique (15 min)

**Where:** Methodology, right **before "Statistical Tool"** (after the Agile "Review:" paragraph). Two short headings, same style as "Statistical Tool".

```
Research Instrument

The researchers used survey questionnaires as the research instrument. The Admin Survey for the Branch Manager, Technical Staff, and Sales Staff, the User Survey for customers, and the IT Expert Survey were rated on a five-point Likert scale and grouped under the ISO/IEC 25010 quality characteristics of Functional Suitability, Performance Efficiency, Usability, Reliability, and Security. The TAM Survey for the branch staff was rated on a five-point Likert scale and grouped under Perceived Usefulness, Perceived Ease of Use, and Intention to Use. The questionnaires are shown in Appendix O.

Sampling Technique

The researchers used total enumeration for the branch staff, since the Las Piñas branch has one Branch Manager, one Technical Staff, and one Sales Staff. Convenience sampling was used for the 50 customers, who were selected based on their availability and willingness to use the system and answer the survey. Purposive sampling was used for the two IT professionals, who were selected because they have at least one (1) year of experience in the IT industry.
```

### ☐ R2. "All computation goes to results" (10 min check)

Rule: **Statistical Tool = formulas and how to read them only. Results = every number.**
- The Statistical Tool section has no computed numbers now, so nothing moves out of it.
- Cronbach's alpha follows the same rule: formula in Statistical Tool (R3), values in Results (R4).
- Check: search the Methodology for any "4." or "%" values. There should be none.

### ☐ R3. Cronbach's alpha formula (10 min)

**Where:** Statistical Tool, after the **Weighted Mean** paragraph and before **Rank**. Insert the formula as a Word equation: **α = (k / (k − 1)) × (1 − Σσᵢ² / σₜ²)**

```
Cronbach's Alpha:

Used to measure the internal consistency of the customer survey. Where α is Cronbach's alpha, k is the number of items, σᵢ² is the variance of each item, and σₜ² is the variance of the total scores. It was computed only for the customer survey, since the staff and IT expert groups have too few respondents, and only for characteristics with two or more items. The value was interpreted as Excellent (0.90 and above), Good (0.80 to 0.89), Acceptable (0.70 to 0.79), Questionable (0.60 to 0.69), Poor (0.50 to 0.59), or Unacceptable (below 0.50) (George & Mallery, 2003).
```

**References:** add in alphabetical order:
```
George, D., & Mallery, P. (2003). SPSS for Windows step by step: A simple guide and reference, 11.0 update (4th ed.). Allyn & Bacon.
```

### ☐ R4. Cronbach's alpha results (5 min, values computed from the 50 customer responses)

**Where:** Implementation Results, right **after the Chart 3.8 paragraph** (end of Customer Evaluation). Using **Chart 3.9** means no renumbering.

Heading: `Reliability of the Customer Survey`

```
Criteria	Number of Items	Cronbach's Alpha	Interpretation
Functional Suitability	5	0.79	Acceptable
Usability	4	0.79	Acceptable
Overall Satisfaction	2	0.72	Acceptable
Whole Questionnaire	14	0.92	Excellent
```
Caption below it: `Chart 3.9. Reliability of the Customer Survey`

```
Chart 3.9 shows that the customer survey has an excellent level of internal consistency, with a Cronbach's alpha of 0.92 for the whole questionnaire. Functional Suitability (0.79), Usability (0.79), and Overall Satisfaction (0.72) were each within the acceptable range. Performance Efficiency, Reliability, and Security were not included because each has only one item.
```

LIST OF CHARTS line:
```
Chart 3.9	Table (Reliability of the Customer Survey)	
```

Check: the same CSV gives the paper's existing averages exactly (FS 4.64, PE 4.60, U 4.66, R 4.82, S 4.62, OS 4.75), so the item grouping matches the paper.

### ☐ R5. Validation letters + proof of IT experts (20 min once signed)

**Where:** a new **Appendix S. Validation Letters of IT Experts**, at the end. Adding it last means no relettering.
- Per expert: the **signed validation letter** + **proof** (certificate of employment or company ID; cover ID numbers and addresses).
- LIST OF APPENDICES line: `Appendix S. Validation Letters of IT Experts`
- **Only if the letters say the experts checked the questionnaire**, add this sentence at the end of the Research Instrument paragraph (R1):
```
The questionnaires were reviewed and validated by IT professionals (Appendix S).
```

### ☐ R6. New Rx flow: paper text + diagrams (about 2 hours, mostly redrawing)

All the paste-ready text and the redraw steps are in **`study/PAPER-RX-CHANGES.md`**:
- 14 text places (Background, Scope, Modules, REQ021–025, REQ031, REQ077–079, descriptions under Figs 2.4/2.6/2.10/2.11)
- Redraw **Fig 2.10** (Rx branch) and **Fig 2.11** (prescription check before payment check)
- Add use cases to **Figs 2.4 and 2.6**

## Optional

- ☐ **Item-mapping table (Chart 1.2 if added; the Gantt chart then becomes 1.3).** Shows which question belongs to which ISO characteristic or TAM construct. Useful if the panel asks "where is ISO in your form?".
- ☐ **Redo Chart 6.1** to include an IT Experts bar. Not required: Chart 6.3 already shows the experts.
