const { declare } = require("@babel/helper-plugin-utils")
const R = require('ramda')
const path = require("path")
const inject = require("./inject")
const utils = require("./utils")


const { injectCodeForRoot, injectCodeByType } = inject
const { shouldSkip } = utils

module.exports = declare((api, options) => {
    if (process.env.NODE_ENV === 'production') {
        return {}
    }
    api.assertVersion(7)
    const { types } = api
    const { includePaths = [],  excludePaths = [], excludeFile } = options
    const _includePaths = includePaths.map(url => path.resolve(url))
    const _excludePaths = excludePaths.concat(["./node_modules"]).map(url => path.resolve(url))
    return {
        visitor: {
            Identifier(path, state) {
                if (shouldSkip(state)) {
                    return
                }
                const node = path.node
                const name = node.name
                const fnMap = state.fnMap
                const classMap = state.classMap
                if (fnMap.has(name) || classMap.has(name)) {
                    return
                }
                let valueNode = path.parent.init
                valueNode = valueNode ? valueNode : path.parent

                if (types.isFunctionExpression(valueNode)
                    || types.isArrowFunctionExpression(valueNode)
                ) {
                    fnMap.set(name, valueNode)
                }
                if(types.isClassExpression(valueNode)) {
                    classMap.set(name, valueNode)
                }
            },
            Program(_path, state) {
                const filename = state.filename
                state['classMap'] = new Map()
                state['fnMap'] = new Map()
                state['depends'] = types.arrayExpression()
                state['reactNode'] = null
                state['exported'] = false
                state['rootNode'] = _path.node
                state.isFunctionIdentifier = (node) => types.isIdentifier(node) && state.fnMap.has(node.name) && !state.classMap.has(node.name)
                state.isClassIdentifier = (node) => types.isIdentifier(node) && state.classMap.has(node.name) && !state.fnMap.has(node.name)
                state.isSpecialClassIdentifier = (node) => types.isIdentifier(node) && state.classMap.has(node.name) && state.fnMap.has(node.name)

                const shouldSkip = R.isEmpty(_includePaths) ? false : !Boolean(_includePaths.find(path =>  R.includes(path, filename)))
                if (shouldSkip) {
                    state.shouldSkip = true
                    state.filename = filename
                } else {
                    if (excludeFile && excludeFile.test(filename)
                        || Boolean(_excludePaths.find(path =>  R.includes(path, filename)))
                    ) {
                        state.shouldSkip = true
                        state.filename = filename
                    }
                }
            },
            ClassDeclaration(path, state) {
                if (shouldSkip(state)) {
                    return
                }

                const node = path.node
                const classId = node.id

                if (!classId) {
                    return
                }
                const classMap = state.classMap
                const name = classId.name
                if (!classMap.has(name)) {
                    classMap.set(name, node)
                }
            },
            FunctionDeclaration(path, state) {
                if (shouldSkip(state)) {
                    return
                }
                const node = path.node
                const fnId = node.id
                if (!fnId) {
                    return
                }
                const fnMap = state.fnMap
                const name = fnId.name
                if (!fnMap.has(name)) {
                    fnMap.set(name, node)
                }
            },
            ImportDeclaration(path, state) {
                if (state.shouldSkip) {
                    return
                }
                const name = path.node.source.value
                if (name === 'react') {
                    state.reactNode = path.node
                }
                state.depends.elements.push(types.stringLiteral(name))
            },
            CallExpression(path, state) {
                const node = path.node
                const callee = node.callee.name ? node.callee.name : node.callee.object ? node.callee.object.name : undefined
                if (callee === 'ReactDom') {
                    console.log('callee',callee)
                    const rootNode = state.rootNode
                    injectCodeForRoot(api, state, rootNode)
                }
            },
            ExportDefaultDeclaration(path, state) {
                if (shouldSkip(state)) {
                    return
                }
                const declaration = path.node.declaration
                injectCodeByType(api, state, declaration)
                state.exported = true
            }
        }
    }
})