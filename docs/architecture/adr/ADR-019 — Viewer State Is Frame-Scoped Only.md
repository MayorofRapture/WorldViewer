# ADR-019 — Viewer State Is Frame-Scoped Only

Status: Accepted  
Context  
A live getViewerState() accessor would let event-driven world code query the viewer at arbitrary times, but it would introduce timing-dependent behavior that is harder to reproduce.  
Decision  
Worlds receive immutable ViewerState only through WorldFrame in update(). Do not expose a separate getViewerState() accessor in the initial API.  
Consequences  
• Every world update sees one coherent viewer snapshot.  
• Simulation behavior is easier to replay and test.  
• Event-driven code that needs viewer context must use state captured from the current/most recent world frame.  
• The host API stays smaller.  
Alternative considered  
Read-only getViewerState() — rejected for initial scope because the convenience does not outweigh the loss of deterministic timing semantics.  
