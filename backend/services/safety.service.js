const ensureSafeText=(value)=>{
    let text=String(value||"");

    text=text.replace(/\b(we will|we'll|will|guarantee|confirmed|confirm)\s+(refund|reverse|recover|unblock|return)/gi,"any eligible amount will be handled through official channels");
    text=text.replace(/\b(refund has been approved|reversal has been approved|account is unblocked)\b/gi,"the case will be reviewed through official channels");

    const unsafeAsk=/\b(share|provide|send|tell|give|submit)\s+(your\s+)?(pin|otp|password|full card number|card number|cvv|secret code)\b/i;

    if(unsafeAsk.test(text)&&!/do not|never|don't/i.test(text)){
        text="Please do not share your PIN, OTP, password, or card details with anyone. Our team will review your case through official support channels.";
    }

    return text.replace(/\s+/g," ").trim();
};

const addCredentialWarning=(text,bangla)=>{
    if(bangla){
        if(text.includes("পিন")||text.includes("ওটিপি")){
            return text;
        }

        return `${text} অনুগ্রহ করে কারো সাথে আপনার পিন বা ওটিপি শেয়ার করবেন না।`;
    }

    if(/pin|otp|password/i.test(text)){
        return text;
    }

    return `${text} Please do not share your PIN or OTP with anyone.`;
};

module.exports={
    ensureSafeText,
    addCredentialWarning
};