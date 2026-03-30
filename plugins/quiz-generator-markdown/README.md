# Quiz Generator aus Markdown

This plugin reads the current markdown note, extracts prompts from headings and list structure, and writes a quiz file that the exam simulator can use directly.

The output stays compatible with plain YAML workflows and `Metadata Menu`.

## Generation modes

- `rule-based`: local generation from headings, lists, and emphasized content
- `ai-enhanced`: BYOK-backed generation with better distractors, difficulty hints, and explanations

## BYOK

Supported providers:

- OpenAI
- OpenRouter
- custom OpenAI-compatible endpoints

If AI generation fails, the plugin falls back to the rule-based path.

## Manual QA

- configure provider/model and run the connection test
- generate a quiz from a study note in both modes
- open the resulting quiz in `pruefungs-simulator`
- verify YAML metadata such as `source_note`, `quiz_origin`, and `last_ai_generated`
