import React, { useReducer, forwardRef, createElement, Component } from "react";
import * as R from "ramda";
window.isHot = false;
function wrapperFunction(WrapperComponent, callback) {
    return (props, ref) => {
        const [_, forceUpdate] = useReducer(x => x + 1, 0);
        callback(forceUpdate);
        if (ref) {
            props = Object.assign(props, { ref });
        }
        return createElement(WrapperComponent, props);
    };
}
function typeOf(type) {
    if (typeof type === "object" && type !== null) {
        var $$typeof = type.$$typeof;
        return $$typeof?.toString();
    }
    return undefined;
}
function isForwardRef(Component) {
    return typeOf(Component) === "Symbol(react.forward_ref)";
}
function isMemo(Component) {
    return typeOf(Component) === "Symbol(react.memo)";
}
window.reactHotRegister = function (callback) {
    
    return Comp => {
        if (
            typeof Comp === "function" &&
            R.includes("use", Comp.name) // 不处理自定义hooks
        ) {
            return Comp;
        }
        switch (true) {
            case isForwardRef(Comp):
                return forwardRef(wrapperFunction(Comp, callback));
            case isMemo(Comp):
                const compare = Comp.compare;
                Comp.compare = (...state) => (isHot ? false : compare(...state));
                return wrapperFunction(Comp, callback);
            case "forceUpdate" in Comp.prototype:
                const prototype = Comp.prototype;
                const shouldComponentUpdate = prototype?.shouldComponentUpdate;

                if (prototype && shouldComponentUpdate) {
                    prototype.shouldComponentUpdate = function (...args) {
                        return isHot ? true : shouldComponentUpdate.call(this, ...args);
                    };
                }
                return forwardRef(wrapperFunction(Comp, callback));
            default:
                // 普通組件函數
                return wrapperFunction(Comp, callback);
        }
    };
};
