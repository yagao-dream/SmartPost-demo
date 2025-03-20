#!/bin/bash

# 安装项目依赖
echo "正在安装项目依赖..."
npm install

# 生成 Prisma 客户端
echo "正在生成 Prisma 客户端..."
npx prisma generate

# 初始化数据库
echo "正在初始化数据库..."
npx prisma migrate dev --name init

# 询问是否启动 Prisma Studio
read -p "是否要启动 Prisma Studio 来查看数据库？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "正在启动 Prisma Studio..."
    npx prisma studio
fi

echo "初始化完成！"
echo "请运行 'npm run dev' 启动开发服务器" 