# multi_model_router.py — Dynamo AI Research Pipeline
# Flow: Tavily (search) → Claude (extract) → Gemini (analyze) → GPT (write paper)
# APIMart is tried first; Gemini is used as reliable fallback for each stage.

import requests
import config


def apimart_call(model, prompt):

    try:
        res = requests.post(
            "https://api.apimart.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {config.APIMART_API_KEY}"
            },
            json={
                "model": model,
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            },
            timeout=30
        )

        data = res.json()
        return data["choices"][0]["message"]["content"]

    except Exception as e:
        return f"Error: {str(e)}"


# --------------------------------------------------
# CITATION FORMAT RULES
# --------------------------------------------------
CITATION_RULES = {
    "IEEE": {
        "name": "IEEE",
        "full_name": "IEEE Citation Style",
        "used_in": "Engineering, Computer Science, Electronics, IT",
        "in_text": "Numbered square brackets [1], [2], [3]",
        "ref_format": "[1] A. Author, \"Title of Paper,\" *Journal Name*, vol. X, no. Y, pp. ZZ–ZZ, Mon. Year.",
        "example": '[1] R. Sharma, "Deep Learning for Image Recognition," *IEEE Trans. Neural Netw.*, vol. 32, no. 5, pp. 100–110, May 2021.',
        "rules": """
CITATION RULES (IEEE):
- Use numbered citations in square brackets: [1], [2], etc.
- Number citations in order of first appearance
- In-text: "...as shown in [1], [3]..." or "Smith et al. [2] showed that..."
- Reference list: numbered, not alphabetical
- Journal format: [N] A. Author, "Title," *Journal*, vol. X, no. Y, pp. ZZ–ZZ, Mon. Year.
- Book format: [N] A. Author, *Title of Book*, Ed. City: Publisher, Year.
- Conference: [N] A. Author, "Title," in *Proc. Conf. Name*, City, Year, pp. ZZ–ZZ.
- Include at least 10–15 references
- Use IEEE abbreviations for journal names (e.g., IEEE Trans. for IEEE Transactions on)
"""
    },
    "APA7": {
        "name": "APA 7th",
        "full_name": "APA 7th Edition (American Psychological Association)",
        "used_in": "Psychology, Social Sciences, Education, MBA, Nursing",
        "in_text": "Author-date format (Author, Year)",
        "ref_format": "Author, A. A., & Author, B. B. (Year). Title of article. *Journal Name*, Volume(Issue), pp–pp. https://doi.org/xxxxx",
        "example": "Sharma, R. K., & Patel, S. (2023). Cognitive patterns in digital learning. *Journal of Educational Psychology*, 45(3), 112–130. https://doi.org/10.1037/edu0000123",
        "rules": """
CITATION RULES (APA 7th Edition):
- In-text citations: (Author, Year) or Author (Year) described...
- Two authors: (Smith & Jones, 2022)
- Three or more: (Smith et al., 2022)
- Direct quote: (Author, Year, p. X)
- Reference list: alphabetical by author surname, hanging indent
- Journal: Author, A. A. (Year). Title of article. *Journal Name*, Volume(Issue), pp–pp. https://doi.org/xxxxx
- Book: Author, A. A. (Year). *Title of work: Capital letter also for subtitle*. Publisher.
- Sentence case for article/chapter titles; Title Case for journal/book titles
- Include DOI when available
- Include at least 10–15 references
"""
    },
    "MLA": {
        "name": "MLA 9th",
        "full_name": "MLA 9th Edition (Modern Language Association)",
        "used_in": "Humanities, Literature, Languages, Philosophy, Arts",
        "in_text": "Author-page number (Smith 45)",
        "ref_format": "Author Last, First. \"Title of Article.\" *Journal Name*, vol. X, no. Y, Year, pp. ZZ–ZZ.",
        "example": 'Tagore, Rabindranath. "The Role of Nature in Indian Poetry." *Journal of South Asian Literature*, vol. 12, no. 3, 2021, pp. 45–67.',
        "rules": """
CITATION RULES (MLA 9th Edition):
- In-text: (Author Page#) e.g., (Sharma 45) or (Sharma and Patel 67)
- No comma between author and page number
- Works Cited page at end (not References)
- Alphabetical order by author surname
- Journal article: Author Last, First. "Title of Article." *Journal Name*, vol. X, no. Y, Year, pp. ZZ–ZZ.
- Book: Author Last, First. *Title of Book*. Publisher, Year.
- Container concept: source within larger source
- Title Case for all titles
- Include at least 10–12 works cited entries
"""
    },
    "Harvard": {
        "name": "Harvard",
        "full_name": "Harvard Referencing Style",
        "used_in": "Management, Business, General Sciences, UK/Australia universities",
        "in_text": "Author-date (Author, Year, p. X)",
        "ref_format": "Author, A.A. (Year) 'Title of article', *Journal Name*, Volume(Issue), pp. ZZ–ZZ.",
        "example": "Patel, R.K. (2023) 'Artificial intelligence in supply chain management', *International Journal of Operations & Production Management*, 43(2), pp. 210–235.",
        "rules": """
CITATION RULES (Harvard Style):
- In-text: (Author, Year) or (Author, Year, p. X) for direct quotes
- Two authors: (Smith and Jones, 2022)
- Three or more: (Smith et al., 2022)
- Reference list: alphabetical by author surname
- Journal: Author, A.A. (Year) 'Title of article', *Journal Name*, Volume(Issue), pp. ZZ–ZZ.
- Book: Author, A.A. (Year) *Title of Book*. City: Publisher.
- Use single quotes for article/chapter titles
- Italicise journal names and book titles
- Include at least 10–15 references
"""
    },
    "Vancouver": {
        "name": "Vancouver",
        "full_name": "Vancouver Citation Style (ICMJE)",
        "used_in": "Medicine, Health Sciences, Nursing, Life Sciences, Pharmacy",
        "in_text": "Superscript numbers or (1), (2) in order of appearance",
        "ref_format": "Author AA, Author BB. Title of article. Journal Abbrev. Year;Volume(Issue):pp–pp.",
        "example": "Sharma RK, Patel S, Kumar A. Impact of AI diagnostics in Indian hospitals. Indian J Med Res. 2023;157(4):312–8.",
        "rules": """
CITATION RULES (Vancouver / ICMJE):
- Number citations consecutively in order of first mention
- In-text: superscript numbers¹ or (1) in parentheses
- Reference list: numbered, not alphabetical
- Up to 6 authors listed; if more, list first 6 followed by "et al."
- Journal: Author AA, Author BB. Title of article. Journal Abbrev. Year;Volume(Issue):pp–pp. doi:xxxxx
- Book: Author AA. Title of Book. Edition. City: Publisher; Year. p. XX–XX.
- No comma between volume and issue; semicolon before year
- Use PubMed journal abbreviations
- Include at least 15–20 references (medical papers require more)
"""
    },
    "Chicago": {
        "name": "Chicago",
        "full_name": "Chicago Style 17th Edition (Notes-Bibliography)",
        "used_in": "History, Social Sciences, Fine Arts, Cultural Studies",
        "in_text": "Footnotes or endnotes with full citation first time",
        "ref_format": 'Author Last, First. "Title of Article." *Journal Name* Volume, no. Issue (Year): pp–pp.',
        "example": 'Sharma, Rajiv. "Colonial Influences on Indian Architecture." *Journal of Asian Studies* 82, no. 3 (2023): 450–475.',
        "rules": """
CITATION RULES (Chicago 17th Edition - Notes-Bibliography):
- Use footnotes (¹) or endnotes at bottom of page / end of paper
- First citation: full reference. Subsequent: shortened (Author, Short Title, page)
- Bibliography at end, alphabetical by author surname
- Journal: Author Last, First. "Title of Article." *Journal Name* Volume, no. Issue (Year): pp–pp.
- Book: Author Last, First. *Title of Book*. City: Publisher, Year.
- Footnote format: ¹ First Author, *Book Title* (City: Publisher, Year), page.
- Include page numbers for direct quotes
- Bibliography uses hanging indent
- Include at least 10–15 bibliography entries
"""
    },
    "Springer": {
        "name": "Springer",
        "full_name": "Springer Journal Citation Style",
        "used_in": "Springer journal publications, Computer Science, Mathematics, Physics",
        "in_text": "Numbered references [1], [2] or Author-year depending on journal",
        "ref_format": "Author, A., Author, B.: Title of article. Journal Name Volume, pp–pp (Year). https://doi.org/xxxxx",
        "example": "Kumar, R., Singh, P.: Machine learning approaches for climate prediction. J. Comput. Sci. 45, 112–130 (2023). https://doi.org/10.1007/s00000-023-00001",
        "rules": """
CITATION RULES (Springer Style):
- Numbered references in order of appearance [1], [2]
- In-text: [1] or [1, 3] for multiple
- Reference list: numbered, not alphabetical
- Journal: Author, A., Author, B.: Title. Journal Name Vol, pp–pp (Year). https://doi.org/xxxxx
- Book: Author, A.: Title. Publisher, City (Year)
- Chapter: Author, A.: Title. In: Editor, B. (ed.) Book Title, pp. ZZ–ZZ. Publisher, City (Year)
- Use abbreviated journal names where standard
- Include DOI for all references when available
- Include at least 15–20 references
"""
    },
    "ACS": {
        "name": "ACS",
        "full_name": "ACS Style (American Chemical Society)",
        "used_in": "Chemistry, Chemical Engineering, Materials Science, Biochemistry",
        "in_text": "Superscript numbers in order of appearance",
        "ref_format": "Author, A. A.; Author, B. B. Title of Article. *Journal Abbrev.* Year, Volume, pp–pp.",
        "example": "Sharma, R. K.; Patel, S. V. Synthesis of Novel Catalytic Compounds. *J. Am. Chem. Soc.* 2023, 145, 1234–1245.",
        "rules": """
CITATION RULES (ACS Style):
- Superscript numbers in order of first appearance¹
- Reference list: numbered, not alphabetical
- Authors: Last, F. M.; Last, F. M. (semicolons between authors)
- Journal: Author, A. A.; Author, B. B. Title. *J. Abbrev.* Year, Volume, pp–pp.
- Book: Author, A. A. *Title of Book*; Publisher: City, Year; pp ZZ–ZZ.
- Use standard ACS journal abbreviations (e.g., *J. Am. Chem. Soc.*, *Chem. Rev.*)
- Italicise journal names
- Include volume but not issue number for most journals
- Include at least 20–25 references (chemistry papers cite heavily)
"""
    }
}


# --------------------------------------------------
# 🔬 RESEARCH PIPELINE
# --------------------------------------------------
def research_pipeline(topic: str, web_context: str = "", citation_format: str = "") -> str:

    fmt = citation_format.upper().replace(" ", "").replace("TH", "").replace("ED", "")
    fmt_key = {
        "IEEE": "IEEE",
        "APA7": "APA7", "APA": "APA7",
        "MLA9": "MLA", "MLA": "MLA",
        "HARVARD": "Harvard",
        "VANCOUVER": "Vancouver",
        "CHICAGO": "Chicago",
        "SPRINGER": "Springer",
        "ACS": "ACS"
    }.get(fmt, "")

    citation_info = CITATION_RULES.get(fmt_key, None)
    citation_rules_block = citation_info["rules"] if citation_info else ""
    citation_label = citation_info["full_name"] if citation_info else "Standard academic citation"
    ref_example = citation_info["ref_format"] if citation_info else ""

    # 1. Claude → extract key insights from web context
    extracted = apimart_call(
        "claude-sonnet-4.5",
        f"You are a research assistant. Extract key facts, statistics, findings, and insights relevant to the topic.\n\nTOPIC: {topic}\n\nWEB CONTEXT:\n{web_context or 'No web context provided — use your knowledge.'}\n\nProvide structured bullet points of the most important findings."
    )

    # 2. Gemini → analyze trends, gaps, contradictions
    analysis = apimart_call(
        "gemini-3.1",
        f"Analyze the following research findings. Identify: (1) key themes, (2) research gaps, (3) contradictions or debates, (4) future directions.\n\nFINDINGS:\n{extracted}"
    )

    # 3. GPT → write the full formatted research paper
    citation_section = f"""
CITATION FORMAT: {citation_label}
{citation_rules_block}
Reference format example: {ref_example}

IMPORTANT: Apply the above citation format throughout the paper. All in-text citations and the References/Works Cited section MUST strictly follow {citation_label} guidelines.
""" if citation_info else "Use standard academic citation format with numbered references."

    report = apimart_call(
        "gpt-5.4",
        f"""You are an expert academic researcher. Write a HIGH-QUALITY, COMPREHENSIVE academic research paper.

TOPIC: {topic}

RESEARCH ANALYSIS:
{analysis}

{citation_section}

PAPER STRUCTURE (follow exactly):
## Title
## Abstract
(150–250 words, structured: background, objective, method, results, conclusion)

## 1. Introduction
(Background, problem statement, significance, paper structure overview)

## 2. Research Gap
(What is missing in existing literature, why this paper matters)

## 3. Objectives / Hypothesis

## 4. Literature Review
(Minimum 8 sources cited with proper {citation_label} citations)

## 5. Methodology
(Research design, data sources, analytical approach)

## 6. Key Findings / Results
(Data-driven insights, tables or lists where appropriate)

## 7. Discussion
(Interpretation, implications, limitations)

## 8. Conclusion
(Summary, future research directions)

## References
(All citations listed in {citation_label} format — minimum 10 entries)

Write at a graduate academic level. Be specific, evidence-based, and thorough.
"""
    )

    return report
