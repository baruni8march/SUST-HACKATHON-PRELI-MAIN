# QueueStorm Investigator

## Overview

QueueStorm Investigator is a backend API built for the **SUST CSE Carnival 2026 Codex Community Hackathon Preliminary Round**.

It works as a support copilot for digital finance complaints. The API reads a customer complaint and recent transaction history, finds the relevant transaction, checks whether the evidence supports the complaint, classifies the case, routes it to the correct department, and creates a safe customer reply.

This project focuses on:

* Correct API schema
* Evidence-based reasoning
* Safe customer communication
* Fast response time
* Simple deployment
* No real customer data
* No secret leakage

## Tech Stack

| Area              | Used       |
| ----------------- | ---------- |
| Runtime           | Node.js    |
| Framework         | Express.js |
| Language          | JavaScript |
| Database          | Not used   |
| External AI API   | Not used   |
| GPU / Large Model | Not used   |

The system uses rule-based logic. No OpenAI, Gemini, DeepSeek, Anthropic, or local large model is used at runtime.

## Endpoints

### `GET /health`

Checks if the API is running.

Response:

```json
{
  "status": "ok"
}
```

### `POST /analyze-ticket`

Analyzes one support ticket and returns a structured JSON response.

Example request:

```json
{
  "ticket_id": "TKT-001",
  "complaint": "I sent 5000 taka to a wrong number around 2pm today.",
  "language": "en",
  "channel": "in_app_chat",
  "user_type": "customer",
  "transaction_history": [
    {
      "transaction_id": "TXN-9101",
      "timestamp": "2026-04-14T14:08:22Z",
      "type": "transfer",
      "amount": 5000,
      "counterparty": "+8801719876543",
      "status": "completed"
    }
  ]
}
```

Example response:

```json
{
  "ticket_id": "TKT-001",
  "relevant_transaction_id": "TXN-9101",
  "evidence_verdict": "consistent",
  "case_type": "wrong_transfer",
  "severity": "high",
  "department": "dispute_resolution",
  "agent_summary": "Customer reports sending 5000 BDT via TXN-9101 and believes it went to the wrong recipient.",
  "recommended_next_action": "Verify TXN-9101 details with the customer and initiate the wrong-transfer dispute workflow per policy.",
  "customer_reply": "We have received your concern about transaction TXN-9101. Our dispute team will review the case and contact you through official support channels. Please do not share your PIN or OTP with anyone.",
  "human_review_required": true,
  "confidence": 0.9,
  "reason_codes": [
    "wrong_transfer",
    "transaction_match",
    "evidence_consistent"
  ]
}
```

## Project Structure

```txt
backend/
├── constants/
│   └── enums.js
├── controllers/
│   ├── health.controller.js
│   └── ticket.controller.js
├── routes/
│   ├── health.route.js
│   └── ticket.route.js
├── services/
│   ├── classifier.service.js
│   ├── evidence.service.js
│   ├── response.service.js
│   ├── safety.service.js
│   └── ticket.service.js
├── utils/
│   ├── text.util.js
│   ├── time.util.js
│   └── validation.util.js
├── prompts/
│   └── investigator.prompt.txt
├── .env.example
├── package.json
├── package-lock.json
├── sample-output.json
└── server.js
```

## How It Works

The API follows this flow:

```txt
Request
  ↓
Validation
  ↓
Complaint Classification
  ↓
Transaction Evidence Check
  ↓
Verdict + Routing
  ↓
Safe Response Generation
  ↓
JSON Response
```

### 1. Validation

`validation.util.js` checks required fields, enum values, transaction history format, and invalid input. It prevents malformed requests from crashing the server.

### 2. Classification

`classifier.service.js` reads the complaint and detects the likely case type, such as wrong transfer, failed payment, refund request, duplicate payment, merchant settlement delay, agent cash-in issue, phishing, or other.

### 3. Evidence Investigation

`evidence.service.js` compares the complaint with transaction history. It finds the relevant transaction, detects duplicate payments, handles ambiguous cases, and returns one of:

* `consistent`
* `inconsistent`
* `insufficient_data`

The system avoids guessing when multiple transactions look equally likely.

### 4. Response Building

`response.service.js` creates the final JSON response. It decides severity, department, human review, agent summary, next action, customer reply, confidence, and reason codes.

### 5. Safety Check

`safety.service.js` keeps the response safe. It avoids asking for PIN, OTP, password, full card number, or secret credentials. It also avoids promising refunds, reversals, recovery, or account unblocks.

## Supported Case Types

* `wrong_transfer`
* `payment_failed`
* `refund_request`
* `duplicate_payment`
* `merchant_settlement_delay`
* `agent_cash_in_issue`
* `phishing_or_social_engineering`
* `other`

## Supported Departments

* `customer_support`
* `dispute_resolution`
* `payments_ops`
* `merchant_operations`
* `agent_operations`
* `fraud_risk`

## Safety Rules

The API never asks customers for:

* PIN
* OTP
* Password
* Full card number
* Secret credentials

The API never directly promises:

* Refund
* Reversal
* Recovery
* Account unblock

Safe wording is used, such as:

```txt
Any eligible amount will be returned through official channels after verification.
```

Suspicious or phishing cases are routed to `fraud_risk`.

## Local Setup

Go to backend folder:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

## Environment Variables

This project does not require any secret environment variables.

The server uses:

```env
PORT=8000
NODE_ENV=production
```

For Windows PowerShell:

```powershell
copy .env.example .env
```

Run the server:

```bash
npm start
```

Local base URL:

```txt
http://localhost:8000
```

## Environment Variables

Example `.env.example`:

```env
PORT=8000
NODE_ENV=production
```

No real secret or API key is required.

## Testing

Health test:

```bash
curl http://localhost:8000/health
```

Analyze ticket test:

```bash
curl -X POST http://localhost:8000/analyze-ticket \
  -H "Content-Type: application/json" \
  -d "{\"ticket_id\":\"TKT-001\",\"complaint\":\"I sent 5000 taka to a wrong number around 2pm today.\",\"language\":\"en\",\"channel\":\"in_app_chat\",\"user_type\":\"customer\",\"transaction_history\":[{\"transaction_id\":\"TXN-9101\",\"timestamp\":\"2026-04-14T14:08:22Z\",\"type\":\"transfer\",\"amount\":5000,\"counterparty\":\"+8801719876543\",\"status\":\"completed\"}]}"
```

## Deployment

Recommended deployment: Render Web Service.

Render settings:

```txt
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

Environment variables:

```env
PORT=8000
NODE_ENV=production
```

After deployment, submit the base URL only.

Example:

```txt
https://your-service-name.onrender.com
```

Judges can call:

```txt
GET /health
POST /analyze-ticket
```

## Sample Output

A generated sample response is included in:

```txt
backend/sample-output.json
```

## AI / Model Usage

No AI model is used during runtime.

The backend uses deterministic rule-based logic for:

* Classification
* Evidence matching
* Department routing
* Severity selection
* Safe response generation

This avoids API key risk, cost, rate limits, slow model responses, GPU dependency, and large downloads.

## Known Limitations

* No real payment system is connected.
* No refund or reversal is performed by the API.
* No account action is performed by the API.
* The API only uses the transaction history provided in the request.
* Very unusual slang may be classified as `other`.
* If the transaction match is unclear, the API returns `insufficient_data`.
* Bangla and Banglish handling is rule-based, not model-based.

## Security Confirmation

This project does not commit:

* `.env`
* API keys
* Tokens
* Passwords
* Real customer data
* `node_modules`
* `.refact`

Only synthetic sample data is used.
