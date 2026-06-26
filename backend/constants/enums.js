const LANGUAGES=["en","bn","mixed"];

const CHANNELS=[
    "in_app_chat",
    "call_center",
    "email",
    "merchant_portal",
    "field_agent"
];

const USER_TYPES=[
    "customer",
    "merchant",
    "agent",
    "unknown"
];

const TRANSACTION_TYPES=[
    "transfer",
    "payment",
    "cash_in",
    "cash_out",
    "settlement",
    "refund"
];

const TRANSACTION_STATUSES=[
    "completed",
    "failed",
    "pending",
    "reversed"
];

const EVIDENCE_VERDICTS={
    CONSISTENT:"consistent",
    INCONSISTENT:"inconsistent",
    INSUFFICIENT:"insufficient_data"
};

const CASE_TYPES={
    WRONG_TRANSFER:"wrong_transfer",
    PAYMENT_FAILED:"payment_failed",
    REFUND_REQUEST:"refund_request",
    DUPLICATE_PAYMENT:"duplicate_payment",
    MERCHANT_SETTLEMENT_DELAY:"merchant_settlement_delay",
    AGENT_CASH_IN_ISSUE:"agent_cash_in_issue",
    PHISHING:"phishing_or_social_engineering",
    OTHER:"other"
};

const SEVERITIES={
    LOW:"low",
    MEDIUM:"medium",
    HIGH:"high",
    CRITICAL:"critical"
};

const DEPARTMENTS={
    CUSTOMER_SUPPORT:"customer_support",
    DISPUTE_RESOLUTION:"dispute_resolution",
    PAYMENTS_OPS:"payments_ops",
    MERCHANT_OPERATIONS:"merchant_operations",
    AGENT_OPERATIONS:"agent_operations",
    FRAUD_RISK:"fraud_risk"
};

module.exports={
    LANGUAGES,
    CHANNELS,
    USER_TYPES,
    TRANSACTION_TYPES,
    TRANSACTION_STATUSES,
    EVIDENCE_VERDICTS,
    CASE_TYPES,
    SEVERITIES,
    DEPARTMENTS
};