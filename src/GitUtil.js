const { execSync } = require('child_process');
export class GitUtil {
    token
    constructor(token) {
        this.token = token;
    }
    checkoutB(branchName){
        execSync(`git checkout - b ${branchName}`);
    }
}