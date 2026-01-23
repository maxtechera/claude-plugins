---
name: growth-tactics
description: Funnel optimization strategies, A/B testing frameworks, and conversion tactics.
---

# Growth Tactics Skill

Frameworks for optimizing funnels, running experiments, and increasing conversions.

## When to Use This Skill

- Analyzing funnel performance
- Designing A/B tests
- Identifying growth opportunities
- Optimizing conversion rates
- Planning growth experiments

---

## Funnel Analysis Framework

### The Basic Funnel

```
AWARENESS → INTEREST → DESIRE → ACTION → RETENTION
   ↓          ↓         ↓        ↓         ↓
 Reach     Clicks    Leads    Sales    Repeat
```

### Funnel Metrics Table

| Stage | Metric | Benchmark | Your Number |
|-------|--------|-----------|-------------|
| Awareness | Impressions | - | |
| Interest | Click Rate | 2-5% | |
| Desire | Lead Capture | 15-30% | |
| Action | Conversion | 1-5% | |
| Retention | Repeat Rate | 20-40% | |

### Finding Leaks

**The Leak Principle**: Fix the worst leak first.

```
Impressions:     10,000
Clicks:          200 (2% CTR)      ← If low, fix ad/content
Visitors:        190 (95% load)    ← If low, fix speed
Leads:           30 (15.8%)        ← If low, fix landing page
Sales:           3 (10%)           ← If low, fix offer/price
Repeat:          1 (33%)           ← If low, fix retention
```

**Formula**: Find biggest drop-off percentage. That's your leak.

---

## A/B Testing Framework

### Test Hierarchy

Test in this order (highest impact first):

1. **Offer** - What you're selling
2. **Audience** - Who you're selling to
3. **Message** - How you describe it
4. **Creative** - Visual presentation
5. **Placement** - Where it appears

### Sample Size Calculator

```
Minimum sample per variant = 100 / (expected lift%)

Example:
- Expecting 10% improvement
- Need 100/10 = 10 conversions per variant minimum
- At 2% conversion rate, need 500 visitors per variant
- Total test: 1,000 visitors
```

### Test Documentation Template

```markdown
## Test: [Name]

**Hypothesis**: If we [change], then [metric] will [improve] because [reason]

**Variants**:
- Control: [Current state]
- Variant A: [Change 1]
- Variant B: [Change 2] (optional)

**Primary Metric**: [What we're measuring]
**Secondary Metrics**: [Supporting metrics]

**Sample Size**: [X visitors per variant]
**Duration**: [X days/weeks]

**Results**:
| Variant | Visitors | Conversions | Rate | Lift |
|---------|----------|-------------|------|------|
| Control | | | | - |
| A | | | | |

**Decision**: [Implement / Iterate / Kill]
**Learning**: [What we learned]
```

### Statistical Significance

| Confidence Level | When to Use |
|------------------|-------------|
| 90% | Quick decisions, low risk |
| 95% | Standard practice |
| 99% | High-stakes decisions |

**Rule**: Don't end test early. Let it run full duration.

---

## Conversion Optimization Tactics

### Landing Page Checklist

- [ ] Headline matches ad/link that sent them
- [ ] Clear, single CTA above the fold
- [ ] Social proof visible (testimonials, logos, numbers)
- [ ] Benefits before features
- [ ] Urgency element (if genuine)
- [ ] Mobile optimized
- [ ] Load time < 3 seconds

### CTA Optimization

| Element | Test Options |
|---------|--------------|
| Copy | Action-oriented vs benefit-focused |
| Color | High contrast vs brand colors |
| Size | Larger vs current |
| Position | Above fold, after benefit, sticky |
| Urgency | With deadline vs without |

### Form Optimization

| Fields | Conversion Impact |
|--------|-------------------|
| Email only | Baseline (100%) |
| Email + Name | -10-15% |
| Email + Name + Phone | -25-30% |
| Multi-step | +10-20% vs single long form |

**Rule**: Every field costs conversions. Only ask what's essential.

---

## Growth Experiment Framework

### ICE Scoring

Rate each idea 1-10:

| Factor | Question |
|--------|----------|
| **I**mpact | How much will this move the needle? |
| **C**onfidence | How sure are we it will work? |
| **E**ase | How easy is it to implement? |

**Score** = (I + C + E) / 3

**Prioritize**: Highest ICE score first.

### Experiment Velocity

**Target**: 2-3 experiments per week

| Week | Experiment | ICE | Result |
|------|------------|-----|--------|
| 1 | [Test 1] | 7.3 | +12% |
| 1 | [Test 2] | 6.8 | No change |
| 2 | [Test 3] | 8.1 | +23% |

### Learning Repository

After each experiment, log:
- What we tried
- What we expected
- What happened
- Why we think it happened
- What we'll try next

---

## Channel-Specific Tactics

### Email

| Tactic | Expected Lift |
|--------|---------------|
| Personalized subject line | +10-15% open |
| Send time optimization | +5-10% open |
| Re-send to non-openers | +50% total opens |
| Segmented content | +15-25% click |

### Landing Pages

| Tactic | Expected Lift |
|--------|---------------|
| Video above fold | +20-30% time on page |
| Exit intent popup | +2-5% captures |
| Live chat widget | +10-20% conversions |
| Trust badges | +5-10% conversions |

### Paid Ads

| Tactic | Expected Lift |
|--------|---------------|
| Specific numbers in copy | +15-25% CTR |
| Face in image | +20-30% CTR |
| Retargeting warm traffic | +50-100% ROAS |
| Lookalike audiences | +30-50% quality |

---

## Retention Tactics

### The First 7 Days

| Day | Action | Goal |
|-----|--------|------|
| 0 | Welcome email | Set expectations |
| 1 | Quick win | First value delivery |
| 3 | Check-in | Engagement nudge |
| 5 | Social proof | Reinforce decision |
| 7 | Next step | Deepen engagement |

### Churn Prevention

| Signal | Action |
|--------|--------|
| No login 7 days | Re-engagement email |
| Reduced usage | Check-in call |
| Support ticket | Priority response |
| Cancel intent | Save offer |

### Reactivation

| Segment | Approach |
|---------|----------|
| 30-day inactive | "We miss you" + incentive |
| 60-day inactive | Survey + big incentive |
| 90-day+ inactive | Last chance + new features |

---

## Quick Wins Checklist

Fastest improvements to try first:

- [ ] Add urgency to CTA (if genuine)
- [ ] Reduce form fields
- [ ] Add testimonial near CTA
- [ ] Test headline variations
- [ ] Improve page speed
- [ ] Add live chat
- [ ] Implement exit intent
- [ ] Create retargeting campaign
- [ ] Segment email list
- [ ] A/B test email subject lines

---

## Metrics Dashboard

Track weekly:

| Metric | This Week | Last Week | Change |
|--------|-----------|-----------|--------|
| Traffic | | | |
| Conversion Rate | | | |
| New Leads | | | |
| New Customers | | | |
| Revenue | | | |
| CAC | | | |
| LTV | | | |

**Focus**: Improve ONE metric per week.
