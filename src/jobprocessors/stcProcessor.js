const core = require("@actions/core");

/**
 * 处理安全扫描里的安全风险 返回ture表示有报错
 * 报错:
 *   1. high/urgent 级别的安全隐患
 * 警告:
 *   1. low/medium/warn 级别的安全隐患
 */
function process(jobDetail){
    //高等级 报错
    const highAndUrgent = [...JSON.parse(jobDetail.high), ...JSON.parse(jobDetail.urgent)];
    highAndUrgent.forEach(risk=>{
        let errorMessage = risk.title;
        if (risk.filePath) {
            errorMessage += `\n文件: ${risk.filePath}`
        }
        if (risk.description) {
            errorMessage += `修复建议: ${risk.description}`
        }
        core.setFailed(errorMessage);
    });
    //低等级 警告
    const warningRisks = [...JSON.parse(jobDetail.low), ...JSON.parse(jobDetail.medium), ...JSON.parse(jobDetail.warn)];
    warningRisks.forEach(risk=>{
        let errorMessage = risk.title;
        if (risk.filePath) {
            errorMessage += `\n文件: ${risk.filePath}`
        }
        if (risk.description) {
            errorMessage += `\n修复建议: ${risk.description}`
        }
        core.warning(errorMessage);
    });
    return highAndUrgent.length > 0;
}
module.exports = process;