# Product Overview

See also:
- [Docs Index](./README.md)
- [Frontend Review Workflow](./review-workflow.md)
- [Operations Guide](./operations.md)

## What It Is

NSFW Scanner is a local-first moderation tool for discovering, reviewing, and managing sensitive media on a user’s own machine.

It combines:

- local ML-assisted detection
- high-volume triage
- reversible quarantine
- persistent review state

## Commercial Framing

The value is not just “there is a model.” The value is:

- private local execution
- fast review workflow
- recoverable long-running scans
- safer destructive actions

That makes it more useful than a raw detector demo and more privacy-preserving than a cloud moderation tool.

## Core User Flows

### Scan

The user starts a scan for:

- a specific folder
- or the whole machine

They can choose:

- photos only
- videos only
- both

Default:

- photos only

### Review

The user triages flagged items in a review workspace:

- folder tree
- main grid/list
- inspector

### Rescue

False positives can be marked safe and stay safe across rescans.

### Quarantine

The remaining problematic files can be moved into an isolated vault.

### Restore or delete

Quarantined items can be restored or deleted permanently.

## Why The Product Is Local-First

Local-first matters because the media may be:

- personal
- sensitive
- legally risky
- simply too private to upload elsewhere

The app is designed to keep content on the machine.

## Trust Model

The product should feel like a careful assistant, not an uncontrolled auto-deleter.

Trust comes from:

- visible current state
- rescue overrides
- quarantine before deletion
- undo paths
- restart recovery

## Why Video Is Not Default

Video scanning is expensive in decode time and total runtime.

Commercially and operationally, the best default is:

- make image scanning fast
- expose video scanning clearly
- do not surprise the user with very long scans

## Related Reading

- [Frontend Review Workflow](./review-workflow.md)
- [Operations Guide](./operations.md)
