const fs=require("fs");

const SAMPLE_FILE=process.argv[2]||"SUST_Preli_Sample_Cases.json";
const BASE_URL=(process.argv[3]||process.env.API_URL||"http://localhost:8000").replace(/\/$/,"");

async function testSample(sample){
    try{
        const response=await fetch(`${BASE_URL}/analyze-ticket`,{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify(sample.input)
        });

        const result=await response.json();

        console.log(`\n=== ${sample.id}: ${sample.label} ===`);
        console.log(`Status: ${response.status}`);

        const checks={
            ticket_id:result.ticket_id===sample.expected_output.ticket_id,
            relevant_transaction_id:result.relevant_transaction_id===sample.expected_output.relevant_transaction_id,
            case_type:result.case_type===sample.expected_output.case_type,
            evidence_verdict:result.evidence_verdict===sample.expected_output.evidence_verdict,
            department:result.department===sample.expected_output.department,
            severity:result.severity===sample.expected_output.severity,
            human_review_required:result.human_review_required===sample.expected_output.human_review_required
        };

        let allPass=true;

        for(const [field,passed] of Object.entries(checks)){
            const status=passed?"✅":"❌";

            if(!passed){
                allPass=false;
            }

            const gotValue=result[field]===undefined?"undefined":result[field];
            const expectedValue=sample.expected_output[field]===undefined?"undefined":sample.expected_output[field];

            console.log(`  ${status} ${field}: got "${gotValue}", expected "${expectedValue}"`);
        }

        if(allPass){
            console.log("  🎉 ALL CHECKS PASSED");
        }

        return allPass;
    }catch(error){
        console.log(`\n❌ ${sample.id}: ERROR - ${error.message}`);
        return false;
    }
}

async function runAllTests(){
    const data=JSON.parse(fs.readFileSync(SAMPLE_FILE,"utf8"));
    const cases=data.cases;

    console.log(`Testing ${cases.length} sample cases against ${BASE_URL}`);

    let passed=0;
    let failed=0;

    for(const sample of cases){
        const ok=await testSample(sample);

        if(ok){
            passed++;
        }else{
            failed++;
        }
    }

    console.log("\n========== RESULTS ==========");
    console.log(`Passed: ${passed}/${cases.length}`);
    console.log(`Failed: ${failed}/${cases.length}`);
    console.log("=============================");
}

fetch(`${BASE_URL}/health`)
    .then(response=>response.json())
    .then(data=>{
        if(data.status==="ok"){
            console.log("✅ Health check passed\n");
            runAllTests();
        }else{
            console.log("❌ Health check failed");
            process.exit(1);
        }
    })
    .catch(error=>{
        console.log(`❌ Cannot connect to ${BASE_URL}. Is the server running?`);
        console.log(error.message);
        process.exit(1);
    });