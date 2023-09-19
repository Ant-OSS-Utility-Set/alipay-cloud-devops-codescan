const stcProcessor = require("../jobprocessors/stcProcessor")

stcProcessor({
    "warn": "[]",
    "high": "[{\"bugUrl\":\"http://cloudrun-antstc-hz.cn-hangzhou-alipay-g.oss-alipay.aliyuncs.com/bug/42e015f0b66a60fa0a405ea143046a04.html?Expires=2009589606&OSSAccessKeyId=LTAI5tFNcLRq5s6gdS6zeMc9&Signature=UvQLF0odqwUUBRySCPSQiih%2FVP0%3D\",\"filePath\":\"http://github.com/xuqiu/sofa-rpc/blob/master/config/config-apollo/pom.xml\",\"rank\":\"high\",\"description\":\"间接依赖的组件是:\\n\\t\\t<groupId>com.google.code.gson</groupId>\\n\\t\\t<artifactId>[H[gson]H]</artifactId>\\n\\t\\t\\n间接依赖链路如下:\\ncom.ctrip.framework.apollo:apollo-client:1.4.0->com.google.code.gson:gson:2.8.0\\n\\n对应的修复版本为:\\n\\t\\t<version>2.8.9</version>\",\"subType\":\"MPS-2022-12287_com.google.code.gson_gson\",\"block\":\"BugBlocked\",\"id\":4300016,\"title\":\"检测到应用间接依赖了不安全版本的组件com.google.code.gson:gson\",\"status\":\"漏洞提交\"}]",
    "low": "[]",
    "medium": "[]",
    "urgent": "[]"
});