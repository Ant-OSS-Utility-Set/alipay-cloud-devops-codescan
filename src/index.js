const core = require('@actions/core');
const axios = require('axios');
const jobProcessors = require('./jobprocessors/processors');
const {context} = require("@actions/github");


let notCare = getStarted();
async function getStarted() {
    let failed = false;
    try {
        const spaceId = `600087`;
        const projectId = `5603361`;
        // 从参数获取branch和codeRepo
        const branchName = process.env.GITHUB_HEAD_REF;
        const branch = branchName.replace('refs/heads/','')
        const codeRepo = context.payload.pull_request.head.repo.ssh_url;
        const codeType = process.env.INPUT_SCAN_TYPE;
        core.debug("branch:" + branch);
        core.debug("codeRepo:" + codeRepo);
        core.debug("codeType:" + codeType);

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
            'x-node-id': '14955076510547972',
            'Content-Type': 'application/json'
        };

        // Set templateId based on codeType
        let templateId;
        if (codeType === "sca") {
            templateId = 5603652;
        } else if (codeType === "stc") {
            templateId = 9809103;
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
        core.debug("pipelineExecuteResponse: "+JSON.stringify(pipelineExecuteResponse.data));
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
        core.debug("recordResponse.data: " + JSON.stringify(recordResponse.data))
        const recordResult = recordResponse.data.result;
        const allJobs = recordResult.stageExecutions.flatMap(stage => stage.jobExecutions);
        for (const failureJob of allJobs) {
            const jobId = failureJob.id;
            const jobResponse = await axios.get(`https://tdevstudio.openapi.cloudrun.cloudbaseapp.cn/webapi/v1/space/${spaceId}/project/${projectId}/pipeline/${recordId}/job/${jobId}`, {
                headers: headers
            });
            core.debug("jobResponse.data: " + JSON.stringify(jobResponse.data))
            const link = `https://devops.cloud.alipay.com/project/5603361/${recordId}/pipeline/details`;
            core.error(`详情请查看：${link}`);
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

