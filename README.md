# react-hot-loader

## 介绍

搭建的前端项目，由于社区提供的react-hot-loader没生效，所以自己写了一个，兼容mobx。当然还有很多优化点的地方和写法。


```js
{
 
  "presets": [
    ...
  ],
  "plugins": [
    ["./src/utils/custom-babel-plugins/react-hot-loader", {
      "includePaths": ["/src/screen", "/src/layout"],
      "excludePaths": [
        "/src/layout/modal",
        "/src/**/store",
        "/src/**/*/EventEmitter"
      ]
    }]
  ]
}
```
