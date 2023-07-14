

const core = require('@actions/core');
const axios = require('axios');

async function getStarted() {
    try {
        //1,获取token
        const tokenResponse = await axios.post('https://tcloudrunconsole.openapi.cloudrun.cloudbaseapp.cn/v2/login/serviceaccount',
            {
                "parent_uid": core.getInput('parent_uid', { required: true }),
                "private_key": core.getInput('private_key', { required: true }),
            })
        //2,调用代码检查
        const headers = {
            'Authorization': `Bearer ${tokenResponse.data.data.access_token}`,
            'x-node-id': '14955076510547972'
        };
        const triggerResponse = await axios.post('https://tdevstudio.openapi.cloudrun.cloudbaseapp.cn/webapi/v1/space/600087/project/5000012/pipeline/execute',
         {"templateId":795,"branch":"master"},
        { headers: headers }
        );
        const recordId = triggerResponse.data.result.recordId;
        // const recordId = 5700008;
        //3,循环获取recordInfo
        let recordResponse;
        let status = "";
        for (let i = 0; i < 3; i++) {
            recordResponse = await axios.get(`https://tdevstudio.openapi.cloudrun.cloudbaseapp.cn/webapi/v1/space/600087/project/5000012/pipeline/${recordId}`,
                {headers: headers}
            );
            status=recordResponse.data.result.status
            if (status === "FINISHED") {
                break;
            }
            await sleep(120);
        }
        let result = recordResponse.data.result.result;


        if (result === 'PASSED') {
            core.setOutput("result","PASSED")
            return;
        }

        //获取失败的job, 获取失败信息
        const failureStage = recordResponse.data.result.stageExecutions.find(stage => stage.result === 'FAILURE');
        const failureJob = failureStage.jobExecutions.find(job => job.result === 'FAILURE');
        const jobId = failureJob.id;

        const jobResponse = await axios.get(`https://tdevstudio.openapi.cloudrun.cloudbaseapp.cn/webapi/v1/space/600087/project/5000012/pipeline/${recordId}/job/${jobId}`,
            {headers: headers}
        );
        const urgentJson=jobResponse.data.result.data.urgent;
        const errorMessage = JSON.parse(urgentJson)[0].title;


        //core.setOutput("result", response.data.data.access_token)
        core.setFailed(errorMessage)

        // // `who-to-greet` input defined in action metadata file
        // const nameToGreet = core.getInput('who_to_greet');
        // console.log(`Hello ${nameToGreet}!`);
        // const time = (new Date()).toTimeString();
        // core.setOutput("time", time);
        // // Get the JSON webhook payload for the event that triggered the workflow
        // const payload = JSON.stringify(github.context.payload, undefined, 2)
        // console.log(`The event payload: ${payload}`);
    } catch (error) {
        core.setFailed(error.message);
    }
}
function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
let notCare = getStarted();
