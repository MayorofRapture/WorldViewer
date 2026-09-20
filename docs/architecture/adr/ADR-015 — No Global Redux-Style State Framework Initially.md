# ADR-015 — No Global Redux-Style State Framework Initially

Status: Accepted  
Context  
Most high-frequency engine state belongs in dedicated services and immutable frame snapshots, not React. The application has modest coarse UI state.  
Decision  
Use:  
• React local/context state for UI concerns  
• explicit engine service objects for tracking/viewer/projection/world/rendering  
• repository/service boundaries for persistence  
• immutable snapshots across subsystem interfaces  
Do not add Redux or another application-wide state framework initially.  
Consequences  
• The 60 Hz engine loop stays outside React.  
• State ownership remains aligned with subsystems.  
• Less framework complexity for agents and maintainers.  
Revisit condition  
A future app-state problem must be concrete and demonstrated before adding a global state library.  
