const toTime=(value)=>{
    const date=new Date(value);

    if(Number.isNaN(date.getTime())){
        return null;
    }

    return date;
};

const secondsBetween=(a,b)=>{
    const first=toTime(a);
    const second=toTime(b);

    if(!first||!second){
        return null;
    }

    return Math.abs(first.getTime()-second.getTime())/1000;
};

const sortByTimeAsc=(transactions)=>{
    return [...transactions].sort((a,b)=>{
        const at=toTime(a.timestamp);
        const bt=toTime(b.timestamp);

        if(!at&&!bt){
            return 0;
        }

        if(!at){
            return 1;
        }

        if(!bt){
            return -1;
        }

        return at.getTime()-bt.getTime();
    });
};
const parseRelativeTime = (text, baseTime) => {
    const now = baseTime ? new Date(baseTime) : new Date();
    const normalized = String(text || "").toLowerCase();

    if (normalized.includes("today") || normalized.includes("আজ")) {
        return new Date(now.setHours(12, 0, 0, 0));
    }

    if (normalized.includes("yesterday") || normalized.includes("yester day") || normalized.includes("yester-day") || normalized.includes("গত কাল") || normalized.includes("গতকাল")) {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return new Date(yesterday.setHours(12, 0, 0, 0));
    }

    return null;
};

module.exports={
    toTime,
    secondsBetween,
    sortByTimeAsc,
    parseRelativeTime
};