const {classifyComplaint}=require("./classifier.service");
const {investigateEvidence}=require("./evidence.service");
const {buildResponse}=require("./response.service");

const analyzeTicketService=(ticket)=>{
    const classification=classifyComplaint(ticket);
    const evidence=investigateEvidence(ticket,classification);

    return buildResponse(ticket,classification,evidence);
};

module.exports={
    analyzeTicketService
};