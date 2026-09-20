# ADR-011 — Prebuilt ESM World Bundles Loaded at Runtime

Status: Accepted, validate in Milestone 0  
Context  
World packages need to be added independently without recompiling the host. World Viewer should not become a runtime TypeScript compiler or package manager.  
Decision  
Each package provides a prebuilt browser-compatible ESM entry bundle declared in world.manifest.json. World Viewer dynamically loads that bundle from the validated local package root.  
The exact Tauri/WebView2 local-module transport/URL mechanism is intentionally not frozen until a packaged Milestone 0 spike proves it.  
Consequences  
• Worlds can use their own development toolchains.  
• Host runtime remains small and predictable.  
• Dynamic local module loading becomes a high-priority packaged integration test.  
• Remote module imports are prohibited.  
Rejected fallback by default  
Reading arbitrary JavaScript text and evaluating it via eval/Blob/data URLs is not the preferred design because of CSP/security tradeoffs.  
