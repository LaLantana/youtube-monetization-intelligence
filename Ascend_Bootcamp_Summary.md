# Ascend.io Agentic Data & Analytics Bootcamp — Complete Summary

## Overview

The Ascend.io Agentic Data & Analytics Bootcamp is a two-day hands-on program (April 1–2, 2026) that teaches participants how to build data pipelines using agentic AI systems. The platform's AI agent, **Otto**, is the central tool — participants direct Otto using natural language prompts rather than writing code themselves. The bootcamp culminates in a real-world project: building a carbon optimization pipeline for a UK manufacturing company.

The program is structured across two days with two specialized tracks on Day 2, plus a post-bootcamp hackathon.

---

## High-Level Outline of All Labs

### Day 1: Foundations

**Hands-On Lab: Getting Agentic** — Sign up for Ascend, build a first data pipeline with Otto, and learn the Context, Tools, and Triggers framework that underpins agentic systems.

### Day 2, Track 1: Agentic Data Engineering (for data engineers and platform teams)

**Lab 1: The Modern Lakehouse** — Connect Ascend to a lakehouse/warehouse (Microsoft Fabric OneLake, Snowflake, BigQuery, or MotherDuck) as the storage and compute layer.

**Lab 2: Programmatic Agentic Systems** — Program Otto's behavior by creating custom rules (always-on, glob-scoped, keyword-scoped), commands, agents, and MCP server connections.

**Lab 3: Agentic Automation** — Build a full carbon + operations optimization pipeline from a single prompt, schedule it for daily execution, wire up failure alerting with automated diagnosis, and capture accumulated knowledge.

### Day 2, Track 2: Agentic Analytics (for analysts and data practitioners)

**Lab 1: Agentic Analysis** — Build the same carbon + operations optimization pipeline from a single prompt, but from an analyst's perspective (no code required).

**Lab 2: Verifying Agent Output** — Develop the skill of verifying agentic output: explore data, inspect code logic, check constraints, build stakeholder-ready visualizations, and create an executive summary.

**Lab 3: Repeatable Workflows** — Make the pipeline production-ready by fixing hardcoded dates, scheduling daily runs, adding carbon intensity spike alerts, and setting up failure notifications.

---

## Detailed Steps and Summaries by Lab

### Day 1 — Hands-On Lab: Getting Agentic

**Purpose:** Establish foundational understanding of agentic data engineering.

**Steps taken:**

1. **Sign up for Ascend** — Create a free trial at app.ascend.io using Google, LinkedIn, Microsoft, GitHub, or email.

2. **Complete onboarding** — Select "Start with Otto's Expeditions" when prompted. Paste a detailed prompt asking Otto to build a first data pipeline using synthetic goats.csv data with a file reader, SQL transform, and Python transform.

3. **Watch Otto work** — Observe the agent loop: Otto receives a prompt (Trigger), gathers Context from the workspace and system instructions, then uses Tools (file creation, query execution, visualization) to build the pipeline iteratively.

4. **Tour the platform** — Explore key areas: Otto's configuration directory (otto/ with rules, commands, agents, MCP), Workspaces, Super Graph, Flow Graph, Toolbar, Deployments, and Settings.

**Why these steps matter:** This lab introduces the three-pillar framework — Context, Tools, and Triggers — that governs all agentic behavior. Participants see firsthand that agents aren't just chat interfaces; they have persistent memory (rules), configurable behavior (agents/commands), and the ability to take real actions (tools). The onboarding prompt also demonstrates that a well-structured request can produce a working pipeline without manual coding.

---

### Track 1, Lab 1: The Modern Lakehouse

**Purpose:** Connect the compute/storage layer that will power production pipelines.

**Steps taken:**

1. Sign into Microsoft Fabric at app.fabric.microsoft.com
2. Create a workspace and assign it Fabric capacity
3. Create a lakehouse (e.g., bootcamp_lakehouse) backed by OneLake
4. Load or explore data via pipelines, notebooks, or data tools

**Why these steps matter:** A data pipeline needs a place to store and process data. This lab establishes the "Data Plane" — the lakehouse that Ascend writes to and reads from. Without this foundation, subsequent labs that build real pipelines would have nowhere to persist results.

---

### Track 1, Lab 2: Programmatic Agentic Systems

**Purpose:** Teach Otto how to behave for your specific enterprise context.

**Steps taken:**

1. **Explore the otto/ directory** — Understand the structure: agents/, commands/, rules/, and mcp.yaml.

2. **Write an always-on rule (learning.md)** — Create a rule that prompts Otto to reflect on conversations and capture new knowledge into rule files. This rule fires in every conversation.

3. **Write scoped rules:**
   - **Glob-scoped rule (code_standards_python.md)** — Enforces Python coding standards (docstrings, type hints, descriptive variable names, explicit error handling). Only fires when Otto works with *.py files.
   - **Keyword-scoped rule (operations_scheduling.md)** — Defines the specific constraints for carbon-optimized machine scheduling (which machines are schedulable, ±8 hour shift boundary limits, specific trigger phrases). Only fires when specific phrases appear in the prompt.

4. **Create a learning command** — Build a reusable command at otto/commands/learning.md that forces Otto to review the current conversation and propose rule updates.

5. **(Optional) Create a custom Data Quality Agent** — A specialized agent with low temperature (0.1) that acts as a quality gate, inspecting data freshness, completeness, and schema consistency.

6. **(Optional) Connect an MCP server** — Wire Otto into external tools (e.g., Slack) for cross-tool workflows.

**Why these steps matter:** This lab is about **context engineering** — the practice of shaping what information an agent has access to and when. Without scoped rules, every conversation would be bloated with irrelevant instructions. The glob and keyword scoping ensures Otto gets deep expertise precisely when needed while keeping the context window clean otherwise. The learning command creates a feedback loop: every session makes Otto smarter for the next one. This lab directly sets up Lab 3, where the rules silently shape the pipeline Otto builds.

---

### Track 1, Lab 3: Agentic Automation

**Purpose:** Build a production-grade carbon optimization pipeline, schedule it, and add intelligent alerting.

**Steps taken:**

1. **Build the pipeline from a single prompt** — Paste one comprehensive prompt that instructs Otto to: create a plan first for approval, ingest 30 days of weather and carbon intensity data from live APIs, build a predictive model, layer in operations data, and produce an interactive dashboard. Otto takes 50+ actions to build, test, and debug the full pipeline iteratively.

2. **Review the plan** — Before building, inspect Otto's markdown plan file for correct API endpoints, carbon price assumptions (£85/ton), tariff values, use of the schedulable column, and iterative build approach.

3. **Orchestrate the pipeline** — Create an Automation YAML file to schedule the flow to run daily at midnight UTC.

4. **Add failure alerting** — Create a separate Automation that triggers on FlowRunFailure events, sending an email with Otto's root cause analysis and proposed fix.

5. **Capture what Otto learned** — Run the @command/learning.md command to have Otto review the entire conversation and distribute new knowledge into appropriate rule files.

**Why these steps matter:** This is where everything converges. The rules from Lab 2 silently guide Otto's code — the Python standards rule shapes the code quality, and the operations scheduling rule ensures the optimization respects real-world constraints (only schedulable machines, ±8 hour boundaries). The "plan first" pattern prevents drift on complex tasks. The automation and alerting steps transform a one-time analysis into an autonomous system that runs, monitors itself, and diagnoses failures without human intervention.

---

### Track 2, Lab 1: Agentic Analysis

**Purpose:** Build the same carbon optimization pipeline from an analyst's perspective.

**Steps taken:**

1. **Build the data pipeline with a single prompt** — Same comprehensive prompt as Track 1 Lab 3, but framed for analysts who won't be writing code. Otto handles all Python, SQL, and API calls.

2. **Review the plan** — Inspect Otto's proposed architecture for correct data sources, constraints, and approach.

3. **Verify the pipeline** — Ask Otto for a summary of optimization results: how many machines can be rescheduled, projected savings.

**Why these steps matter:** This lab demonstrates that analysts can produce the same engineering output as data engineers by directing an agent with well-structured prompts. The key skill being taught is prompt authorship — knowing what to ask for and how to specify constraints clearly enough that the agent can execute autonomously.

---

### Track 2, Lab 2: Verifying Agent Output

**Purpose:** Develop the critical skill of verifying AI-generated results before sharing with stakeholders.

**Steps taken:**

1. **Explore the data** — Ask probing questions: which facilities have the biggest savings, which machines are rescheduled most, what assumptions were made without asking.

2. **Verify the code** — Inspect the SQL transforms: Does scheduling logic respect schedulable=true? Are ±8 hour boundaries enforced? What carbon price is used?

3. **Verify the data** — Check underlying tables for null values, missing facilities, alignment of timestamps and shift patterns.

4. **Build visualizations** — Create an executive-ready visualization showing optimal operation windows, reschedulable vs. fixed operations, and savings breakdowns.

5. **Create an executive summary** — Save the artifact to the project for sharing with stakeholders.

**Why these steps matter:** This lab teaches the most underrated skill in working with AI: knowing when and how to verify. AI rarely produces obviously wrong answers — it produces reasonable answers with buried assumptions. The three-check framework (understand the output, inspect the code, check the data) takes only five minutes but is the difference between building a reputation for reliable insights versus occasionally sending leadership something embarrassing.

---

### Track 2, Lab 3: Repeatable Workflows

**Purpose:** Transform a one-time analysis into a production-ready automated system.

**Steps taken:**

1. **Fix read components** — Ask Otto to review all read components for hardcoded dates or static time windows and replace them with dynamic date calculations.

2. **Schedule the pipeline** — Create an Automation YAML file for daily midnight UTC runs.

3. **Add a carbon intensity threshold alert** — Create a separate Automation triggered on successful flow runs that reviews the 7-day forecast and emails when any schedulable machine is scheduled during a high-carbon window (top 25% of forecasted hours).

**Why these steps matter:** A pipeline that only runs when you manually trigger it isn't infrastructure — it's a one-off. This lab closes the gap between "interesting analysis" and "production system." Dynamic dates ensure freshness, scheduling ensures reliability, and threshold alerts turn passive reports into proactive intelligence that drives action.

---

## All Prompts Used and Prompting Analysis

### Prompt 1 — First Pipeline (Day 1)

> Help me create my first data pipeline. Use the synthetic Otto's Expeditions data, specifically the `goats.csv` file. Create a new Flow named `goats_demo` with 3 components: a file reader, a SQL Transform, a Python Transform. Iterate until the Flow run ends to end. Then, create a visualization for me to explore the data.

**Prompting elements and why they work:**

- **Specific data source** ("goats.csv" from Otto's Expeditions): Eliminates ambiguity about what data to use. Without this, Otto might guess or ask clarifying questions, slowing the workflow.
- **Named output** ("goats_demo"): Gives the agent a concrete target for the Flow name, reducing decisions the agent needs to make.
- **Explicit component list** (file reader, SQL Transform, Python Transform): Specifies the architecture rather than leaving it open-ended. This constrains the agent's design space to exactly what the instructor wants demonstrated.
- **Iterative instruction** ("Iterate until the Flow run ends to end"): Tells the agent to self-correct rather than stop at the first error — a key pattern for agentic loops.
- **End-state deliverable** ("create a visualization"): Defines the done condition clearly.

---

### Prompt 2 — Always-On Rule (Track 1, Lab 2)

> Create an always-on Otto rule file at otto/rules/learning.md. This rule should prompt you to reflect on conversations and add or update rule files with any new knowledge using context engineering best practices.

**Prompting elements and why they work:**

- **Exact file path** (otto/rules/learning.md): Removes ambiguity about where the file should live and what it should be named. Critical for projects with specific directory structures.
- **Behavioral specification** ("prompt you to reflect on conversations"): Describes the desired behavior rather than prescribing the exact content — gives the agent creative latitude while constraining the intent.
- **Framework reference** ("context engineering best practices"): Anchors the output to an established methodology, producing higher-quality results than a vague "make it good."

---

### Prompt 3 — Glob-Scoped Rule (Track 1, Lab 2)

> Create a glob-scoped Otto rule at otto/rules/code_standards_python.md that applies to Python files (*.py). It should enforce these standards: 1. Every function must have a docstring describing its purpose 2. Use type hints for all function parameters and return values 3. Use descriptive variable names — no single-letter variables except loop counters 4. Handle errors explicitly with try/except blocks — never silently swallow exceptions. Use the standard otto rule YAML frontmatter with globs for *.py files.

**Prompting elements and why they work:**

- **Scoping specification** ("glob-scoped... applies to Python files"): Tells the agent the trigger mechanism, not just the content.
- **Numbered, specific standards**: Each rule is concrete and testable (not "write good code" but "every function must have a docstring"). Numbered lists help agents produce structured, complete output.
- **Negative constraints** ("no single-letter variables except loop counters," "never silently swallow exceptions"): Negative examples are powerful — they close loopholes the agent might exploit.
- **Format instruction** ("Use the standard otto rule YAML frontmatter"): Specifies the expected output format, preventing the agent from inventing its own.

---

### Prompt 4 — Keyword-Scoped Rule (Track 1, Lab 2)

> Write a very concise keyword-scoped rule at otto/rules/operations_scheduling.md. This rule defines the constraints for optimizing operations scheduling based on carbon intensity: 1. Not all machines can be rescheduled. The machines dataset has a `schedulable` column — only machines where schedulable=true can be moved. 2. Non-schedulable machines include assembly lines, stamping presses, welding lines, battery assembly, real-time AI inference, and data processing pipelines. 3. Schedulable machines include paint ovens, test rigs, AI training clusters, CNC mills, laser cutters, injection molders, 3D printer farms, sensor calibration, and casting/heat treatment equipment. 4. Rescheduling is limited to within shift boundaries — a maximum of ±8 hours. 5. The rule should be keyword-scoped to very specific phrases like "optimal operations windows", "rescheduling machine operations" or "optimizing machine scheduling" rather than "scheduling" or "operations" which are too general. Keep the rule short and actionable.

**Prompting elements and why they work:**

- **Domain-specific constraints with exact values**: Provides the precise business rules (schedulable=true, ±8 hours) the agent needs to encode correctly.
- **Positive and negative examples in tandem**: Lists both what IS schedulable and what ISN'T, leaving no ambiguity.
- **Scoping rationale** ("we discuss scheduling and machine operations often in different contexts"): Explains WHY keyword scoping matters, helping the agent choose appropriately narrow trigger phrases.
- **Anti-pattern warning** ("rather than 'scheduling' or 'operations' which are too general"): Explicitly prevents the most likely mistake — over-broad keywords that would fire in unrelated conversations.
- **Brevity instruction** ("very concise," "short and actionable"): Prevents the agent from over-engineering the rule with unnecessary prose.

---

### Prompt 5 — Learning Command (Track 1, Lab 2)

> Create a custom Otto command called "learning" at otto/commands/learning.md. When invoked, this command should prompt Otto to review the current conversation for new patterns, conventions, mistakes, or lessons learned — then propose creating new rule files or updating existing ones. Each learning should go into a rule file where it belongs (not all dumped into one file). Rules should be very concise and to the point and use keyword scoping as needed. Wait for confirmation before making changes.

**Prompting elements and why they work:**

- **Distribution instruction** ("Each learning should go into a rule file where it belongs, not all dumped into one file"): Prevents the most common failure mode — a single catch-all file that bloats context.
- **Safety guardrail** ("Wait for confirmation before making changes"): Keeps the human in the loop for knowledge base modifications — critical for trust.
- **Quality standards** ("very concise and to the point"): Prevents verbose rules that waste context window space.

---

### Prompt 6 — Custom Agent (Track 1, Lab 2)

> Create a custom Otto agent at otto/agents/data_quality_agent.md. This agent should: Be named "Data Quality Agent," Use a low temperature (0.1) for consistent, precise validation, Have access to all tools. Its instructions should tell it to: 1. Act as a data quality analyst, not a pipeline builder 2. Inspect components in a flow ensuring that data is fresh and complete and schema is consistent 3. Check code for effective data quality tests 4. Produce a clear report of any issues identified or recommendations for improvement.

**Prompting elements and why they work:**

- **Role definition with anti-role** ("data quality analyst, not a pipeline builder"): Constrains the agent's identity and prevents scope creep into building things when it should only be validating.
- **Technical parameter** (temperature 0.1): Shows awareness that validation requires consistency and precision, not creativity.
- **Structured output expectation** ("clear report of any issues identified"): Defines the expected deliverable format.

---

### Prompt 7 — Full Pipeline Build (Track 1 Lab 3 / Track 2 Lab 1)

This is the most significant prompt in the bootcamp — a single, detailed instruction that produces an entire data pipeline. Key elements:

> We want to create a brand new flow. Before you build anything, I want you to create a plan in a markdown file and put it in a plan folder first that I will approve.

**"Plan first" pattern**: Forces the agent to reason through the full problem before writing code. This catches misunderstandings early and gives the agent a reference document to check against during the build, reducing drift.

> Use custom Python read components to ingest hourly weather data (from the OpenMeteo API - https://open-meteo.ascend.dev/) and carbon data (UK Carbon Intensity API - https://uk-carbon-intensity.ascend.dev/intensity) for the past 30 days. I only need the following latitude, longitude: (53.4808,-2.2426), (52.4862, -1.8904), (53.8008, -1.5491), (51.4545, -2.5879), (51.5074, -0.1278)...

**Exact URLs, coordinates, and parameters**: Leaves nothing to the agent's imagination for data sourcing. Hardcoded values prevent the agent from inventing or approximating.

> These ingestion components should gracefully handle schema changes, rate limits, and retries with exponential backoff. Use the live APIs only (never mock or fabricate data). Inspect a real sample response from each endpoint directly from the endpoint URL using HTTP before implementing parsing logic. You must inspect live API responses from the exact endpoint URLs you will implement against before writing any parser code, and you must use those observed payloads—not documentation summaries—as the source of truth for response structure.

**Anti-hallucination guardrails**: The instruction to inspect live API responses before coding parsers prevents the agent from guessing at response schemas based on documentation (which may be outdated). This is one of the most sophisticated prompting patterns in the bootcamp — it forces the agent to ground its work in observed reality.

> Use a carbon price assumption of £85/ton CO2 and use fixed tariff values of £0.135/kWh off-peak, £0.145/kWh mid-peak, and £0.155/kWh on-peak

**Hardcoded business constants**: Removes the risk of the agent inventing or looking up incorrect values.

> Only recommend a reschedule when total_savings_gbp > 0 and carbon_savings_kg > 0. And only evaluate machines where schedulable = true

**Boolean filter conditions**: Explicit, testable constraints that are easy to verify in the output.

> IMPORTANT NOTES: Please make sure to build iteratively, running and testing components to validate that the output makes sense and understand the schema before building downstream components. Each time you make changes to correct an error, only run the component that you are fixing, you do not need to run the full flow. Once the whole pipeline is complete, then run it end to end.

**Process instructions**: Tells the agent HOW to work, not just what to build. The iterative build-and-test approach prevents cascading errors — if a read component returns unexpected data, the agent catches it before building downstream transforms on incorrect assumptions. The efficiency instruction ("only run the component you're fixing") saves time and compute.

---

### Prompt 8 — Schedule Automation (Track 1 Lab 3 / Track 2 Lab 3)

> Create an Automation YAML file for this Flow to run daily at midnight UTC.

**Prompting elements**: Simple, direct, and complete. When the task is straightforward, a concise prompt outperforms an over-specified one.

---

### Prompt 9 — Failure Alerting (Track 1, Lab 3)

> Create a separate Automation YAML file for this flow. It should trigger on a FlowRunFailure event. The automation should: 1. Send me an email alert 2. Include Otto's root cause analysis of why the run failed 3. Include a proposed fix

**Prompting elements and why they work:**

- **Explicit trigger type** (FlowRunFailure): Specifies the exact event, not a vague "when something goes wrong."
- **Agentic diagnosis requirement**: The alert isn't just a notification — it includes AI-generated analysis, making this an automation that thinks rather than just reports.
- **Actionable output** ("proposed fix"): Goes beyond diagnosis to recommendation, reducing time-to-resolution.

---

### Prompt 10 — Verification Questions (Track 2, Lab 2)

> Give me an overview of the pipeline you built. How did you go about building it? What assumptions did you make without asking me?

**Prompting elements**: The question "What assumptions did you make without asking me?" is particularly powerful — it forces the agent to surface hidden decisions, which is exactly where errors hide.

> Which machines are currently scheduled during the highest carbon intensity windows? Show me the top 10 worst offenders.

**Prompting elements**: Asks for a ranked, bounded result ("top 10") rather than an open-ended data dump.

> Create a visualization we can share with our operations leaders detailing the optimal operation windows for each machine and facility as well as clear cost savings for the next week of operations. Show both the operations we can reschedule and the ones that are already optimal or can't be moved. The result should be an executive summary of the impact of switching our scheduling from static weekly operations, to optimized windows each week.

**Prompting elements**: Defines the **audience** (operations leaders), the **content** (optimal windows, cost savings), the **scope** (next week), and the **narrative frame** (static vs. optimized comparison). This is stakeholder-aware prompting — it tells the agent not just what to show but who will see it and what story it should tell.

---

### Prompt 11 — Production Readiness (Track 2, Lab 3)

> I want to make sure I can run this flow everyday with updated weather and carbon data. Can you review these read components in my flow for production readiness. Check for hardcoded dates or static time windows. Fix anything you find and run the flow to confirm it still works.

**Prompting elements**: States the goal (daily runs), the concern (hardcoded dates), the action (fix and test). The instruction to "run the flow to confirm" adds a verification step that closes the loop.

---

### Prompt 12 — Carbon Spike Alert (Track 2, Lab 3)

> Create a separate Automation (don't modify the daily schedule) for this flow that triggers on flow run successes. The automation should: 1. Run Otto to review the carbon intensity forecast for the next 7 days 2. When any schedulable machine is currently scheduled to run during a high carbon intensity window (top 25% of forecasted hours), send me an email 3. The email should include which machines are affected, which facility they're in, what the current and optimal time windows are, and the projected savings from rescheduling

**Prompting elements and why they work:**

- **Explicit non-modification instruction** ("don't modify the daily schedule"): Prevents a common agent mistake of overwriting existing automation.
- **Quantified threshold** ("top 25% of forecasted hours"): Defines "high carbon intensity" precisely.
- **Detailed email specification**: Lists exactly what data points the email must contain, preventing generic alerts.

---

## Summary of Key Prompting Principles Demonstrated

1. **Plan before building**: Force the agent to create a reviewable plan before executing. Catches errors when they're cheap to fix.

2. **Specify exact values and paths**: URLs, coordinates, file paths, and business constants should be hardcoded in the prompt, not left to the agent's discretion.

3. **Anti-hallucination guardrails**: Instruct agents to inspect real data before building parsers or models. Ground work in observed reality, not documentation summaries.

4. **Iterative build-and-test**: Tell the agent to validate each component before building the next. Prevents cascading errors.

5. **Scoped context**: Use glob and keyword scoping for rules so the agent gets deep expertise precisely when needed without context window bloat.

6. **Negative constraints**: Tell agents what NOT to do (don't mock data, don't use single-letter variables, don't modify existing automation) to close loopholes.

7. **Audience-aware deliverables**: Specify who will see the output and what story it should tell.

8. **Safety guardrails**: Include human checkpoints ("wait for confirmation"), bounded autonomy (50-action pause), and verification steps.

9. **Knowledge capture loops**: Use learning commands to systematically capture what the agent discovers, building a compounding knowledge base.

10. **Process instructions alongside content instructions**: Tell agents HOW to work (iteratively, test each component, only re-run what you fixed) not just WHAT to produce.
