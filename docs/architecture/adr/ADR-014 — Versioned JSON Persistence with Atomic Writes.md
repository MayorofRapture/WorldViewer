# ADR-014 — Versioned JSON Persistence with Atomic Writes

Status: Accepted  
Context  
Initial persisted data is small: app state, display profiles, calibration profiles, package-directory configuration, and per-world-version settings. There is no current need for relational queries, transactions across large datasets, or concurrent writers.  
Decision  
Use small versioned JSON documents in the Tauri app-data/config area. Validate on read. Write critical files atomically using temp-write plus replace/rename semantics.  
Do not introduce SQLite initially.  
Consequences  
• Data remains human-readable and easy to inspect during development.  
• Diagnostic/AI workflows can understand configuration easily.  
• Schema versions and migration/recovery behavior are still required.  
• Atomic-write implementation belongs behind the native host boundary.  
Revisit condition  
Adopt SQLite only if later requirements introduce meaningful history, indexing, scale, or transactional complexity.  
