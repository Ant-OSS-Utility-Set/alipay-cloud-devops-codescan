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
        // 从参数获取branch和codeRepo
        // pull_request事件取context.payload.pull_request.head.ref， commit改动取context.payload.ref
        const branch = context.payload.pull_request?context.payload.pull_request.head.ref : context.payload.ref.replace('refs/heads/','');
        const codeRepo = context.payload.repository.ssh_url;
        const repoName = context.payload.repository.name;

        const codeType = process.env.INPUT_SCAN_TYPE;
        const tips = core.getInput('tips', { required: true })
        core.info("branch:" + branch);
        core.info("codeRepo:" + codeRepo);
        core.info("codeType:" + codeType);
        core.info("repoName:" + repoName);
        const cybersec_token = core.getInput('cybersec_token', { required: false }) || "";

        if (codeType === "sca") {
            failed = cloudRunScan(20000430, spaceId, projectId,branch, codeRepo, tips);
        } else if (codeType === "stc") {
            //没有cybersec_token参数则走原cloudRun
            //有cybersec_token参数则源蜥服务
            if (cybersec_token === "") {
                failed = cloudRunScan(20000431, spaceId, projectId,branch, codeRepo, tips);
            } else {
                //1. 创建扫描任务
                const token = "G9w3tIu3PmEnNibhUyp3BUGCZxpTD7jB";
                const scanTaskResponse = await axios.post(`https://cybersec.antgroup.com/api/sca/open/v1/repo/scan/git?token=${token}`, {
                    "projectName": repoName,
                    "branch": branch,
                    "repository": codeRepo
                });
                const scanTaskId = scanTaskResponse.data.data.scanId;
                const projectId = scanTaskResponse.data.data.projectId;

                // 2. 循环获取扫描结果
                core.info("Scanning...");
                let status = "";
                const timeout = 20; // minute
                let statusResponse;
                let shareLink = "";
                for (let i = 0; i < timeout * 6; i++) {
                    statusResponse = await axios.get(`https://cybersec.antgroup.com/api/sca/open/v1/repo/job/status?jobId=${scanTaskId}&token=${token}`);
                    status = statusResponse.data.data.status;
                    if (status === "扫描完成" || status === "扫描失败") {
                        shareLink = statusResponse.data.data.shareLink;
                        break;
                    }
                    await sleep(10);
                }
                core.info("Scan completed, status: " + status);

                // 3. 获取扫描结果
                if (status === "扫描完成") {
                    const scanResultResponse = await axios.post(`https://cybersec.antgroup.com/api/sca/open/v1/repo/vuls/detail?token=${token}`, {
                        "repoId": projectId,
                        "page": "1",
                        "size": "200"
                    });
                    core.warning(`详情请查看：${shareLink}` + " " + "(link valid for 3 days)");
                    const itemList = scanResultResponse.data.data.itemList;
                    const jobProcessor = jobProcessors["new-stc"];
                    if (jobProcessor) {
                        failed = jobProcessor(itemList) || failed;
                    }
                }
            }
        } else {
             core.error("错误：无效的codeType");
             return;
        }
    } catch (error) {
        core.setFailed(error.message);
    }
    core.setOutput("result", failed ? "FAILED" : "PASSED");
}

async function cloudRunScan(templateId, spaceId, projectId,branch, codeRepo, tips){
    let failed = false;
    // 1. 获取token
    core.info("start...");
    const tokenResponse = await axios.post('https://tcloudrunconsole.openapi.cloudrun.cloudbaseapp.cn/v2/login/serviceaccount', {
        "parent_uid": core.getInput('parent_uid', { required: true }),
        "private_key": core.getInput('private_key', { required: true })
    });
    const token = tokenResponse.data.data.access_token;

    // 设置请求头
    const headers = {
        'Authorization': `Bearer ${token}`,
        'x-node-id': core.getInput('parent_uid', { required: true }),
        'Content-Type': 'application/json'
    };

    // 2. 调用代码检查
    const pipelineExecuteResponse = await axios.post(`https://tdevstudio.openapi.cloudrun.cloudbaseapp.cn/webapi/v1/space/${spaceId}/project/${projectId}/pipeline/execute`, {
        "templateId": templateId,
        "branch": branch,
        "codeRepo": codeRepo
    }, {
        headers: headers
    });

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
    const recordResult = recordResponse.data.result;
    const allJobs = recordResult.stageExecutions.flatMap(stage => stage.jobExecutions);
    for (const failureJob of allJobs) {
        const jobId = failureJob.id;
        const jobResponse = await axios.get(`https://tdevstudio.openapi.cloudrun.cloudbaseapp.cn/webapi/v1/space/${spaceId}/project/${projectId}/pipeline/${recordId}/job/${jobId}`, {
            headers: headers
        });
        const link = `https://devops.cloud.alipay.com/project/${projectId}/${recordId}/pipeline/details`;
        core.warning(`详情请查看：${link}` + "  " + tips);
        const jobDetail = jobResponse.data.result.data;
        const jobProcessor = jobProcessors[failureJob.componentName];
        if (jobProcessor) {
            failed = jobProcessor(jobDetail) || failed;
        }
    }
    return failed;
}

function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
module.exports = getStarted;