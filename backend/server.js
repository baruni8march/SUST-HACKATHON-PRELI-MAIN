const express=require("express");
const cors=require("cors");
require("dotenv").config();

const healthRoute=require("./routes/health.route");
const ticketRoute=require("./routes/ticket.route");

const app=express();

app.use(cors());
app.use(express.json({limit:"128kb"}));

app.use("/",healthRoute);
app.use("/",ticketRoute);

app.use((req,res)=>{
    return res.status(404).json({error:"Route not found"});
});

app.use((err,req,res,next)=>{
    if(err&&err.type==="entity.parse.failed"){
        return res.status(400).json({error:"Invalid JSON body"});
    }

    return res.status(500).json({error:"Internal server error"});
});

const PORT=process.env.PORT||8000;

app.listen(PORT,"0.0.0.0",()=>{
    console.log(`QueueStorm Investigator running on port ${PORT}`);
});