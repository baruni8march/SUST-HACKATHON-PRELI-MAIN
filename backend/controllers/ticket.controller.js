const {analyzeTicketService}=require("../services/ticket.service");
const {validateTicketRequest}=require("../utils/validation.util");

const analyzeTicket=(req,res)=>{
    const validation=validateTicketRequest(req.body);

    if(!validation.valid){
        const status=validation.semantic?422:400;

        return res.status(status).json({
            error:"Invalid request",
            details:validation.errors
        });
    }

    try{
        const result=analyzeTicketService(validation.data);
        return res.status(200).json(result);
    }catch{
        return res.status(500).json({error:"Ticket analysis failed"});
    }
};

module.exports={analyzeTicket};