const core = require('@actions/core');
const axios = require('axios');
const jobProcessors = require('./jobprocessors/processors');

async function getStarted(templateId, branch, codeRepo, codeType) {
    let failed = false;
    try {
        const spaceId = `600087`;
        const projectId = `5603361`;

        // 1. 获取token
        core.info("开始...");
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

        // 2. 调用代码检查
        const pipelineExecuteResponse = await axios.post(`https://tdevstudio.openapi.cloudrun.cloudbaseapp.cn/webapi/v1/space/${spaceId}/project/${projectId}/pipeline/execute`, {
            "templateId": codeType === "sca" ? 5603652 : codeType === "stc" ? 9809103 : templateId,
            "branch": branch,
            "codeRepo": codeRepo
        }, {
            headers: headers
        });
        const recordId = pipelineExecuteResponse.data.result.recordId;

        // 3. 循环获取recordInfo
        core.info("扫描中...");
        let status = "";
        const timeout = 20; // 分钟
        for (let i = 0; i < timeout * 6; i++) {
            const recordResponse = await axios.get(`https://tdevstudio.openapi.cloudrun.cloudbaseapp.cn/webapi/v1/space/${spaceId}/project/${projectId}/pipeline/${recordId}/job/${jobId}`, {
                headers: headers
            });
            status = recordResponse.data.result.status;
            if (status === "FINISHED") {
                break;
            }
            await sleep(10);
        }

        core.info("扫描完成");

        // 获取失败的job, 获取失败信息
        const recordResponse = await axios.get(`https://tdevstudio.openapi.cloudrun.cloudbaseapp.cn/${spaceId}/project/${projectId}/pipeline/${recordId}`, {
            headers: headers
        });
        const recordResult = recordResponse.data.result;
        const allJobs = recordResult.stageExecutions.flatMap(stage => stage.jobExecutions);
        for (const failureJob of allJobs) {
            const jobId = failureJob.id;
            const jobResponse = await axios.get(`https://tdevstudio.openapi.cloudrun.cloudbaseapp.cn/webapi/v1/space/${spaceId}/project/${projectId}/pipeline/${recordId}/job/${jobId}`, {
                headers: headers
            });
            const jobDetail = jobResponse.data.result.data;
            const jobProcessor = jobProcessors[failureJob.componentName];
            if (jobDetail && jobDetail.high) {
                failed = jobProcessor(jobDetail) || failed;
            } else {
                console.error("错误：'high' 属性为 null 或在 jobDetail 对象中不可用。");
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

// 从参数获取templateId、branch和codeRepo
const templateId = process.env.INPUT_TEMPLATE_ID;
const branch = process.env.INPUT_BRANCH;
const codeRepo = process.env.INPUT_CODE_REPO;
const codeType = process.env.INPUT_CODE_TYPE;
let notCare = getStarted(templateId, branch, codeRepo, codeType);
