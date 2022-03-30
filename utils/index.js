function shouldSkip(state) {
    return state.shouldSkip || !state.reactNode
}
function getReg(path) {
    const oStartReg = /^(.*)\*(.*)$/
    const singleMatch = path.match(oStartReg)

    const tStartReg = /^(.*)\*\*(.*)$/
    const doubleMatch = path.match(tStartReg)

    let regStr = path
    if (doubleMatch) {
        const [_, start, end] = doubleMatch
        regStr = start
        const singleMatch = end.match(oStartReg)
        if (singleMatch) {
            const [_, start, end] = singleMatch
            regStr += start + '\(\.\*\)' + end + '\\.\(\.\*\)'
        } else {
            regStr += '\(\.\*\)' + end + '\(\.\*\)' + '\/'
        }
    } else if (singleMatch) {
        const [_, start, end] = singleMatch
        regStr = start + '\(\.\*\)' + end + '\\.\(\.\*\)'
    }
    regStr = regStr.replace('//', '/')
    return new RegExp(regStr)
}
function hasPath(paths = [], filename) {
    return paths
        .map(url => getReg(url))
        .some(pathReg => pathReg.test(filename.replace(/\\/g, "/")));
}
module.exports = {
    getReg,
    shouldSkip,
    isPrepareExport,
    hasPath,
};