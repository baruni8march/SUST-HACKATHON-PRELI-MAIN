const {
    LANGUAGES,
    CHANNELS,
    USER_TYPES,
    TRANSACTION_TYPES,
    TRANSACTION_STATUSES
}=require("../constants/enums");

const {cleanSentence}=require("./text.util");

const validateTicketRequest=(body)=>{
    const errors=[];

    if(!body||typeof body!=="object"||Array.isArray(body)){
        return {
            valid:false,
            semantic:false,
            errors:["Request body must be a JSON object"]
        };
    }

    const ticketId=cleanSentence(body.ticket_id);
    const complaint=cleanSentence(body.complaint);
    const language=cleanOptionalEnum(body.language,LANGUAGES,"mixed");
    const channel=cleanOptionalEnum(body.channel,CHANNELS,"in_app_chat");
    const userType=cleanOptionalEnum(body.user_type,USER_TYPES,"unknown");
    const campaignContext=cleanSentence(body.campaign_context||"");
    const metadata=body.metadata&&typeof body.metadata==="object"&&!Array.isArray(body.metadata)?body.metadata:{};

    if(!ticketId){
        errors.push("ticket_id is required");
    }

    if(!complaint){
        errors.push("complaint is required");
    }

    if(ticketId&&ticketId.length>120){
        errors.push("ticket_id is too long");
    }

    if(complaint&&complaint.length<3){
        errors.push("complaint is empty or too short");
    }

    if(complaint&&complaint.length>5000){
        errors.push("complaint is too long");
    }

    if(body.language!==undefined&&!LANGUAGES.includes(body.language)){
        errors.push("language must be one of en, bn, mixed");
    }

    if(body.channel!==undefined&&!CHANNELS.includes(body.channel)){
        errors.push("channel must be one of in_app_chat, call_center, email, merchant_portal, field_agent");
    }

    if(body.user_type!==undefined&&!USER_TYPES.includes(body.user_type)){
        errors.push("user_type must be one of customer, merchant, agent, unknown");
    }

    if(body.transaction_history!==undefined&&!Array.isArray(body.transaction_history)){
        errors.push("transaction_history must be an array");
    }

    const transactions=sanitizeTransactions(body.transaction_history||[]);

    return {
        valid:errors.length===0,
        semantic:Boolean(!complaint&&ticketId),
        errors,
        data:{
            ticket_id:ticketId,
            complaint,
            language,
            channel,
            user_type:userType,
            campaign_context:campaignContext,
            transaction_history:transactions,
            metadata
        }
    };
};

const cleanOptionalEnum=(value,allowed,fallback)=>{
    if(value===undefined||value===null||value===""){
        return fallback;
    }

    return allowed.includes(value)?value:fallback;
};

const sanitizeTransactions=(items)=>{
    const transactions=[];

    for(const item of items){
        if(!item||typeof item!=="object"||Array.isArray(item)){
            continue;
        }

        const transactionId=cleanSentence(item.transaction_id);
        const timestamp=cleanSentence(item.timestamp);
        const type=cleanSentence(item.type);
        const amount=Number(item.amount);
        const counterparty=cleanSentence(item.counterparty);
        const status=cleanSentence(item.status);

        if(!transactionId){
            continue;
        }

        transactions.push({
            transaction_id:transactionId,
            timestamp,
            type:TRANSACTION_TYPES.includes(type)?type:"unknown",
            amount:Number.isFinite(amount)?amount:null,
            counterparty,
            status:TRANSACTION_STATUSES.includes(status)?status:"unknown"
        });
    }

    return transactions;
};

module.exports={
    validateTicketRequest
};