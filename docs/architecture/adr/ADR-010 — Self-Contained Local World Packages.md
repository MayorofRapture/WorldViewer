# ADR-010 — Self-Contained Local World Packages

Status: Accepted  
Context  
World Viewer is a reusable host for independently developed worlds. The only intended user can manage local developer-oriented packages; a marketplace or polished third-party installer is unnecessary.  
Decision  
Discover worlds from one configured local package directory.  
Rules:  
• each immediate child directory is one package candidate  
• discovery is non-recursive  
• world.manifest.json is required  
• package IDs use reverse-domain form  
• manifests are validated before code execution  
• incompatible/broken packages are reported without preventing valid packages from loading  
Consequences  
• Worlds remain independent from the host repository/runtime.  
• Package discovery stays simple and offline.  
• A stable manifest/API compatibility policy is required.  
• Package installation initially means placing a valid package in the configured directory.  
Alternatives considered  
• Build-time world registration — rejected because it weakens independent packaging.  
• Recursive package discovery — unnecessary complexity.  
• Marketplace/plugin registry — outside product scope.  
