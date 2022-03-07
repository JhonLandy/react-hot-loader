function shouldSkip(state) {
    return state.shouldSkip || !state.reactNode || state.exported
}

module.exports = {
    shouldSkip
}