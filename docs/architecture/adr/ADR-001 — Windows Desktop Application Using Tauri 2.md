# ADR-001 — Windows Desktop Application Using Tauri 2

Status: Accepted  
Context  
The product is Windows-only for its initial scope, must operate fully offline, requires controlled local filesystem access, camera use in the WebView, local world-package discovery, local diagnostic export, and a packaged desktop experience.  
Decision  
Use Tauri 2 as the desktop shell. Keep most application and engine logic in TypeScript. Use Rust only for explicit native capabilities such as filesystem operations, atomic writes, directory selection/enumeration, application metadata, and diagnostic export.  
Consequences  
• Native access stays narrow and auditable.  
• The application avoids a large native-code surface.  
• Packaged WebView2 behavior becomes an early test requirement.  
• Tauri command/capability design becomes part of the security boundary.  
• Cross-platform portability is not an initial requirement.  
Alternatives considered  
• Electron — capable, but heavier than required for this single-user project.  
• Pure browser/PWA — insufficient for the desired local package-directory and native-file workflow.  
• Native Rust application — would move too much UI/rendering work away from the chosen TypeScript/Three.js ecosystem.  
d  
