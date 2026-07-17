# Otto Configuration

AI agent customization for this project.

## Structure

| File/Directory | Description |
|----------------|-------------|
| `otto.yaml` | Main Otto configuration (MCP server access) |
| `mcp.yaml` | MCP server definitions (GitHub, MotherDuck) |
| `agents/` | Custom agent personalities |
| `commands/` | Slash command definitions |
| `rules/` | Project-specific rules for Otto |

## Custom Agents

- **Professor Otto** (`agents/professor_otto.md`) - Extended agent for new users with detailed explanations
- **Code Reviewer** (`agents/code_reviewer.md`) - Reviews code changes and provides actionable feedback

## Commands

- `/audit_rules` - Audit project rules against learning principles
- `/learning` - Review project-specific Otto rules and commands against learning standards

## Project Rules

| Rule | Description |
|------|-------------|
| `visualizations` | Guidelines for data visualizations in artifacts |
| `learning` | Guidelines for capturing learnings and improving rules |
| `readme_maintenance` | Guidelines for maintaining README files |
| `commands` | Guidelines for Otto commands |
| `migration` | Guidelines for migrating ETL logic from other platforms |
| `monetization_strategy` | Guidance for monetization-focused YouTube intelligence interpretation |
| `data_quality_youtube` | YouTube-specific data quality handling and retention guidance |
| `api_quota_management` | Quota and rate-limit guidance for YouTube and Google Trends enrichment |
| `incremental_ingestion` | Deferred production watermark strategy for YouTube ingestion |
| `threshold_derivation` | Approved threshold gate and viral fingerprint threshold guidance |

## MCP Servers

Available MCP servers (configure access in `otto.yaml`):

- **github** - GitHub Copilot MCP (requires `GITHUB_TOKEN`)
- **motherduck** - MotherDuck MCP (requires `MOTHERDUCK_API_KEY`)