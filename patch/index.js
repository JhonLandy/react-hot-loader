import React, { useReducer, forwardRef, useRef, useImperativeHandle } from "react";
import * as R from "ramda";
window.isHot = false;
window.reactHotRegister = function (callback) {
    return Comp => {
        if (
            typeof Comp === "function" &&
            R.includes("use", Comp.name) // 不处理自定义hooks
        ) {
            return Comp;
        }
        return forwardRef((props, ref) => {
            const _ref = useRef();
            const reducer = useReducer(x => x + 1, 0);

            if (Comp.compare) {
                const compare = Comp.compare;
                Comp.compare = (...state) => (isHot ? false : compare(...state));
            } else {
                const prototype = Comp.prototype;
                const shouldComponentUpdate = prototype?.shouldComponentUpdate;

                if (prototype && shouldComponentUpdate) {
                    if (!_ref.current) {
                        _ref.current = new Comp(props);
                    }
                    const instance = _ref.current;
                    prototype.shouldComponentUpdate = (...state) =>
                        isHot ? true : shouldComponentUpdate.call(instance, ...state);
                }
            }
            useImperativeHandle(ref, () => _ref.current, []);
            callback(reducer[1]);
            return <Comp {...props} ref={_ref} />;
        });
    };
};

export {};
