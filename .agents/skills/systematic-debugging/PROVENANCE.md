# Provenance — systematic-debugging

- **Reuse Mode:** B — Adapt approved reference
- **Upstream project:** `obra/superpowers`
- **Upstream skill:** `skills/systematic-debugging/SKILL.md`
- **Upstream repository:** https://github.com/obra/superpowers
- **Pinned upstream commit:** `5bf4e78011075bcfc0dc295f0724994cd123ee71`
- **Upstream skill blob SHA:** `095d194ac041502905f15b01d22d294fb94db8b2`
- **License:** MIT, copyright (c) 2025 Jesse Vincent
- **Adapted for WorldViewer:** 2026-09-19

## Why this is an adaptation rather than a byte-for-byte adoption

The pinned upstream skill depends on other Superpowers workflow skills, including mandatory `test-driven-development` and `verification-before-completion`, and contains workflow assumptions that would otherwise become implicit project policy.

WorldViewer deliberately keeps project authority in its task specifications, architecture/contracts, Testing Strategy, Oracle Registry, Reuse Register, accepted ADRs, and handoffs. The local adaptation therefore preserves the upstream root-cause-first four-phase debugging procedure while:

- removing mandatory dependencies on other Superpowers skills;
- routing completion evidence through WorldViewer's `project-verification` skill;
- making regression-test requirements conditional on WorldViewer's authoritative testing sources instead of imposing universal TDD;
- preserving the upstream three-failed-fix escalation concept while explicitly denying it authority to redesign architecture;
- removing ecosystem-specific and manager/human-partner phrasing;
- folding a concise root-cause-tracing procedure into the skill so no supporting Superpowers files are required;
- removing platform-specific shell examples not needed by a Windows-first repository.

## Update policy

Do not automatically track upstream `main`.

Before changing the pinned source:

1. inspect the upstream diff from this commit to the proposed new pin;
2. review license/provenance changes;
3. check for new hidden workflow, architecture, Git, shell, or tool assumptions;
4. preserve WorldViewer authority boundaries;
5. update this file and the local adaptation deliberately.
