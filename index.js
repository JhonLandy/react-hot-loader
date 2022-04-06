const { declare } = require("@babel/helper-plugin-utils");
const R = require("ramda");
const inject = require("./inject");
const utils = require("./utils");

const { injectCodeForRoot, injectCodeByType } = inject;
const { getReg, shouldSkip, hasPath } = utils;
module.exports = declare((api, options) => {
    if (api.getEnv() === "production") {
        return {};
    }
    api.assertVersion(7);
    const { types } = api;
    const { includePaths = [], excludePaths = [] } = options;
    excludePaths.push("/node_modules");
    return {
        visitor: {
            Program(_path, state) {
                const filename = state.filename;
                state["depends"] = types.arrayExpression();
                state["reactNode"] = null;
                state["exportNode"] = null;
                state["rootNode"] = _path.node;

                const shouldSkip = R.isEmpty(includePaths)
                    ? false
                    : !hasPath(includePaths, filename);
                state.shouldSkip = shouldSkip ? shouldSkip : hasPath(excludePaths, filename);
            },
            ImportDeclaration(path, state) {
                if (state.shouldSkip) {
                    return;
                }
                const node = path.node;
                const name = node.source.value;
                if (name === "react") {
                    const reactDefaultNode = node.specifiers.find(im => im.local.name === "React");
                    if (reactDefaultNode) {
                        state.reactNode = node;
                    }
                }
                state.depends.elements.push(types.stringLiteral(name));
            },
            CallExpression(path, state) {
                const node = path.node;
                const callee = node.callee.name
                    ? node.callee.name
                    : node.callee.object
                    ? node.callee.object.name
                    : undefined;
                if (callee === "ReactDom") {
                    const rootNode = state.rootNode;
                    injectCodeForRoot(api, state, rootNode);
                }
            },
            ExportDefaultDeclaration(path, state) {
                if (shouldSkip(state)) {
                    return;
                }
                state.exportNode = path.node;
                const declaration = path.node.declaration;
                injectCodeByType(api, state, declaration);
            },
        },
    };
});
