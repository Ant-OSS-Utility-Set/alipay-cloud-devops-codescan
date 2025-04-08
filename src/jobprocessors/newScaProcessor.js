const core = require("@actions/core");

/**
 * 处理开源合规的扫描结果 返回ture表示有报错
 * 报错:
 *   1. 存在licence冲突
 */
function process(itemList){
    core.debug("licence itemList:"+itemList)
    if (itemList==null || itemList.length==0) {
        return true
    }

    //licence冲突 报错
//    itemList.forEach((item, index) => {
//                // core.setFailed(`请注意, 项目依赖的 ${componentName}:${version} 组件,使用的licence可能与本项目冲突: ${licenceName}`)
//                core.warning(`请注意, 项目依赖的 ${item.projectLicense}:${version} 组件,使用的licence可能与本项目冲突: ${licenceName}`)
//                failed = true;
//            });
    return false;
}
module.exports = process;