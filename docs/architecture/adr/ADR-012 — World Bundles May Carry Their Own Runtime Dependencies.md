# ADR-012 — World Bundles May Carry Their Own Runtime Dependencies

Status: Accepted  
Context  
Sharing one Three.js/runtime copy across dynamically loaded independently built ESM worlds would require additional dependency injection, import maps, SDK/runtime packaging, or a custom resolver.  
Decision  
Allow each world package to bundle its own runtime dependencies in the first version when needed.  
Consequences  
• World builds remain straightforward and self-contained.  
• Duplicate Three.js/runtime code may increase package size and memory.  
• Only one world is active, limiting immediate runtime impact.  
• Shared-runtime optimization is deferred until measurements justify it.  
Alternatives considered  
• Import maps/shared host Three.js instance — deferred.  
• Runtime package manager/resolver — rejected as unnecessary infrastructure for the first version.  
