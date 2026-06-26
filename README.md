# QueueStorm Investigator

## Overview

QueueStorm Investigator is a backend API service built for the SUST CSE Carnival 2026 Codex Community Hackathon preliminary round.

The service works as an internal support copilot for digital finance complaints. It reads a customer complaint together with recent transaction history, identifies the relevant transaction, checks whether the evidence supports or contradicts the complaint, classifies the case, routes it to the correct department, and generates a safe support reply.

The project focuses on:

- Exact API schema
- Evidence-based reasoning
- Safe customer communication
- Fast response time
- No secret leakage
- Simple deployment

## Required Endpoints

### GET /health

Returns service health.

Response:

```json
{
  "status": "ok"
}