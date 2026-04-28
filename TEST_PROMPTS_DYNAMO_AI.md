# Dynamo AI — Full-Scale Test Prompts

Use these prompts to test every major feature. Work through each section in order for a complete QA session.

---

## A. COMPOSER & MENUS (UI)

| # | What to test | Action |
|---|---|---|
| A1 | Plus menu opens | Click `+` button → verify Daily + Mode Selector sections appear |
| A2 | Mode selector — Fast | Click `+` → Mode Selector → Fast → verify checkmark moves |
| A3 | Mode selector — DeepThink | Click `+` → DeepThink [PRO] → verify active state |
| A4 | Mode selector — Research | Click `+` → Research [PLUS] → verify active state |
| A5 | Plus menu More flyout | Click `+` → More → verify right-side panel appears with "Find research gaps" |
| A6 | Tools menu opens | Click ⚙️ → verify Study + Create Anything sections |
| A7 | Study More flyout | Click ⚙️ → Study → More → verify "Quiz me" + "Flashcards" open to the right |
| A8 | Create More flyout | Click ⚙️ → Create Anything → More → verify "Generate Video", "Mindmaps", "Flowcharts" |
| A9 | Mutual exclusion | Open `+` menu → then click ⚙️ → verify `+` menu closes |
| A10 | Click outside closes | Open any menu → click blank area → verify all menus close |

---

## B. FAST MODE — EVERYDAY QUESTIONS

```
1. What is the difference between machine learning and deep learning?
2. Summarise the French Revolution in 5 bullet points.
3. Explain Newton's third law with a real-world example.
4. What are the pros and cons of remote work?
5. Write a professional email declining a meeting politely.
6. Give me 3 alternative titles for a blog post about AI in education.
7. What is the current capital of Sri Lanka?
8. Convert 250 grams to ounces.
9. What does the term "confirmation bias" mean in psychology?
10. Write a 60-word product description for a smart water bottle.
```

---

## C. DEEPTHINK MODE — COMPLEX REASONING

*(Switch to DeepThink via `+` → Mode Selector → DeepThink before each prompt)*

```
1. Critically analyse the philosophical arguments for and against free will, including compatibilism, hard determinism, and libertarianism.
2. Explain how transformer architecture works in large language models, including attention mechanisms, positional encoding, and why scale matters.
3. What are the second and third-order effects of widespread AI adoption on global labour markets over the next 20 years?
4. Compare Keynesian and Austrian economic theories in their approach to business cycles and government intervention.
5. Analyse the ethical tensions in utilitarian versus deontological approaches to autonomous vehicle decision-making.
6. Why has fusion energy been "30 years away" for 70 years? What has changed technically and commercially in the last 5 years?
7. Walk me through a rigorous proof of why the square root of 2 is irrational.
8. Explain the replication crisis in psychology — its causes, the most famous failures, and what reforms have been adopted.
9. How does mRNA vaccine technology actually work at the molecular level?
10. Discuss the limitations of GDP as a measure of societal wellbeing and what alternative metrics researchers propose.
```

---

## D. RESEARCH MODE — ACADEMIC OUTPUT

*(Switch to Research Mode via `+` → Research [PLUS] before each prompt)*

```
1. Write a comprehensive academic paper on the impact of social media on adolescent mental health, with APA 7th edition citations.
2. Research the current state of CRISPR-Cas9 gene editing in treating genetic diseases — include recent trials, results, and ethical debates.
3. What does the literature say about the effectiveness of spaced repetition versus massed practice for long-term memory retention?
4. Write a literature review on renewable energy adoption barriers in developing economies.
5. Research the relationship between sleep deprivation and academic performance in university students.
6. Analyse the evidence for and against Universal Basic Income — include pilot programmes, findings, and economic modelling.
7. What are the most cited theories of motivation in organisational psychology and what do meta-analyses say about their effectiveness?
8. Write a research paper on antibiotic resistance — mechanisms, global prevalence, and novel therapeutic approaches.
9. Investigate the peer-reviewed evidence on mindfulness-based cognitive therapy (MBCT) for treatment-resistant depression.
10. Research the economic and social impact of microfinance in Sub-Saharan Africa.
```

---

## E. FIND RESEARCH GAPS

*(Run a DeepThink first, then `+` → More → Find Research Gaps)*

```
After a DeepThink on each of these topics, click "Find Research Gaps":

1. Topic: "The effects of intermittent fasting on cognitive performance"
2. Topic: "AI bias in hiring algorithms"
3. Topic: "Screen time and language development in children under 3"
4. Topic: "Carbon capture and storage viability at scale"
5. Topic: "The long-term psychological effects of pandemic lockdowns on young adults"
```

---

## F. QUICK STUDY CIRCLE [NEW]

*(⚙️ → Study → Quick Study Circle)*

```
1. "Photosynthesis — full guide for A-level biology"
2. "The water cycle — complete explanation with diagrams described"
3. "Keynesian economics — study guide for undergraduate economics"
4. "The French Revolution — key causes, events, and outcomes"
5. "Machine learning basics — glossary, concepts, and worked examples"
6. "Organic chemistry — functional groups and their reactions"
7. "Constitutional law — separation of powers, judicial review, and fundamental rights"
8. "Statistics — Type I and Type II errors, p-values, and confidence intervals"
9. "The Cold War — key phases, proxy conflicts, and resolution"
10. "Python programming — data types, loops, functions, and OOP basics"
```

---

## G. QUIZ ME

*(⚙️ → Study → More → Quiz me)*

```
1. "Quiz me on the periodic table — first 20 elements, symbols, and atomic numbers."
2. "Create a 10-question multiple choice quiz on World War II causes and key events."
3. "Quiz me on Python syntax — variables, lists, dictionaries, and basic functions."
4. "Give me a 15-question quiz on human anatomy focusing on the cardiovascular system."
5. "Quiz me on Shakespeare's Hamlet — characters, plot, and major themes."
6. "Create a quiz on basic calculus — derivatives, integrals, and chain rule."
7. "Quiz me on the Indian Constitution — fundamental rights, articles, and amendments."
8. "Give me a case-based quiz on business ethics scenarios."
9. "Quiz me on geography — capitals of all G20 nations."
10. "Quiz me on the scientific method — hypothesis, variables, controls, and analysis."
```

---

## H. DOCUMENT / PDF UPLOAD

*(⚙️ → Add photos & files — upload a PDF then ask)*

```
After uploading any research paper or document:

1. "Summarise this paper in 3 paragraphs."
2. "What is the main research question and methodology used?"
3. "List all the key claims made in the conclusion section."
4. "What sample size was used and how were participants selected?"
5. "Does this paper mention any limitations of the study? List them."
6. "Extract all statistics cited in this document."
7. "What are the references cited most frequently in this paper?"
8. "How does the introduction justify the need for this research?"
9. "Identify any contradictions or inconsistencies in the arguments made."
10. "Write a 200-word critical response to the key findings of this paper."
```

---

## I. CREATE ANYTHING — MINDMAPS

*(⚙️ → Create Anything → More → Mindmaps)*

```
1. "Create a mindmap of the causes and consequences of climate change"
2. "Create a mindmap of the human digestive system"
3. "Create a mindmap of machine learning — supervised, unsupervised, reinforcement"
4. "Create a mindmap of Shakespeare's Macbeth — themes, characters, acts"
5. "Create a mindmap of the startup funding lifecycle — from idea to IPO"
```

---

## J. CREATE ANYTHING — FLOWCHARTS

*(⚙️ → Create Anything → More → Flowcharts)*

```
1. "Create a flowchart for the scientific method"
2. "Create a flowchart for how a bill becomes a law in India"
3. "Create a flowchart for the machine learning model development process"
4. "Create a flowchart for a university admissions process"
5. "Create a flowchart for debugging a Python program"
```

---

## K. GENERATE IMAGE

*(⚙️ → Create Anything → Generate Image)*

```
1. "Create an image of the solar system with all 8 planets to scale"
2. "Generate a clean diagram of the water cycle"
3. "Create a visual infographic showing the layers of the Earth's atmosphere"
4. "Generate an illustration of DNA double helix structure"
5. "Create a historical map of the Silk Road trade routes"
```

---

## L. WEB SEARCH (LIVE DATA)

*(Enable via `+` → Daily → Web search toggle)*

```
1. "What are the latest developments in quantum computing this month?"
2. "What is India's current GDP growth rate?"
3. "What AI research papers have been published in the last 30 days?"
4. "What are the latest clinical trial results for GLP-1 weight loss drugs?"
5. "What is happening in the Israeli-Palestinian conflict right now?"
```

---

## M. VOICE INPUT

*(Tap 🎙️ mic button and speak)*

```
Speak these prompts aloud:
1. "Explain the difference between RAM and ROM"
2. "What is the capital of Australia?"
3. "Give me three synonyms for the word persistent"
4. "What year did World War Two end?"
5. "What is photosynthesis?"
```

---

## N. EXPORT & SAVE

*(Sidebar → Quick Tools → Export / Save)*

```
After generating any long response:
1. Export as PDF — check formatting, fonts, structure
2. Export as Word — open in MS Word, check editable format
3. Export as PowerPoint — verify slides are generated
```

---

## O. SMART ACTIONS — SIDEBAR

*(Sidebar → Smart Actions)*

```
Paste or generate content, then test:
1. Summarise — paste a 500-word article → click Summarise
2. Explain Simply — paste a dense paragraph → click Explain Simply
3. Create Executive Deck — paste research → click Create Executive Deck
```

---

## P. AI MEMORY

*(Profile → AI Memory)*

```
Session 1 — Tell Dynamo:
"I'm a final year computer science student specialising in AI/ML.
 My dissertation is on explainable AI in healthcare.
 I prefer IEEE citation format.
 My supervisor wants concise, evidence-based writing."

End session.

Session 2 — Start fresh chat and ask:
1. "What do you remember about me?"
2. "Summarise my research focus."
3. "Write a paragraph about my dissertation topic in my preferred style."
4. "What citation format do I use?"
```

---

## Q. FOLDERS

*(Sidebar → Folder → New Folder)*

```
1. Create a folder called "Dissertation Research"
2. Create a folder called "Exam Prep"
3. Move an existing chat into "Dissertation Research"
4. Verify the chat count updates on the folder
5. Search for a chat and verify it appears in results
```

---

## R. DARK MODE

```
1. Toggle dark mode via the moon icon in the header
2. Verify: background is dark, text is readable, all menus look correct in dark mode
3. Open plus menu in dark mode — check dropdown styling
4. Open tools menu in dark mode — check flyout styling
5. Toggle back to light mode
```

---

## S. REGRESSION — NOTHING SHOULD BREAK

These should still work exactly as before:

```
1. Send a basic message and get a reply ✓
2. New Chat button clears the conversation ✓
3. Login with anishkrisnareview@gmail.com / pink1234 ✓
4. After login: chat history appears in sidebar ✓
5. Research Mode routes through multi_model_router.py (do NOT modify this file) ✓
6. File upload via + → Add photos & files opens the file picker ✓
7. Mic button activates voice recording ✓
8. Send button and Enter key both submit messages ✓
```

---

*Last updated: April 28, 2026 — reflects Simplified Tools v3 composer, two-menu split with right-side flyouts, Quick Study Circle [NEW], updated hero text.*
