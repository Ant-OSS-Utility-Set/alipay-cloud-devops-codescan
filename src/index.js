const core = require('@actions/core');
const axios = require('axios');
const jobProcessors = require('./jobprocessors/processors');
const {context} = require("@actions/github");


let notCare = getStarted();
async function getStarted() {
    let failed = false;
    try {
        const spaceId = `600095`;
        const projectId = `19500036`;
        // core.info("process.env: " + JSON.stringify(process.env));
        // 从参数获取branch和codeRepo
        // const branchName = process.env.GITHUB_HEAD_REF;
        // const branch = branchName.replace('refs/heads/','')
        // const codeRepo = context.payload.pull_request.head.repo.ssh_url;
        core.info("context.payload: " + JSON.stringify(context.payload));
        // pull_request事件取context.payload.pull_request.head.ref， 否则取context.payload.ref
        const branch = context.payload.pull_request?context.payload.pull_request.head.ref : context.payload.ref.replace('refs/heads/','');
        const codeRepo = context.payload.repository.ssh_url;

        const codeType = process.env.INPUT_SCAN_TYPE;
        const tips = core.getInput('tips', { required: true })
        core.info("branch:" + branch);
        core.info("codeRepo:" + codeRepo);
        core.info("codeType:" + codeType);

        // 1. 获取token
        core.info("start...");
        const tokenResponse = await axios.post('https://tcloudrunconsole.openapi.cloudrun.cloudbaseapp.cn/v2/login/serviceaccount', {
            "parent_uid": core.getInput('parent_uid', { required: true }),
            "private_key": core.getInput('private_key', { required: true }),
        });
        const token = tokenResponse.data.data.access_token;

        // 设置请求头
        const headers = {
            'Authorization': `Bearer ${token}`,
            'x-node-id': core.getInput('parent_uid', { required: true }),
            'Content-Type': 'application/json'
        };

        // Set templateId based on codeType
        let templateId;
        if (codeType === "sca") {
            templateId = 20000430;
        } else if (codeType === "stc") {
            templateId = 20000425;
        } else {
            core.error("错误：无效的codeType");
            return;
        }

        // 2. 调用代码检查
        const pipelineExecuteResponse = await axios.post(`https://tdevstudio.openapi.cloudrun.cloudbaseapp.cn/webapi/v1/space/${spaceId}/project/${projectId}/pipeline/execute`, {
            "templateId": templateId,
            "branch": branch,
            "codeRepo": codeRepo
        }, {
            headers: headers
        });
        core.info("pipelineExecuteResponse: "+JSON.stringify(pipelineExecuteResponse.data));
        const recordId = pipelineExecuteResponse.data.result.recordId;

        // 3. 循环获取recordInfo
        core.info("Scanning...");
        let status = "";
        const timeout = 20; // minute
        let recordResponse;
        for (let i = 0; i < timeout * 6; i++) {
            recordResponse = await axios.get(`https://tdevstudio.openapi.cloudrun.cloudbaseapp.cn/webapi/v1/space/${spaceId}/project/${projectId}/pipeline/${recordId}`, {
                headers: headers
            });
            status = recordResponse.data.result.status;
            if (status === "FINISHED") {
                break;
            }
            await sleep(10);
        }
        core.info("Scan completed");

        // 获取失败的job, 获取失败信息
        core.info("recordResponse.data: " + JSON.stringify(recordResponse.data))
        const recordResult = recordResponse.data.result;
        const allJobs = recordResult.stageExecutions.flatMap(stage => stage.jobExecutions);
        for (const failureJob of allJobs) {
            const jobId = failureJob.id;
            const jobResponse = await axios.get(`https://tdevstudio.openapi.cloudrun.cloudbaseapp.cn/webapi/v1/space/${spaceId}/project/${projectId}/pipeline/${recordId}/job/${jobId}`, {
                headers: headers
            });
            core.info("jobResponse.data: " + JSON.stringify(jobResponse.data))
            const link = `https://devops.cloud.alipay.com/project/${projectId}/${recordId}/pipeline/details`;
            core.warning(`详情请查看：${link}` + "  " + tips);
            const jobDetail = jobResponse.data.result.data;
            const jobProcessor = jobProcessors[failureJob.componentName];
            if (jobProcessor) {
                failed = jobProcessor(jobDetail) || failed;
            }
        }
    } catch (error) {
        core.setFailed(error.message);
    }
    core.setOutput("result", failed ? "FAILED" : "PASSED");
}

function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
module.exports = getStarted;