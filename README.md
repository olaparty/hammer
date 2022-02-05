
[<p align="left"><img src="icon.png" dwidth="80" height="80" align="center"/></p>](https://marketplace.visualstudio.com/items?itemName=zhileichen.hammer)

#  Hammer Visual Studio Code Plugin 
![GitHub package.json version](https://img.shields.io/github/package-json/v/olaparty/hammer)
![Visual Studio Marketplace Last Updated](https://img.shields.io/visual-studio-marketplace/last-updated/zhileichen.hammer)
![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/i/zhileichen.hammer)
![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/zhileichen.hammer)

[Get it from the VS Code Marketplace →](https://marketplace.visualstudio.com/items?itemName=zhileichen.hammer) 

## Prerequisites
You need to have node and npm installed on your system to run the project. It is recommended to use the node version used for VS Code development itself which is documented here.

For more information, please refer [vscode extension developement guideline ](https://code.visualstudio.com/api/get-started/your-first-extension)


## Configuration
To work with the Hammer plugin in the Visual Studio Code workspace, you need to create a configuration file named `hammer.yaml` in your project.

Configuration file `hammer.yaml` example:

```
project_id: 405814  #open project and go to Integrations > API
directory_id: 20    # 
api_token: ''       #open profile settings and go to API > New Token > create Token
base_path: "./"      #optional
preserve_hierarchy: true     #optional

files:
  -
    source: '%module_name%/assets/locale/*_zh_CN.json'
    translation: 'client/%module_name%_%file_name%.json'
    directory: 'client'
    languages_mapping: &anchor
      locale:
        'zh-TW': 'zh_TW'
        'zh_TW': 'zh-TW'
```

## Running the project

- Run `npm install` in terminal to install dependencies
- Run the `Run Extension` target in the Debug View. This will:
	- Start a task `npm: watch` to compile the code
	- Run the extension in a new VS Code window

## Features
- 基于proto生成dart model和API代码
![proto2dart.gif](doc/proto2dart.gif)
- 未翻译的文本检测和一键修复
![text_quickfix.gif](doc/text_quickfix.gif)
- 自定义规则检测不合规控件使用并一键修复 
![widget_quickfix.gif](doc/widget_quickfix.gif)
- 一键同步crowdin的翻译文本到本地项目
![download_intl.gif](doc/download_intl.gif)
- 一键上传待翻译文本到crowdin
![upload_intl.gif](doc/upload_intl.gif)
