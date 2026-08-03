# 图标
仅包含图标库的图标。

# 使用方法
这个库利用figma-export直接从figma对应的文件中拉取所有icon图标，生成svg组件。
并通过typescript编译成js。

执行命令:

`pnpm run figma:build`

# 配置Access Token
由于是从figma上拉取数据，需要自行配置token。

## 如何获取Figma Access Token
详见：[Figma - Manage personal access token](https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens)

## 设置配置文件
复制一份.env.example文件，重命名为.env。
文件内的`{TOKEN}`更新为你获得Token即可。

# 提交代码
output目录下的文件需要一并被提交。会作为编译的源码。

# 与设计的约定
与设计师达成了以下约定
- 图标库的图标全部放到figma单独的一个页面（Page）中。并且只有图标被设置为component。
- 图标的命名遵循以下规范
  - 以"icon/"开头，方便设计师在fimga上使用
  - 内容使用连词符风格。
  - 不能重名。
