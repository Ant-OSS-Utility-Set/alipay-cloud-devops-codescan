

const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');

async function getStarted() {
    try {
        //1,获取token
        const response = await axios.post('https://tcloudrunconsole.openapi.cloudrun.cloudbaseapp.cn/v2/login/serviceaccount',
            {
                "parent_uid": core.getInput('parent_uid', { required: true }),
                "private_key": core.getInput('private_key', { required: true }),
            })

        // .then((response) => {
        //     console.log(`Status Code: ${response.status}`);
        //     console.log(`Response Body: ${response.data}`);
        //
        // })
        // .catch((error) => {
        //     core.setFailed(error.message);
        // });

        triggerFlow(response.data.data.access_token);
        //core.setOutput("result", response.data.data.access_token)
        core.setFailed("你的代码有问题!!")

        // // `who-to-greet` input defined in action metadata file
        // const nameToGreet = core.getInput('who_to_greet');
        // console.log(`Hello ${nameToGreet}!`);
        // const time = (new Date()).toTimeString();
        // core.setOutput("time", time);
        // // Get the JSON webhook payload for the event that triggered the workflow
        // const payload = JSON.stringify(github.context.payload, undefined, 2)
        // console.log(`The event payload: ${payload}`);
    } catch (error) {
        core.setFailed(error.message);
    }
    return "111";
}
function triggerFlow(token){
    // console.log(`token ${token}!`);
}

result = getStarted();
console.log(result);
