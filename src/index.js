

const core = require('@actions/core');
const axios = require('axios');

async function getStarted() {
    try {
        const spaceId = `600087`;
        let projectId;
        let templateId;
        const repo = process.env.GITHUB_REPOSITORY;
        const branchRef = process.env.GITHUB_REF;
        const branchName = branchRef.split('/').pop();
        switch (repo){
            case "xuqiu/MyLeetCode":
                projectId = "5000012";
                templateId = 795;
                break;
            case "sofastack/sofa-rpc":
                projectId = "5600832";
                templateId = 5600545;
                break;
            default:
                core.setFailed(`该项目暂未配置,请联系管理员! 项目信息: ${repo}`)
        }


        //1,获取token
        core.info("starting...")
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
        const triggerResponse = await axios.post(`https://tdevstudio.openapi.cloudrun.cloudbaseapp.cn/webapi/v1/space/${spaceId}/project/${projectId}/pipeline/execute`,
         {"templateId":templateId,"branch":`${branchName}`},
        { headers: headers }
        );
        const recordId = triggerResponse.data.result.recordId;
        // const recordId = 5700008;
        //3,循环获取recordInfo
        core.info("scanning...")
        let recordResponse;
        let status = "";
        for (let i = 0; i < 30; i++) {
            recordResponse = await axios.get(`https://tdevstudio.openapi.cloudrun.cloudbaseapp.cn/webapi/v1/space/${spaceId}/project/${projectId}/pipeline/${recordId}`,
                {headers: headers}
            );
            status=recordResponse.data.result.status
            if (status === "FINISHED") {
                break;
            }
            await sleep(10);
        }
        core.info("scan finished")
        let result = recordResponse.data.result.result;


        if (result === 'PASSED') {
            core.setOutput("result","PASSED")
            return;
        }

        core.info("getting info...")
        //获取失败的job, 获取失败信息
        const failureStage = recordResponse.data.result.stageExecutions.find(stage => stage.result === 'FAILURE');
        const failureJob = failureStage.jobExecutions.find(job => job.result === 'FAILURE');
        const jobId = failureJob.id;
        const jobResponse = await axios.get(`https://tdevstudio.openapi.cloudrun.cloudbaseapp.cn/webapi/v1/space/${spaceId}/project/${projectId}/pipeline/${recordId}/job/${jobId}`,
            {headers: headers}
        );
        const highAndUrgent = [...JSON.parse(jobResponse.data.result.data.high), ...JSON.parse(jobResponse.data.result.data.urgent)];
        const titleList = highAndUrgent.map(item => item.title);

        for (const errorMessage of titleList) {
            core.setFailed(errorMessage)
        }

    } catch (error) {
        core.setFailed(error.message);
    }
}
function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
let notCare = getStarted();
