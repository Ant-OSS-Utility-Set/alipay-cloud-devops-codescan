const stcProcessor = require("./stcProcessor")
const codescanScaProcessor = require("./codescanScaProcessor")
const newStcProcessor = require("./newStcProcessor")
const newScaProcessor = require("./newScaProcessor")
const jobProcessors = {
    "stc": stcProcessor,
    "codescan-sca": codescanScaProcessor,
    "new-stc": newStcProcessor,
    "new-sca": newScaProcessor
}
module.exports = jobProcessors;