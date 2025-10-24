#!/bin/bash

# 最终CDN验证脚本 - 包含所有上传的资源
echo "🎯 最终CDN验证 - 全面测试..."

echo ""
echo "1️⃣ 测试静态资源:"
echo "GIF文件:"
curl -I https://assets.elick.it.com/cdn/gifs/elick-demo-zh.gif

echo ""
echo "图片文件:"
curl -I https://assets.elick.it.com/cdn/images/bank.png

echo ""
echo "模板文件:"
curl -I https://assets.elick.it.com/cdn/templates/actions-example-zh.json

echo ""
echo "2️⃣ 测试应用下载:"
echo "Windows安装程序:"
curl -I https://assets.elick.it.com/cdn/downloads/v1.0.0/Elick_1.0.0_x64-setup.exe

echo ""
echo "macOS通用版:"
curl -I https://assets.elick.it.com/cdn/downloads/v1.0.0/Elick_1.0.0_universal_universal.dmg

echo ""
echo "更新信息:"
curl -I https://assets.elick.it.com/cdn/downloads/v1.0.0/latest.json

echo ""
echo "3️⃣ 检查DNS状态:"
echo "CNAME记录:"
dig +short CNAME assets.elick.it.com

echo "A记录:"
dig +short A assets.elick.it.com

echo ""
echo "4️⃣ 测试下载速度:"
echo "测试GIF下载速度:"
curl -w "下载时间: %{time_total}s, 速度: %{speed_download} bytes/s\n" \
  -o /dev/null -s https://assets.elick.it.com/cdn/gifs/elick-demo-zh.gif

echo ""
echo "✅ 验证完成！"
echo ""
echo "📊 上传状态总结:"
echo "- 静态资源: 9个文件 (47MB)"
echo "- GitHub releases: 13个文件 (174MB)"
echo "- 总计: 22个文件 (221MB)"
echo ""
echo "如果看到200状态码，说明CDN配置成功！"
echo "如果仍然是404，请在Cloudflare Dashboard中启用R2公共访问。"
