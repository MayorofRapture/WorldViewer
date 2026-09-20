# ADR-008 — Engine-Owned Off-Axis Projection

Status: Accepted  
Context  
The virtual-window illusion requires the physical display to act as a fixed aperture. Conventional symmetric perspective plus camera rotation is geometrically incorrect.  
Decision  
Use off-axis/asymmetric perspective derived from established generalized perspective mathematics. The initial implementation may use the axis-aligned fixed-screen specialization because the reference laptop display and integrated camera geometry do not require arbitrary rotated display planes.  
The engine exclusively owns the projection camera and matrices. Worlds cannot mutate them.  
Consequences  
• Projection can be validated numerically using physical display corners.  
• Moving the eye changes the frustum rather than merely rotating a camera.  
• The generalized screen-corner model remains useful for tests and possible future camera/display generalization.  
• Projection math must receive strong review and deterministic oracles.  
Alternatives considered  
• Conventional PerspectiveCamera with lookAt/head rotation — rejected as physically wrong for a fixed-window illusion.  
• Novel custom projection derivation — rejected in favor of adapting established mathematics.  
