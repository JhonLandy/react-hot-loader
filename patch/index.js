import React, { useReducer, forwardRef } from 'react'
import * as R from 'ramda'

window.reactHotRegister = function (callback) {
    return Comp => {
        if (typeof Comp === "function"
            && R.includes("use", Comp.name)// 不处理自定义hooks
        ) {
            return Comp
        }
        return forwardRef((props, ref) => {
            const [_, forceUpdate] = useReducer(x => x + 1, 0)
            callback && callback(forceUpdate)
            return <Comp {...props} ref={ref}/>
        })
    }
}

export {}