const R = require("ramda");

const templateOptions = {
    placeholderPattern: /^([A-Z0-9]+)([A-Z0-9_]+)$/,
};
const fail = [];
const success = [];
function injectCodeForRoot(api, state, root) {
    if (!root) return;
    const { template } = api;
    const renderHotCode = `
        (function () {  
            if (module && module.hot) {
                module.hot.accept()
            }
        })(this);
    `;
    const rootAst = template(renderHotCode, templateOptions)();
    root.body.push(rootAst);
}
function injectCodeForFunction(api, state, node) {
    if (!node) return;
    const { template, types } = api;
    const { depends, reactNode } = state;
    const functionHotCode = `
        (function () {  
           const [_, forceUpdate] = useReducer(x => x + 1, 0)
            if (module && module.hot) {
                module.hot.accept(DEPS, () => {
                    forceUpdate()
                })
            }
        })();
    `;
    const newNode = types.importSpecifier(
        types.identifier("useReducer"),
        types.identifier("useReducer")
    );
    const hasReducer = reactNode.specifiers.find(s => {
        if (!s.imported) {
            return false;
        } else {
            return s.imported.name === newNode.imported.name;
        }
    });
    if (!hasReducer) {
        reactNode.specifiers.push(newNode);
    }
    const fnAst = template(
        functionHotCode,
        templateOptions
    )({
        DEPS: depends,
    });
    const cBody = node.body;
    if (types.isBlockStatement(cBody)) {
        node.body.body.unshift(fnAst);
    } else {
        const returnStatement = types.returnStatement(cBody);
        const blockStatement = types.blockStatement([fnAst, returnStatement]);
        node.body = blockStatement;
    }
}
function injectCodeForClass(api, state, node) {
    if (!node) return;
    const { template, types } = api;
    const { depends } = state;
    const classHotCode = `
        (function () {  
            if (module && module.hot) {
                module.hot.accept(DEPS, () => {
                     if (_this) {
                        // _this 是编译后的class实例
                        _this.forceUpdate()
                    }
                })
            }
        }).call(this);
    `;
    const classAst = template(
        classHotCode,
        templateOptions
    )({
        DEPS: depends,
    });
    const superExpression = types.expressionStatement(
        types.callExpression(types.super(), [types.identifier("props")])
    );
    const blockStatement = types.blockStatement([superExpression, classAst]);
    const constructorMethodNode = types.classMethod(
        "constructor",
        types.identifier("constructor"),
        [types.identifier("props")],
        blockStatement
    );
    const constructorMethod = node.body.body.find(method => {
        return method.kind === "constructor";
    });

    if (R.isNil(constructorMethod)) {
        node.body.body.unshift(constructorMethodNode);
    } else {
        constructorMethod.body.body.push(classAst);
    }
}
function injectCodeForSpecialClass(api, state, node) {
    if (!node) return;
    const { template, types } = api;
    const { depends } = state;
    const classHotCode = `
        (function () {  
            if (module && module.hot) {
                module.hot.accept(DEPS, function () {
                    if (_this) {
                        // _this 是编译后的class实例
                        _this.forceUpdate()
                    }
                })
            }
        })()
    `;
    const classAst = template(
        classHotCode,
        templateOptions
    )({
        DEPS: depends,
    });
    const cBody = node.body;
    if (types.isBlockStatement(cBody)) {
        const returnStatement = node.body.body.pop();
        node.body.body.push(classAst, returnStatement);
    }
}
function injectCodeForOtherType(api, state, node) {
    const { depends, exportNode } = state;
    const { template } = api;
    const buildTagger = template(
        `reactHotRegister 
                    ? reactHotRegister(function(update) {
                        if (module && module.hot) {
                            module.hot.accept(DEPENDENCIES, function() {
                                window.isHot = true
                                update()
                                window.isHot = false
                            })
                        }
                    })(COMPONENT) 
                    : COMPONENT
                `,
        templateOptions
    )({
        DEPENDENCIES: depends,
        COMPONENT: node,
    });
    exportNode.declaration = buildTagger;
}
function injectCodeByType(api, state, node, fnCaller) {
    if (!node) {
        return;
    }
    const { types } = api;
    const {
        isArrayExpression,
        isObjectExpression,
        isArrowFunctionExpression,
        isFunctionExpression,
        isFunctionDeclaration,
        isClassExpression,
        isClassDeclaration,
        isCallExpression,
        isIdentifier,
    } = types;

    switch (true) {
        case isArrayExpression(node):
        case isObjectExpression(node):
            return;
        case isArrowFunctionExpression(node):
        case isFunctionExpression(node):
        case isFunctionDeclaration(node): {
            injectCodeForFunction(api, state, node);
            success.push(state.filename);
            break;
        }
        case isClassExpression(node):
        case isClassDeclaration(node): {
            injectCodeForClass(api, state, node);
            success.push(state.filename);
            break;
        }
        case isIdentifier(node):
        case isCallExpression(node):
            injectCodeForOtherType(api, state, node);
            break;
        default:
            fail.push(state.filename);
    }
}

module.exports = {
    injectCodeForRoot,
    injectCodeForFunction,
    injectCodeForClass,
    injectCodeForSpecialClass,
    injectCodeByType,
};
