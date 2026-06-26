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

module.exports={
    toTime,
    secondsBetween,
    sortByTimeAsc
};