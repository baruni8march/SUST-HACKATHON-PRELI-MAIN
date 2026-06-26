const {CASE_TYPES,EVIDENCE_VERDICTS}=require("../constants/enums");
const {normalizeCounterparty}=require("../utils/text.util");
const {secondsBetween,sortByTimeAsc}=require("../utils/time.util");

const investigateEvidence=(ticket,classification)=>{
    const {caseType,signals}=classification;
    const transactions=ticket.transaction_history||[];

    if(caseType===CASE_TYPES.PHISHING){
        return {
            relevantTransaction:null,
            verdict:EVIDENCE_VERDICTS.INSUFFICIENT,
            reasonCodes:["phishing","credential_protection"]
        };
    }

    if(!transactions.length){
        return {
            relevantTransaction:null,
            verdict:EVIDENCE_VERDICTS.INSUFFICIENT,
            reasonCodes:["no_transaction_history"]
        };
    }

    if(caseType===CASE_TYPES.DUPLICATE_PAYMENT){
        return investigateDuplicate(transactions,signals);
    }

    const match=findRelevantTransaction(transactions,caseType,signals);

    if(match.ambiguous){
        return {
            relevantTransaction:null,
            verdict:EVIDENCE_VERDICTS.INSUFFICIENT,
            reasonCodes:["ambiguous_match","needs_clarification"]
        };
    }

    if(!match.transaction){
        return {
            relevantTransaction:null,
            verdict:EVIDENCE_VERDICTS.INSUFFICIENT,
            reasonCodes:["no_matching_transaction"]
        };
    }

    const verdict=decideVerdict(match.transaction,transactions,caseType,signals);
    const reasonCodes=buildEvidenceReasonCodes(verdict,caseType,match.transaction,transactions,signals);

    return {
        relevantTransaction:match.transaction,
        verdict,
        reasonCodes
    };
};

const investigateDuplicate=(transactions,signals)=>{
    const duplicate=findDuplicateTransaction(transactions,signals);

    if(!duplicate){
        return {
            relevantTransaction:null,
            verdict:EVIDENCE_VERDICTS.INSUFFICIENT,
            reasonCodes:["duplicate_claim","no_duplicate_pair_found"]
        };
    }

    return {
        relevantTransaction:duplicate.second,
        verdict:EVIDENCE_VERDICTS.CONSISTENT,
        reasonCodes:["duplicate_payment","transaction_match"]
    };
};

const findDuplicateTransaction=(transactions,signals)=>{
    const sorted=sortByTimeAsc(transactions).filter(transaction=>{
        return transaction.amount!==null&&["completed","pending"].includes(transaction.status);
    });

    for(let i=0;i<sorted.length;i++){
        for(let j=i+1;j<sorted.length;j++){
            const first=sorted[i];
            const second=sorted[j];

            if(first.type!==second.type){
                continue;
            }

            if(first.amount!==second.amount){
                continue;
            }

            if(normalizeCounterparty(first.counterparty)!==normalizeCounterparty(second.counterparty)){
                continue;
            }

            const gap=secondsBetween(first.timestamp,second.timestamp);

            if(gap===null||gap<=600){
                return {first,second};
            }
        }
    }

    return null;
};

const findRelevantTransaction=(transactions,caseType,signals)=>{
    const scored=transactions.map(transaction=>{
        return {
            transaction,
            score:scoreTransaction(transaction,caseType,signals)
        };
    }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score);

    if(!scored.length){
        return {transaction:null,ambiguous:false};
    }

    const top=scored[0];
    const second=scored[1];
    const threshold = signals.amounts.length ? 5 : 4;

    if(top.score<threshold){
        return {transaction:null,ambiguous:false};
    }

    if(second&&Math.abs(top.score-second.score)<=1){
        if(!signals.counterpartyHints || !signals.counterpartyHints.length){
            return {
                transaction:null,
                ambiguous:true
            };
        }
    }
    // ------------------------------------------

    return {
        transaction:top.transaction,
        ambiguous:false
    };
};

const scoreTransaction=(transaction,caseType,signals)=>{
    let score=0;
    const preferredTypes=getPreferredTypes(caseType);
    const preferredStatuses=getPreferredStatuses(caseType);

    if(preferredTypes.includes(transaction.type)){
        score+=4;
    }

    if(signals.amounts.length&&transaction.amount!==null){
        if(signals.amounts.some(amount=>amount===transaction.amount)){
            score+=5;
        }else if(signals.amounts.some(amount=>Math.abs(amount-transaction.amount)/Math.max(amount,1)<=0.02)){
            score+=3;
        }
    }

    if(preferredStatuses.includes(transaction.status)){
        score+=2;
    }

    if(signals.counterpartyHints&&signals.counterpartyHints.length){
        const txCounterparty=normalizeCounterparty(transaction.counterparty);

        if(signals.counterpartyHints.includes(txCounterparty)){
            score+=4;
        }
    }

    if(caseType===CASE_TYPES.REFUND_REQUEST&&transaction.status==="completed"){
        score+=2;
    }

    if(caseType===CASE_TYPES.MERCHANT_SETTLEMENT_DELAY&&transaction.type==="settlement"){
        score+=3;
    }

    if(caseType===CASE_TYPES.AGENT_CASH_IN_ISSUE&&transaction.type==="cash_in"){
        score+=3;
    }

    return score;
};

const getPreferredTypes=(caseType)=>{
    if(caseType===CASE_TYPES.WRONG_TRANSFER){
        return ["transfer"];
    }

    if(caseType===CASE_TYPES.PAYMENT_FAILED){
        return ["payment","cash_out"];
    }

    if(caseType===CASE_TYPES.REFUND_REQUEST){
        return ["payment","refund","transfer"];
    }

    if(caseType===CASE_TYPES.MERCHANT_SETTLEMENT_DELAY){
        return ["settlement"];
    }

    if(caseType===CASE_TYPES.AGENT_CASH_IN_ISSUE){
        return ["cash_in"];
    }

    return [];
};

const getPreferredStatuses=(caseType)=>{
    if(caseType===CASE_TYPES.WRONG_TRANSFER){
        return ["completed"];
    }

    if(caseType===CASE_TYPES.PAYMENT_FAILED){
        return ["failed","pending"];
    }

    if(caseType===CASE_TYPES.MERCHANT_SETTLEMENT_DELAY){
        return ["pending"];
    }

    if(caseType===CASE_TYPES.AGENT_CASH_IN_ISSUE){
        return ["pending","failed"];
    }

    return [];
};

const decideVerdict=(transaction,transactions,caseType,signals)=>{
    if(caseType===CASE_TYPES.WRONG_TRANSFER){
        if(hasEstablishedRecipientPattern(transaction,transactions)){
            return EVIDENCE_VERDICTS.INCONSISTENT;
        }

        return transaction.status==="completed"?EVIDENCE_VERDICTS.CONSISTENT:EVIDENCE_VERDICTS.INCONSISTENT;
    }

    if(caseType===CASE_TYPES.PAYMENT_FAILED){
        return ["failed","pending"].includes(transaction.status)?EVIDENCE_VERDICTS.CONSISTENT:EVIDENCE_VERDICTS.INCONSISTENT;
    }

    if(caseType===CASE_TYPES.REFUND_REQUEST){
        return transaction.status==="completed"?EVIDENCE_VERDICTS.CONSISTENT:EVIDENCE_VERDICTS.INCONSISTENT;
    }

    if(caseType===CASE_TYPES.MERCHANT_SETTLEMENT_DELAY){
        return transaction.status==="pending"?EVIDENCE_VERDICTS.CONSISTENT:EVIDENCE_VERDICTS.INCONSISTENT;
    }

    if(caseType===CASE_TYPES.AGENT_CASH_IN_ISSUE){
        return ["pending","failed"].includes(transaction.status)?EVIDENCE_VERDICTS.CONSISTENT:EVIDENCE_VERDICTS.INCONSISTENT;
    }

    return EVIDENCE_VERDICTS.INSUFFICIENT;
};

const hasEstablishedRecipientPattern=(transaction,transactions)=>{
    const target=normalizeCounterparty(transaction.counterparty);

    if(!target){
        return false;
    }

    const count=transactions.filter(item=>{
        return item.type==="transfer"&&normalizeCounterparty(item.counterparty)===target;
    }).length;

    return count>=3;
};

const buildEvidenceReasonCodes=(verdict,caseType,transaction,transactions,signals)=>{
    const codes=[];

    codes.push(caseType);

    if(transaction){
        codes.push("transaction_match");
    }

    if(verdict===EVIDENCE_VERDICTS.INCONSISTENT){
        codes.push("evidence_inconsistent");
    }

    if(verdict===EVIDENCE_VERDICTS.CONSISTENT){
        codes.push("evidence_consistent");
    }

    if(caseType===CASE_TYPES.WRONG_TRANSFER&&transaction&&hasEstablishedRecipientPattern(transaction,transactions)){
        codes.push("established_recipient_pattern");
    }

    if(signals.promptInjection){
        codes.push("prompt_injection_ignored");
    }

    return [...new Set(codes)];
};

module.exports={
    investigateEvidence
};