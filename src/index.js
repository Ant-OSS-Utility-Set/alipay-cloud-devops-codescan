const core = require('@actions/core');
const axios = require('axios');
const jobProcessors = require('./jobprocessors/processors');
const repoTemplates = require('./config');

async function getStarted() {
    let failed = false;
    try {
        const spaceId = `47`;
        const repo = process.env.GITHUB_REPOSITORY;
        const branchRef = process.env.GITHUB_REF;
        core.debug("branchRef: " + branchRef);
        const branchName = branchRef.replace('refs/heads/', '');
        core.debug("branchName: " + branchName);
        if (!repoTemplates[repo]) {
            core.setFailed(`该项目暂未配置,请联系管理员! 项目信息: ${repo}`);
            core.setOutput("result", "FAILED");
            return;
        }
        const templates = repoTemplates[repo];
        // 1. 获取token
        core.info("开始...");
        const tokenResponse = await axios.post('https://tcloudrunconsole.openapi.run.alipay.net/v2/login/serviceaccount', {
            "parent_uid": core.getInput('parent_uid', { required: true }),
            "private_key": core.getInput('private_key', { required: true }),
        });
        const headers = {
            'Authorization': `Bearer ${tokenResponse.data.data.access_token}`,
            'x-node-id': '17124406274852513'
        };

        for (const template of templates) {
            let { projectId, templateId } = template;
            // 2. 调用代码检查
            const triggerResponse = await axios.post(`https://tdevstudio.openapi.run.alipay.net/webapi/v1/space/${spaceId}/project/${projectId}/pipeline/execute?projectId=${projectId}&spaceId=${spaceId}`, { "templateId": templateId, "branch": `${branchName}` }, { headers: headers });
            core.debug("triggerResponse: " + JSON.stringify(triggerResponse.data));
            const recordId = triggerResponse.data.result.recordId;

            // 3. 循环获取recordInfo
            core.info("扫描中...");
            let recordResponse;
            let status = "";
            const timeout = 20; // 分钟
            for (let i = 0; i < timeout * 6; i++) {
                recordResponse = await axios.get(`https://tdevstudio.openapi.run.alipay.net/webapi/v1/space/${spaceId}/project/${projectId}/pipeline/${recordId}`, { headers: headers });
                status = recordResponse.data.result.status;
                if (status === "FINISHED") {
                    break;
                }
                await sleep(10);
            }
            core.info("扫描完成");
            let recordResult = recordResponse.data.result;
            core.info("获取信息中...");
            core.debug("recordResponse.data: " + JSON.stringify(recordResponse.data));

            // 获取失败的job, 获取失败信息
            const allJobs = recordResult.stageExecutions.flatMap(stage => stage.jobExecutions);
            for (const failureJob of allJobs) {
                const jobId = failureJob.id;
                const jobResponse = await axios.get(`https://tdevstudio.openapi.run.alipay.net/webapi/v1/space/${spaceId}/project/${projectId}/pipeline/${recordId}/job/${jobId}`, { headers: headers });
                core.debug("jobResponse.data: " + JSON.stringify(jobResponse.data));
                const jobDetail = jobResponse.data.result.data;
                const jobProcessor = jobProcessors[failureJob.componentName];
                if (jobDetail && jobDetail.high) {
                    failed = jobProcessor(jobDetail) || failed;
                } else {
                    // 在这里处理 null 值或缺失的属性
                    console.error("错误：'high' 属性为 null 或在 jobDetail 对象中不可用。");
                }
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

let notCare = getStarted();