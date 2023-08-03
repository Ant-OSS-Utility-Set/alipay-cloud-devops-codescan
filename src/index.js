

const core = require('@actions/core');
const axios = require('axios');
import { GitUtil } from './GitUtil.js';
const PAT = core.getInput('pat', { required: false })
const mathUtils = new GitUtil(PAT);
const fs = require('fs');
const { execSync } = require('child_process');
async function getStarted() {
    const repo = process.env.GITHUB_REPOSITORY;
    const branchRef = process.env.GITHUB_REF;
    const branchName = branchRef.split('/').pop();
    const owner = repo.split('/').shift();
    try {
        core.info("1111");
        //push事件直接扫描该分支
        if (process.env.GITHUB_EVENT_NAME === 'push') {
            // console.log('This is a push event.');
            core.setFailed("调试中,暂时跳过")
            return
        //pr事件,如果是同owner,扫描源分支,如果是fork项目,创建临时分支,扫描临时分支
        //最后根据扫描结果,给pr做标记
        } else if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
            core.info("222");
            core.info(`PAT: ${PAT?PAT.slice(1):PAT}`);
            // 读取 GITHUB_EVENT_PATH 环境变量指向的 JSON 文件
            const eventData = fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8');

// 解析 JSON 数据
            const eventJson = JSON.parse(eventData);
            // console.log(`eventData: ${eventData}`);
// 获取 Pull Request 的源信息
            const sourceBranch = eventJson.pull_request.head.ref;
            const sourceRepo = eventJson.pull_request.head.repo.full_name;
//             const sourceBranch = "master"
//             const sourceRepo = "yinzhennantw/MyLeetCode"
            const sourceOwner = sourceRepo.split('/').shift();
            if (sourceOwner === owner) {
                // todo 直接检查分支
            }else{
                // 克隆 fork 子项目
                execSync(`git clone https://github.com/${sourceRepo}.git`);
                // 进入子项目目录
                process.chdir(`${sourceRepo.split('/').pop()}`);
                // 检出指定分支
                execSync(`git checkout ${sourceBranch}`);
                // 新增remote
                core.info(`owner: ${owner}`);
                execSync(`git remote add ${owner} https://a:${PAT}@github.com/xuqiu/MyLeetCode.git`);
                execSync(`git remote -v`);
                // push临时分支
                const temp_branch = 'temp-'+getTimestamp();
                execSync(`git push ${owner} ${sourceBranch}:${temp_branch}`);


            }
            core.setFailed(`PAT: ${PAT?PAT.slice(1):PAT}`);
            return
        } else {
            core.setFailed("本工具暂时只支持push/pull_request我");
            return;
        }
        const spaceId = `600087`;
        let projectId;
        let templateId;

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
        if (highAndUrgent.length === 0) {
            core.setOutput("result","PASSED")
            return;
        }
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
function getTimestamp(){
    const now = new Date();
    const year = now.getFullYear();
    const month = ('0' + (now.getMonth() + 1)).slice(-2);
    const day = ('0' + now.getDate()).slice(-2);
    const hours = ('0' + now.getHours()).slice(-2);
    const minutes = ('0' + now.getMinutes()).slice(-2);
    const seconds = ('0' + now.getSeconds()).slice(-2);
    return year + month + day + hours + minutes + seconds;
}
let notCare = getStarted();
