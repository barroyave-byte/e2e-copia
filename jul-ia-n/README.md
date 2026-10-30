# jul-IA-N 🤖🧪

**jul-IA-N** is an Artificial Intelligence agent focused on **detecting, analyzing, and evaluating Playwright errors**, helping reduce deployment cycles and saving time for the QA team and the entire company.

The name is intentional.

## What is jul-IA-N?

jul-IA-N is an **AI Ngent** (IA + Agent) designed to assist in the identification of failures in automated tests. It helps teams understand **what failed, why it failed, and how to fix it**, turning raw Playwright errors into actionable insights.

By automating repetitive error analysis, jul-IA-N frees QA engineers to focus on higher-value work.

## Name origin

The name **jul-IA-N** is a wordplay inspired by **Julian**, the Senior QA engineer who traditionally performed this analysis manually — often spending **around 10 hours** doing so.

Each part of the name has a clear meaning:

- **jul** → Julian  
  The human expert who originally handled Playwright error analysis.
- **IA** → Artificial Intelligence  
  The intelligence now performing the analysis.
- **N (Ngent)** → *IA Agent*  
  An autonomous agent that observes, analyzes, and acts on test failures.


## How to run

1. You need OPEN AI api key, place it in .env

```
// .env
OPENAI_API_KEY=sk-sv*******
```

2. install dependencies
```
npm install
```

3. run
```
npm run jul-ia-n path_to_json
