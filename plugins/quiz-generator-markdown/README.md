# Quiz Generator aus Markdown

This plugin reads the current markdown note, extracts prompts from headings and list structure, and writes a quiz file that the exam simulator can use directly.

The output stays compatible with plain YAML workflows and `Metadata Menu`.

## Generation modes

- `rule-based`: local generation from headings, lists, and emphasized content
- `ai-enhanced`: BYOK-backed generation with better distractors, difficulty hints, and explanations
- preview modal before writing the quiz note
- settings-level provider test with visible status feedback

## BYOK

Supported providers:

- OpenAI
- OpenRouter
- custom OpenAI-compatible endpoints

If AI generation fails, the plugin falls back to the rule-based path.

## Typical flow

1. Open a study note.
2. Choose `rule-based` or `ai-enhanced` in settings.
3. If AI is enabled, run the provider connection test once.
4. Open the quiz preview.
5. Save the generated quiz and run it in `pruefungs-simulator`.

## Manual QA

- configure provider/model and run the connection test
- confirm the connection status text updates in settings
- generate a quiz from a study note in both modes
- open the preview modal before saving
- open the resulting quiz in `pruefungs-simulator`
- verify YAML metadata such as `source_note`, `quiz_origin`, and `last_ai_generated`
