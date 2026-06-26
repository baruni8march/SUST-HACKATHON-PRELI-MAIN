const {CASE_TYPES}=require("../constants/enums");
const {
    normalizeText,
    hasAny,
    extractAmounts,
    extractCounterpartyHints,
    containsBangla
}=require("../utils/text.util");

const classifyComplaint=(ticket)=>{
    const text=normalizeText(ticket.complaint);
    const amounts=extractAmounts(ticket.complaint);
    const counterpartyHints=extractCounterpartyHints(ticket.complaint);
    const bangla=containsBangla(ticket.complaint)||ticket.language==="bn";

    const signals={
        text,
        amounts,
        counterpartyHints,
        bangla,
        phishing:detectPhishing(text),
        duplicate:detectDuplicate(text),
        merchantSettlement:detectMerchantSettlement(text,ticket),
        agentCashIn:detectAgentCashIn(text,ticket),
        paymentFailed:detectPaymentFailed(text),
        wrongTransfer:detectWrongTransfer(text),
        refund:detectRefund(text),
        vague:detectVague(text),
        balanceDeducted:detectBalanceDeducted(text),
        promptInjection:detectPromptInjection(text)
    };

    let caseType=CASE_TYPES.OTHER;

    if(signals.phishing){
        caseType=CASE_TYPES.PHISHING;
    }else if(signals.duplicate){
        caseType=CASE_TYPES.DUPLICATE_PAYMENT;
    }else if(signals.merchantSettlement){
        caseType=CASE_TYPES.MERCHANT_SETTLEMENT_DELAY;
    }else if(signals.agentCashIn){
        caseType=CASE_TYPES.AGENT_CASH_IN_ISSUE;
    }else if(signals.paymentFailed){
        caseType=CASE_TYPES.PAYMENT_FAILED;
    }else if(signals.wrongTransfer){
        caseType=CASE_TYPES.WRONG_TRANSFER;
    }else if(signals.refund){
        caseType=CASE_TYPES.REFUND_REQUEST;
    }

    return {
        caseType,
        signals
    };
};

const detectPhishing=(text)=>{
    return hasAny(text,[
        "otp",
        "pin",
        "password",
        "verification code",
        "secret code",
        "account will be blocked",
        "account blocked",
        "click link",
        "login link",
        "fake bkash",
        "fake agent",
        "scam",
        "fraud",
        "phishing",
        "suspicious call",
        "suspicious sms",
        "asked for my otp",
        "asking for otp",
        "asked my pin",
        "asking for pin",
        "পিন",
        "ওটিপি",
        "পাসওয়ার্ড",
        "কোড",
        "ভুয়া",
        "প্রতারক"
    ]);
};

const detectDuplicate=(text)=>{
    return hasAny(text,[
        "twice",
        "two times",
        "deducted twice",
        "charged twice",
        "paid twice",
        "double charged",
        "double payment",
        "duplicate",
        "same payment again",
        "দুইবার",
        "দুবার",
        "ডাবল"
    ]);
};

const detectMerchantSettlement=(text,ticket)=>{
    const hasSettlementText=hasAny(text,[
        "merchant settlement",
        "settlement",
        "sales not settled",
        "not settled",
        "settlement pending",
        "settlement delayed",
        "merchant account",
        "মার্চেন্ট",
        "সেটেলমেন্ট"
    ]);

    const isMerchantContext=ticket.user_type==="merchant"||ticket.channel==="merchant_portal";

    return hasSettlementText&&isMerchantContext;
};

const detectAgentCashIn=(text,ticket)=>{
    return hasAny(text,[
        "cash in",
        "cash-in",
        "cashin",
        "agent cash",
        "agent deposit",
        "agent",
        "balance not added",
        "money not added",
        "not reflected",
        "balance e ashe nai",
        "ক্যাশ ইন",
        "ক্যাশইন",
        "এজেন্ট",
        "ব্যালেন্সে টাকা আসেনি",
        "টাকা আসেনি"
    ])&&hasAny(text,[
        "agent",
        "cash",
        "ক্যাশ",
        "এজেন্ট",
        "balance",
        "ব্যালেন্স"
    ]);
};

const detectPaymentFailed=(text)=>{
    return hasAny(text,[
        "payment failed",
        "transaction failed",
        "app showed failed",
        "failed but",
        "recharge failed",
        "cash out failed",
        "balance deducted",
        "money deducted",
        "deducted",
        "charged but failed",
        "টাকা কেটে",
        "কেটে নিয়েছে",
        "পেমেন্ট ফেল",
        "লেনদেন ব্যর্থ",
        "ফেইল"
    ]);
};

const detectWrongTransfer=(text)=>{
    return hasAny(text,[
        "wrong number",
        "wrong person",
        "wrong recipient",
        "wrong account",
        "wrong wallet",
        "sent by mistake",
        "sent to wrong",
        "mistakenly sent",
        "typed it wrong",
        "didn't get it",
        "did not get it",
        "not received",
        "he says he didn't get",
        "she says she didn't get",
        "brother",
        "sister",
        "wrongly sent",
        "ভুল নম্বর",
        "ভুল নাম্বার",
        "ভুল করে",
        "ভুল মানুষ",
        "ভুল একাউন্ট",
        "পাঠিয়েছি"
    ])&&hasAny(text,[
        "sent",
        "transfer",
        "wrong",
        "ভুল",
        "পাঠিয়েছি",
        "didn't get",
        "not received",
        "brother",
        "sister"
    ]);
};

const detectRefund=(text)=>{
    return hasAny(text,[
        "refund",
        "return my money",
        "money back",
        "reverse it",
        "reverse this",
        "reversal",
        "cancel payment",
        "changed my mind",
        "don't want it",
        "do not want it",
        "ফেরত",
        "রিফান্ড"
    ]);
};

const detectVague=(text)=>{
    return hasAny(text,[
        "something is wrong",
        "check my money",
        "money problem",
        "please check",
        "problem with my money",
        "টাকার সমস্যা",
        "চেক করুন"
    ])&&text.length<80;
};

const detectBalanceDeducted=(text)=>{
    return hasAny(text,[
        "balance deducted",
        "money deducted",
        "deducted",
        "charged",
        "কেটে",
        "কাটা"
    ]);
};

const detectPromptInjection=(text)=>{
    return hasAny(text,[
        "ignore previous",
        "ignore the rules",
        "forget instructions",
        "return exactly",
        "developer mode",
        "system prompt",
        "override"
    ]);
};

module.exports={
    classifyComplaint
};