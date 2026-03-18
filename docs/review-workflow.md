# Frontend Review Workflow

See also:
- [Docs Index](./README.md)
- [Product Overview](./product-overview.md)
- [API Reference](./api-reference.md)

## Goal

The review screen is a triage workspace, not a generic gallery.

It is optimized for:

- finding false positives quickly
- inspecting suspicious items with context
- taking bulk action on the rest

## Layout

The review workspace is organized into three areas:

### Folder explorer

Shows the relevant folders for the current view and highlights the current folder.

### Review surface

Shows files in:

- grid view
- or list view

Supports:

- selection
- safe
- quarantine
- delete

### Inspector

Shows:

- larger media preview
- decision and score
- class evidence
- metadata
- quick actions

## Review States

### Active flagged state

Items still awaiting review action.

### Safe / rescued state

Items explicitly cleared by the user through a durable backend override.

### Quarantined state

Items already moved out of the active review flow.

## Why Safe Is Durable

When the user marks a file safe, the backend writes a safe override row to SQLite. This matters because it means:

- reloads do not lose the decision
- rescans do not reintroduce known false positives
- the UI reflects durable moderation state rather than temporary local flags

## Grid vs List

Grid is best for:

- visual triage
- pattern recognition
- scanning many files quickly

List is best for:

- filenames
- folder context
- metadata-heavy review

## Keyboard Support

Keyboard shortcuts exist because moderation speed matters. The UI supports navigation, rescue, quarantine, delete, undo, and view changes so repeated review work is faster.

## Design Principle

The screen should optimize for the question:

- “What here does not belong in the flagged set?”

That is the core of the opt-out moderation model.

## Related Reading

- [Product Overview](./product-overview.md)
- [API Reference](./api-reference.md)
