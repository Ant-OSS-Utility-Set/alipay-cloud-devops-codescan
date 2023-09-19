const core = require("@actions/core");

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