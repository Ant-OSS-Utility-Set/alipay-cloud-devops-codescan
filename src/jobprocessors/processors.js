const stcProcessor = require("./stcProcessor")
const codescanScaProcessor = require("./codescanScaProcessor")
const newStcProcessor = require("./newStcProcessor")
const jobProcessors = {
    "stc": stcProcessor,
    "codescan-sca": codescanScaProcessor,
    "new-stc": newStcProcessor
}
module.exports = jobProcessors;