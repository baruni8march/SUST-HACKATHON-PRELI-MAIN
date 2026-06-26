const banglaDigitMap={
    "০":"0",
    "১":"1",
    "২":"2",
    "৩":"3",
    "৪":"4",
    "৫":"5",
    "৬":"6",
    "৭":"7",
    "৮":"8",
    "৯":"9"
};

const normalizeDigits=(value)=>{
    return String(value||"").replace(/[০-৯]/g,digit=>banglaDigitMap[digit]||digit);
};

const normalizeText=(value)=>{
    return normalizeDigits(value)
        .toLowerCase()
        .replace(/\s+/g," ")
        .trim();
};

const hasAny=(text,keywords)=>{
    return keywords.some(keyword=>text.includes(keyword));
};

const containsBangla=(value)=>{
    return /[\u0980-\u09FF]/.test(String(value||""));
};

const extractAmounts=(value)=>{
    const text=normalizeDigits(value);
    const matches=[...text.matchAll(/(?:৳|tk|taka|bdt)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:৳|tk|taka|bdt|টাকা)?/gi)];
    const amounts=[];

    for(const match of matches){
        const raw=match[1].replace(/,/g,"");
        const number=Number(raw);

        if(Number.isFinite(number)&&number>0&&number<10000000){
            amounts.push(number);
        }
    }

    return [...new Set(amounts)];
};

const normalizeCounterparty=(value)=>{
    const raw=String(value||"").toUpperCase().trim();

    if(!raw){
        return "";
    }

    const digits=raw.replace(/\D/g,"");

    if(digits.length>=10){
        let phone=digits;

        if(phone.startsWith("880")){
            phone="0"+phone.slice(3);
        }

        return phone.slice(-10);
    }

    return raw.replace(/\s+/g,"");
};

const extractCounterpartyHints=(value)=>{
    const text=String(value||"");
    const hints=new Set();
    const phoneMatches=text.match(/(\+?8801[0-9]{9}|01[0-9]{9})/g)||[];
    const entityMatches=text.match(/\b(AGENT|MERCHANT|BILLER)[-_]?[A-Z0-9-]+\b/gi)||[];

    for(const phone of phoneMatches){
        hints.add(normalizeCounterparty(phone));
    }

    for(const entity of entityMatches){
        hints.add(normalizeCounterparty(entity));
    }

    return [...hints];
};

const cleanSentence=(value)=>{
    return String(value||"").replace(/\s+/g," ").trim();
};

module.exports={
    normalizeDigits,
    normalizeText,
    hasAny,
    containsBangla,
    extractAmounts,
    normalizeCounterparty,
    extractCounterpartyHints,
    cleanSentence
};