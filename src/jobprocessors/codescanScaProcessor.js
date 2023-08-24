const core = require("@actions/core");

/**
 * 处理开源合规的扫描结果 返回ture表示有报错
 * 警告:
 *   1. 代码相似度过高
 * 报错:
 *   1. 存在licence冲突
 */
function process(jobDetail){
    core.debug("jobDetail.artifacts:"+jobDetail.artifacts)
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
            core.setFailed(`请注意, 项目依赖的 ${componentName}:${version} 组件,使用的licence可能与本项目冲突: ${licenceName}`)
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