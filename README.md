# react-hot-loader

## 介绍

搭建的前端项目，由于社区提供的react-hot-loader没生效，所以自己写了一个。当然还有很多优化点的地方和写法。


```js
{
 
  "presets": [
    ...
  ],
  "plugins": [
    ["./**/react-hot-loader", {
      "includePaths": ["./src/screen", "./scr/components"],
      "excludePaths": ["./node_modules",  "./src/utils/Api"]
    }]
  ]
}
```
