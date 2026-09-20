# ADR-003 — Canonical Screen Coordinate System and Millimeter Units

Status: Accepted  
Context  
Head tracking, calibration, projection, diagnostics, and world reactions must agree on physical scale and axis direction. Ambiguous or mixed units would make subtle projection errors difficult to detect.  
Decision  
Use a right-handed coordinate system with:  
• origin at the physical center of the visible display  
• \+X toward the viewer’s right  
• \+Y upward  
• \+Z outward from the display toward the viewer  
• screen plane at Z \= 0  
• viewer normally at Z \> 0  
• virtual content behind the display normally at Z \< 0  
• millimeters for canonical physical spatial values  
ViewerPose.positionMm represents the midpoint between the viewer’s two eyes, the cyclopean eye.  
Consequences  
• Display dimensions, calibration, pose, filtering, projection, and diagnostics share one unit.  
• glTF or other meter-based assets must be scaled explicitly at the world/asset boundary.  
• Spatial field names should carry unit suffixes where practical.  
• Projection test oracles can use direct physical dimensions.  
Alternatives considered  
• Meters internally — common in 3D engines, but would create unnecessary conversion boundaries for this physically measured application.  
• Generic head center — less directly tied to the monoscopic viewpoint being rendered.  
