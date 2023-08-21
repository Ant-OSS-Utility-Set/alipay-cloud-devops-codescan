const stcProcessor = require("./stcProcessor")
const codescanScaProcessor = require("./codescanScaProcessor")
const jobProcessors = {
    "stc": stcProcessor,
    "codescan-sca": codescanScaProcessor
}
module.exports = jobProcessors;