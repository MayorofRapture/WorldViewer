# ADR-013 — JSON Schema plus Separate UI Hints for World Settings

Status: Accepted  
Context  
Worlds need user-facing settings, but the host should render a consistent settings UI and own validation/persistence.  
Decision  
Use:  
• settings.schema.json — JSON Schema Draft 2020-12 as the authoritative validation/data contract  
• settings.ui.json — host-specific presentation hints keyed by JSON Pointer  
Use Ajv for schema validation. Evaluate React JSON Schema Form before writing a custom renderer.  
When the world package version changes, saved settings reset to the new package version’s schema defaults.  
Consequences  
• Validation semantics remain standards-based.  
• Presentation metadata does not contaminate data shape.  
• The host controls UI consistency.  
• The first UI may intentionally support only a modest schema subset.  
Alternatives considered  
• Custom settings JSON format — rejected in favor of a mature standard.  
• World-supplied React settings UI — rejected because it broadens host/world coupling.  
