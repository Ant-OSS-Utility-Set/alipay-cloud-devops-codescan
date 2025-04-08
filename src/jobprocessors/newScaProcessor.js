const core = require("@actions/core");

/**
 * 处理开源合规的扫描结果 返回ture表示有报错
 * 报错:
 *   1. 存在licence冲突
 */
function process(itemList){
    core.debug("licence itemList:"+itemList)
    if (itemList.length==0) {
        return false
    }

//    licence冲突 报错
    itemList.forEach((item, index) => {
                core.setFailed(`请注意, 项目依赖的 ${item.namespace}:${item.name}:${item.version} 组件,使用的licence可能与本项目冲突: ${item.sbomLicense}`)
            });
    return true;
}
module.exports = process;