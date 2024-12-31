const core = require("@actions/core");

/**
 * 处理安全扫描里的安全风险 返回ture表示有报错
 * 报错:
 *   1. high/urgent 级别的安全隐患
 * 警告:
 *   1. low/medium/warn 级别的安全隐患
 */
function process(itemList){
    let hasError = false;
    let count = 0;
    itemList.forEach(item=>{
        if (count++ >= 10){
            return;
        }
        let errorMessage = item.subject;
        if (item.vulDependenceProofs) {
            errorMessage += `\n文件: ${item.vulDependenceProofs[0].introductionPath}`
            errorMessage += `\n组件: ${item.vulDependenceProofs[0].vulComponent}` + `, 版本: ${item.vulDependenceProofs[0].vulCurrentVersion}`
            errorMessage += `\n细节/建议版本:${item.vulDependenceProofs[0].vulFixVersion}`
        }
        if (['严重','高危'].includes(item.rank)){
            hasError = true;
            core.setFailed(errorMessage);
        }else {
            core.warning(errorMessage);
        }
    });
    return hasError;
}
module.exports = process;