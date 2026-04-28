# Dynamo AI — Pricing Research & Strategy
*Prepared: April 28, 2026 · For tomorrow's pricing implementation*

---

## 1. Global Competitor Pricing (April 2026)

| Tool | Free Tier | Mid Tier | Top Tier | INR Equivalent |
|------|-----------|----------|----------|----------------|
| **ChatGPT** (OpenAI) | Limited GPT-4o mini | Plus: $20/mo | Team: $30/user | Plus ≈ ₹1,650/mo |
| **Claude** (Anthropic) | Limited Claude 3 Haiku | Pro: $20/mo | Team: $25/user | Pro ≈ ₹1,700/mo |
| **Gemini** (Google) | Gemini 1.5 Flash | Advanced: $19.99/mo | Google One AI: $19.99 | Advanced ≈ ₹1,950/mo |
| **Perplexity** | 5 Pro searches/day | Pro: $20/mo | Enterprise: custom | Pro ≈ ₹1,650/mo |
| **Notion AI** | Limited | AI add-on: $10/mo | — | ≈ ₹850/mo |
| **Copilot (Microsoft)** | Free with limits | Copilot Pro: $20/mo | M365: bundled | ≈ ₹1,650/mo |
| **Poe** | Limited | Subscriber: $19.99/mo | — | ≈ ₹1,650/mo |
| **You.com** | Free | YouPro: $15/mo | Teams: custom | ≈ ₹1,250/mo |

**Key takeaway:** Every major global competitor clusters at the $20/month (₹1,600–2,000) price point. No major player has a genuine mid-tier under $15/month.

---

## 2. India-Specific Market Context

| Factor | Data |
|--------|------|
| Average student monthly disposable income | ₹3,000–8,000 |
| Average professional monthly discretionary spend on apps | ₹500–1,500 |
| Willingness to pay for an AI subscription (survey estimate, India) | ₹150–400/mo for students · ₹500–1,200/mo for professionals |
| ChatGPT adoption rate India (paid users) | Very low — primary barrier is price |
| Most-used Indian AI tools | ChatGPT (free tier) · Gemini (free) · local alternatives |

**Insight:** The ₹20/month global tier is effectively inaccessible for most Indian students. The gap between free and ₹1,650 is enormous. This is exactly where Dynamo AI sits.

---

## 3. Dynamo AI Recommended Pricing Structure

### Free Plan — Always Free
**Goal:** Remove all friction. Let users experience the product.

| Feature | Limit |
|---------|-------|
| Chat messages | 10/day |
| Models | Fast Mode (Gemini Flash) |
| Web search | Basic |
| Voice input | ✓ |
| Export | — |
| AI Memory | — |
| Folders | 1 folder |
| Study Circle | — |
| Research Mode | — |

---

### Plus — ₹199/month (~$2.40)
**Target:** Students, researchers, learners, early professionals  
**Positioning:** "The essential plan — everything you need, at a price you don't have to think about."

| Feature | Included |
|---------|----------|
| Chat messages | 100/day |
| Models | Fast Mode + Research Mode |
| Research Mode pipeline | Claude + Gemini + GPT |
| Citation formats | All 8 (IEEE, APA, MLA, Harvard, Vancouver, Chicago, Springer, ACS) |
| Web search | Full live search |
| Voice input + TTS | ✓ |
| Document upload (PDF) | Up to 10 PDFs/month |
| Export | PDF + Word |
| AI Memory | ✓ (up to 500 memory items) |
| Folders | Unlimited |
| Quick Study Circle | Full Guide mode |
| Quiz me | ✓ |
| Generate Image | 25/month |
| Generate Video | 5/month (5 sec each) |
| Mindmaps & Flowcharts | ✓ |

**Why ₹199 works:**
- 8× cheaper than ChatGPT Plus
- Below the ₹200 psychological threshold (feels like a coffee, not a subscription)
- Within student willingness-to-pay (₹150–400/mo)
- Monthly recurring — no commitment anxiety

---

### Pro — ₹499/month (~$6.00)
**Target:** Power users, working professionals, serious researchers, founders  
**Positioning:** "The full platform — no limits, no compromises."

| Feature | Included |
|---------|----------|
| Chat messages | 300/day |
| Models | Fast + DeepThink + Research Mode |
| DeepThink Mode | ✓ (Gemini Pro with thinking) |
| Research Mode pipeline | Full |
| All citation formats | ✓ |
| Find Research Gaps | ✓ |
| Deep Research Agent | Early access when available |
| Document upload (PDF) | Unlimited |
| Export | PDF + Word + PowerPoint |
| AI Memory | ✓ (unlimited) |
| Folders | Unlimited + nested |
| Quick Study Circle | Full Guide + Advanced Only |
| Quiz me + Flashcards | ✓ |
| Radio mode | ✓ |
| Generate Image | 100/month |
| Generate Video | 25/month |
| Mindmaps, Flowcharts, Slides | ✓ |
| Priority processing speed | ✓ |
| Early access to new features | ✓ |
| Support | Priority (ticketing) |

**Why ₹499 works:**
- Still 3× cheaper than any global competitor
- Within professional discretionary spend (₹500–1,200/mo)
- The gap from Plus (₹199) to Pro (₹499) is a clear ₹300 jump — easy to justify when DeepThink and unlimited usage kick in
- Competitive against Notion AI + Perplexity individually (which would cost ₹2,500+ combined)

---

## 4. Positioning Narrative

| vs. | Price | Why Dynamo AI wins |
|-----|-------|-------------------|
| ChatGPT Plus (₹1,650) | 3–8× cheaper | Multi-model pipeline, Indian citations, memory across sessions, purpose-built tools |
| Claude Pro (₹1,700) | 3–8× cheaper | Study tools, document intelligence, mindmaps, voice — all in one place |
| Gemini Advanced (₹1,950) | 4–10× cheaper | Research gap finder, citation output, DeepThink, organised folders |
| Perplexity Pro (₹1,650) | 3–8× cheaper | Full paper generation, not just search results |
| Free AI tools | Small monthly fee | Memory, depth, citation quality, organised workspace |

**The line:** *"Not ₹2,000. Not $20. ₹499 for Pro — the full platform."*

---

## 5. Annual Billing Option (Recommended addition)

| Plan | Monthly | Annual (20% off) | Annual total |
|------|---------|-----------------|--------------|
| Plus | ₹199/mo | ₹159/mo | ₹1,908/year |
| Pro | ₹499/mo | ₹399/mo | ₹4,788/year |

Annual billing improves LTV and reduces churn. Consider adding this option when implementing the pricing page.

---

## 6. What to Implement Tomorrow

1. **Update `frontend/pricing.html`** — reflect Plus ₹199 / Pro ₹499 with the feature tables above
2. **Update plan labels in `backend/payments.py`** — verify plan IDs match new pricing
3. **Update the pricing comparison section** — show the competitor table (ChatGPT ₹1,650 · Claude ₹1,700 · Gemini ₹1,950 · Dynamo Pro ₹499)
4. **Add annual billing toggle** (optional phase 2)
5. **Update the hero/CTA copy** — "Free to start. Pro from ₹499/month."

---

*Based on April 2026 market data. Competitor prices are approximate and subject to change.*
