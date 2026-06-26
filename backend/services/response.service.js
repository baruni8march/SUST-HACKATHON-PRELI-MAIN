const {CASE_TYPES,SEVERITIES,DEPARTMENTS,EVIDENCE_VERDICTS}=require("../constants/enums");
const {containsBangla, sanitizeField}=require("../utils/text.util");
const {ensureSafeText,addCredentialWarning}=require("./safety.service");

const buildResponse=(ticket,classification,evidence)=>{
    const caseType=classification.caseType;
    const transaction=evidence.relevantTransaction;
    const bangla=ticket.language==="bn"||containsBangla(ticket.complaint);
    const severity=decideSeverity(ticket,classification,evidence);
    const department=decideDepartment(caseType,evidence);
    const humanReviewRequired=decideHumanReview(ticket,caseType,severity,evidence);
    const agentSummary=buildAgentSummary(ticket,caseType,evidence);
    const recommendedNextAction=buildNextAction(ticket,caseType,evidence);
    const customerReply=buildCustomerReply(ticket,caseType,evidence,bangla);
    const confidence=decideConfidence(caseType,evidence,classification);

    return {
        ticket_id:ticket.ticket_id,
        relevant_transaction_id:transaction?transaction.transaction_id:null,
        evidence_verdict:evidence.verdict,
        case_type:caseType,
        severity,
        department,
        agent_summary:agentSummary,
        recommended_next_action:ensureSafeText(recommendedNextAction),
        customer_reply:ensureSafeText(customerReply),
        human_review_required:humanReviewRequired,
        confidence,
        reason_codes:[...new Set(evidence.reasonCodes)]
    };
};

const decideSeverity=(ticket,classification,evidence)=>{
    const caseType=classification.caseType;
    const amount=evidence.relevantTransaction?.amount||classification.signals.amounts[0]||0;

    if(caseType===CASE_TYPES.PHISHING){
        return SEVERITIES.CRITICAL;
    }

    if(caseType===CASE_TYPES.DUPLICATE_PAYMENT){
        return SEVERITIES.HIGH;
    }

    if(caseType===CASE_TYPES.WRONG_TRANSFER){
        if(evidence.verdict===EVIDENCE_VERDICTS.INCONSISTENT||evidence.verdict===EVIDENCE_VERDICTS.INSUFFICIENT){
            return SEVERITIES.MEDIUM;
        }

        return amount>=10000?SEVERITIES.CRITICAL:SEVERITIES.HIGH;
    }

    if(caseType===CASE_TYPES.PAYMENT_FAILED){
        return classification.signals.balanceDeducted||amount>=1000?SEVERITIES.HIGH:SEVERITIES.MEDIUM;
    }

    if(caseType===CASE_TYPES.AGENT_CASH_IN_ISSUE){
        return SEVERITIES.HIGH;
    }

    if(caseType===CASE_TYPES.MERCHANT_SETTLEMENT_DELAY){
        return amount>=50000?SEVERITIES.HIGH:SEVERITIES.MEDIUM;
    }

    if(caseType===CASE_TYPES.REFUND_REQUEST){
        if(evidence.verdict===EVIDENCE_VERDICTS.INCONSISTENT){
            return SEVERITIES.MEDIUM;
        }

        return amount>=10000?SEVERITIES.MEDIUM:SEVERITIES.LOW;
    }

    return SEVERITIES.LOW;
};

const decideDepartment=(caseType,evidence)=>{
    if(caseType===CASE_TYPES.PHISHING){
        return DEPARTMENTS.FRAUD_RISK;
    }

    if(caseType===CASE_TYPES.WRONG_TRANSFER){
        return DEPARTMENTS.DISPUTE_RESOLUTION;
    }

    if(caseType===CASE_TYPES.PAYMENT_FAILED||caseType===CASE_TYPES.DUPLICATE_PAYMENT){
        return DEPARTMENTS.PAYMENTS_OPS;
    }

    if(caseType===CASE_TYPES.MERCHANT_SETTLEMENT_DELAY){
        return DEPARTMENTS.MERCHANT_OPERATIONS;
    }

    if(caseType===CASE_TYPES.AGENT_CASH_IN_ISSUE){
        return DEPARTMENTS.AGENT_OPERATIONS;
    }

    if(caseType===CASE_TYPES.REFUND_REQUEST&&evidence.verdict===EVIDENCE_VERDICTS.INCONSISTENT){
        return DEPARTMENTS.DISPUTE_RESOLUTION;
    }

    return DEPARTMENTS.CUSTOMER_SUPPORT;
};

const decideHumanReview=(ticket,caseType,severity,evidence)=>{
    const amount=evidence.relevantTransaction?.amount||0;

    if(caseType===CASE_TYPES.PHISHING){
        return true;
    }

    if(caseType===CASE_TYPES.DUPLICATE_PAYMENT){
        return true;
    }

    if(caseType===CASE_TYPES.AGENT_CASH_IN_ISSUE){
        return true;
    }

    if(caseType===CASE_TYPES.WRONG_TRANSFER&&evidence.verdict!==EVIDENCE_VERDICTS.INSUFFICIENT){
        return true;
    }

    if(evidence.verdict===EVIDENCE_VERDICTS.INCONSISTENT){
        return true;
    }

    if(amount>=50000){
        return true;
    }

    return false;
};

const decideConfidence=(caseType,evidence,classification)=>{
    if(caseType===CASE_TYPES.PHISHING){
        return 0.95;
    }

    if(evidence.verdict===EVIDENCE_VERDICTS.CONSISTENT){
        return caseType===CASE_TYPES.DUPLICATE_PAYMENT?0.93:0.9;
    }

    if(evidence.verdict===EVIDENCE_VERDICTS.INCONSISTENT){
        return 0.75;
    }

    if(classification.signals.vague){
        return 0.6;
    }

    return 0.65;
};

const buildAgentSummary=(ticket,caseType,evidence)=>{
    const tx=evidence.relevantTransaction;
    const id=tx?sanitizeField(tx.transaction_id):null;
    const amount=tx&&tx.amount!==null?`${tx.amount} BDT`:null;
    const counterparty=tx?sanitizeField(tx.counterparty):null;

    if(caseType===CASE_TYPES.PHISHING){
        return "Customer reports a suspicious contact asking for sensitive credentials. Treat as a likely social engineering attempt.";
    }

    if(caseType===CASE_TYPES.WRONG_TRANSFER){
        if(!tx){
            return "Customer reports a possible transfer issue, but the provided history does not identify one clear matching transaction.";
        }

        if(evidence.verdict===EVIDENCE_VERDICTS.INCONSISTENT){
            return `Customer claims ${id} (${amount} to ${counterparty}) was a wrong transfer, but the transaction pattern suggests the recipient may be established.`;
        }

        return `Customer reports sending ${amount} via ${id} to ${counterparty} and believes it went to the wrong recipient.`;
    }

    if(caseType===CASE_TYPES.PAYMENT_FAILED){
        if(!tx){
            return "Customer reports a failed payment or balance deduction, but no matching transaction can be confirmed from the provided history.";
        }

        return `Customer reports failed payment or unexpected deduction for ${id} involving ${amount}. Transaction status is ${tx.status}.`;
    }

    if(caseType===CASE_TYPES.REFUND_REQUEST){
        if(!tx){
            return "Customer requests a refund, but no matching transaction is clear from the provided history.";
        }

        return `Customer requests refund related to ${id} involving ${amount}. Refund eligibility depends on applicable policy.`;
    }

    if(caseType===CASE_TYPES.DUPLICATE_PAYMENT){
        if(!tx){
            return "Customer reports possible duplicate payment, but the provided history does not show a clear duplicate pair.";
        }

        return `Customer reports duplicate payment. ${id} appears to be the suspected duplicate transaction involving ${amount}.`;
    }

    if(caseType===CASE_TYPES.MERCHANT_SETTLEMENT_DELAY){
        if(!tx){
            return "Merchant reports settlement delay, but no clear settlement transaction is identified in the provided history.";
        }

        return `Merchant reports delayed settlement ${id} involving ${amount}. Transaction status is ${tx.status}.`;
    }

    if(caseType===CASE_TYPES.AGENT_CASH_IN_ISSUE){
        if(!tx){
            return "Customer reports cash-in issue through an agent, but no matching cash-in transaction is confirmed.";
        }

        return `Customer reports cash-in issue for ${id} involving ${amount} through ${counterparty}. Transaction status is ${tx.status}.`;
    }

    return "Customer reports a general or unclear support issue. More details may be needed to identify the affected transaction.";
};

const buildNextAction=(ticket,caseType,evidence)=>{
    const tx=evidence.relevantTransaction;
    const id=tx?sanitizeField(tx.transaction_id):null;

    if(caseType===CASE_TYPES.PHISHING){
        return "Escalate to fraud_risk immediately. Confirm that the company never asks for PIN, OTP, or password, and log the report for fraud pattern review.";
    }

    if(caseType===CASE_TYPES.WRONG_TRANSFER){
        if(!tx){
            return "Ask for the recipient number, transaction ID, amount, and approximate time before starting a dispute workflow.";
        }

        if(evidence.verdict===EVIDENCE_VERDICTS.INCONSISTENT){
            return `Flag ${id} for human review and verify the claim carefully before initiating any dispute action.`;
        }

        return `Verify ${id} details with the customer and initiate the wrong-transfer dispute workflow per policy.`;
    }

    if(caseType===CASE_TYPES.PAYMENT_FAILED){
        if(!tx){
            return "Ask for the transaction ID or exact amount and time, then check ledger status before taking action.";
        }

        return `Investigate ${id} ledger status. If a failed payment caused deduction, route any eligible reversal through the official workflow.`;
    }

    if(caseType===CASE_TYPES.REFUND_REQUEST){
        return "Explain that refund eligibility depends on merchant or product policy, and guide the customer to the correct official support path.";
    }

    if(caseType===CASE_TYPES.DUPLICATE_PAYMENT){
        if(!tx){
            return "Ask for more details and verify whether two matching completed payments exist before taking action.";
        }

        return `Verify the suspected duplicate ${id} with payments_ops and biller or merchant records before any eligible amount is returned.`;
    }

    if(caseType===CASE_TYPES.MERCHANT_SETTLEMENT_DELAY){
        if(!tx){
            return "Ask for settlement date, amount, and merchant ID, then route to merchant_operations.";
        }

        return `Route ${id} to merchant_operations to verify settlement batch status and communicate a safe ETA.`;
    }

    if(caseType===CASE_TYPES.AGENT_CASH_IN_ISSUE){
        if(!tx){
            return "Ask for agent ID, amount, and approximate cash-in time, then route to agent_operations if matched.";
        }

        return `Investigate ${id} with agent_operations and confirm the cash-in settlement state within standard SLA.`;
    }

    return "Ask the customer for transaction ID, amount, time, and a short description of what went wrong.";
};

const buildCustomerReply=(ticket,caseType,evidence,bangla)=>{
    const tx=evidence.relevantTransaction;
    const id=tx?sanitizeField(tx.transaction_id):null;

    if(bangla){
        return buildBanglaReply(caseType,evidence,id);
    }

    if(caseType===CASE_TYPES.PHISHING){
        return "Thank you for reaching out before sharing any information. We never ask for your PIN, OTP, or password under any circumstances. Please do not share these with anyone, even if they claim to be from us. Our fraud team has been notified.";
    }

    if(caseType===CASE_TYPES.WRONG_TRANSFER){
        if(!tx){
            return addCredentialWarning("Thank you for reaching out. We need the recipient number or transaction ID to identify the correct transaction before any review can begin.",false);
        }

        return addCredentialWarning(`We have received your concern about transaction ${id}. Our dispute team will review the case and contact you through official support channels.`,false);
    }

    if(caseType===CASE_TYPES.PAYMENT_FAILED){
        if(!tx){
            return addCredentialWarning("We have noted your concern about a failed transaction. Please provide the transaction ID, amount, and approximate time so our payments team can check it.",false);
        }

        return addCredentialWarning(`We have noted that transaction ${id} may need payment review. Any eligible amount will be returned through official channels after verification.`,false);
    }

    if(caseType===CASE_TYPES.REFUND_REQUEST){
        return addCredentialWarning("Thank you for reaching out. Refunds for completed merchant payments depend on the applicable merchant or service policy. Please follow official support or merchant guidance for the next step.",false);
    }

    if(caseType===CASE_TYPES.DUPLICATE_PAYMENT){
        if(!tx){
            return addCredentialWarning("We have noted your possible duplicate payment concern. Our team needs the exact transaction details to verify it safely.",false);
        }

        return addCredentialWarning(`We have noted the possible duplicate payment for transaction ${id}. Our payments team will verify it, and any eligible amount will be returned through official channels.`,false);
    }

    if(caseType===CASE_TYPES.MERCHANT_SETTLEMENT_DELAY){
        if(!tx){
            return "We have noted your settlement concern. Our merchant operations team will review the settlement details and update you through official channels.";
        }

        return `We have noted your concern about settlement ${id}. Our merchant operations team will check the batch status and update you through official channels.`;
    }

    if(caseType===CASE_TYPES.AGENT_CASH_IN_ISSUE){
        if(!tx){
            return addCredentialWarning("We have noted your cash-in concern. Please provide the agent ID, amount, and approximate time so our team can check it.",false);
        }

        return addCredentialWarning(`We have noted your concern about transaction ${id}. Our agent operations team will verify it and update you through official channels.`,false);
    }

    return addCredentialWarning("Thank you for reaching out. Please share the transaction ID, amount involved, and a short description of what went wrong so we can help you faster.",false);
};

const buildBanglaReply=(caseType,evidence,id)=>{
    if(caseType===CASE_TYPES.PHISHING){
        return "ধন্যবাদ আমাদের জানানোর জন্য। আমরা কখনোই আপনার পিন, ওটিপি বা পাসওয়ার্ড চাই না। এগুলো কারো সাথে শেয়ার করবেন না। আমাদের ফ্রড টিম বিষয়টি পর্যালোচনা করবে।";
    }

    if(caseType===CASE_TYPES.AGENT_CASH_IN_ISSUE){
        if(id){
            return `আপনার লেনদেন ${id} এর বিষয়ে আমরা অবগত হয়েছি। আমাদের এজেন্ট অপারেশন্স দল এটি যাচাই করবে এবং অফিসিয়াল চ্যানেলে আপনাকে জানাবে। অনুগ্রহ করে কারো সাথে আপনার পিন বা ওটিপি শেয়ার করবেন না।`;
        }

        return "আপনার ক্যাশ-ইন সমস্যার বিষয়টি আমরা পেয়েছি। দ্রুত সহায়তার জন্য এজেন্ট আইডি, টাকার পরিমাণ এবং সময় জানান। অনুগ্রহ করে কারো সাথে আপনার পিন বা ওটিপি শেয়ার করবেন না।";
    }

    if(id){
        return `আপনার লেনদেন ${id} সম্পর্কে আমরা অবগত হয়েছি। আমাদের সংশ্লিষ্ট দল বিষয়টি যাচাই করবে এবং অফিসিয়াল চ্যানেলে আপনাকে জানাবে। অনুগ্রহ করে কারো সাথে আপনার পিন বা ওটিপি শেয়ার করবেন না।`;
    }

    return "ধন্যবাদ। দ্রুত সহায়তার জন্য লেনদেন আইডি, টাকার পরিমাণ এবং কী সমস্যা হয়েছে তা জানান। অনুগ্রহ করে কারো সাথে আপনার পিন বা ওটিপি শেয়ার করবেন না।";
};

module.exports={
    buildResponse
};