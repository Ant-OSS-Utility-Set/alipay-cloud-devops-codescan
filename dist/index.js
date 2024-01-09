/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 624:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(320);
const axios = __nccwpck_require__(383);
const jobProcessors = __nccwpck_require__(353);
const {context} = __nccwpck_require__(280);


let notCare = getStarted();
async function getStarted() {
    let failed = false;
    try {
        const spaceId = `600095`;
        const projectId = `19500036`;
        // 从参数获取branch和codeRepo
        const branchName = process.env.GITHUB_HEAD_REF;
        const branch = branchName.replace('refs/heads/','')
        const codeRepo = context.payload.pull_request.head.repo.ssh_url;
        const codeType = process.env.INPUT_SCAN_TYPE;
        const tips = core.getInput('tips', { required: true })
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



/***/ }),

/***/ 854:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(320);

/**
 * 处理开源合规的扫描结果 返回ture表示有报错
 * 警告:
 *   1. 代码相似度过高
 * 报错:
 *   1. 存在licence冲突
 */
function process(jobDetail){
    core.debug("jobDetail.artifacts:"+jobDetail.artifacts)
    if (jobDetail.state !== "Success") {
        core.error("开源合规组件 执行失败 或 超时未完成!")
        return true
    }
    const artifacts = JSON.parse(jobDetail.artifacts);
    const licence = artifacts.license;
    let failed = false

    //licence冲突 报错
    const licenceText = JSON.parse(licence.text);
    if (licenceText.compatibility === false) {
        Object.entries(licenceText.conflictingLicense).forEach(([licenceName, component]) => {
            if (licenceName === "") {
                return;
            }
            const [componentName, version] = Object.entries(component)[0];
            // core.setFailed(`请注意, 项目依赖的 ${componentName}:${version} 组件,使用的licence可能与本项目冲突: ${licenceName}`)
            core.warning(`请注意, 项目依赖的 ${componentName}:${version} 组件,使用的licence可能与本项目冲突: ${licenceName}`)
            failed = true;
        });
    }
    //code相似 警告
    const code = artifacts.code;
    const codeText = JSON.parse(code.text);
    Object.entries(codeText).forEach(([fileName, conflictRepo]) => {
        core.warning(`请注意, 您的代码 ${fileName} 与 开源项目 ${conflictRepo[0].name}:${conflictRepo[0].version} 的文件: ${conflictRepo[0].downloadUrl} 相似度: ${conflictRepo[0].score}`)
    });
    return ! licenceText.compatibility;
}
module.exports = process;

/***/ }),

/***/ 353:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const stcProcessor = __nccwpck_require__(132)
const codescanScaProcessor = __nccwpck_require__(854)
const jobProcessors = {
    "stc": stcProcessor,
    "codescan-sca": codescanScaProcessor
}
module.exports = jobProcessors;

/***/ }),

/***/ 132:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(320);

/**
 * 处理安全扫描里的安全风险 返回ture表示有报错
 * 报错:
 *   1. high/urgent 级别的安全隐患
 * 警告:
 *   1. low/medium/warn 级别的安全隐患
 */
function process(jobDetail){
    let hasError = false;
    [...JSON.parse(jobDetail.high), ...JSON.parse(jobDetail.urgent),...JSON.parse(jobDetail.low), ...JSON.parse(jobDetail.medium), ...JSON.parse(jobDetail.warn)].forEach(risk=>{
        let errorMessage = risk.title;
        if (risk.filePath) {
            errorMessage += `\n文件: ${risk.filePath}`
        }
        if (risk.description) {
            errorMessage += `\n细节/建议:\n${risk.description}`
        }
        if (['high','urgent'].includes(risk.rank)){
            hasError = true;
            core.setFailed(errorMessage);
        }else {
            core.warning(errorMessage);
        }
    });
    return hasError;
}
module.exports = process;

/***/ }),

/***/ 320:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 280:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 383:
/***/ ((module) => {

module.exports = eval("require")("axios");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __nccwpck_require__(624);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;