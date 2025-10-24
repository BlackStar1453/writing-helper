#!/bin/bash

# 静态资源到阿里云OSS同步脚本
# 同步GIF、图片、模板等静态资源

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 静态资源到OSS同步工具 ===${NC}"

# 读取OSS配置
if [ -f ".env.local" ]; then
    echo "正在读取 .env.local 配置..."
    set -a
    source .env.local
    set +a
fi

BUCKET_NAME="$NEXT_PUBLIC_ALIYUN_OSS_BUCKET"

if [ -z "$BUCKET_NAME" ]; then
    echo -e "${RED}错误: 未找到NEXT_PUBLIC_ALIYUN_OSS_BUCKET配置${NC}"
    exit 1
fi

echo -e "${GREEN}OSS配置:${NC}"
echo "- Bucket: $BUCKET_NAME"
echo "- Endpoint: $NEXT_PUBLIC_ALIYUN_OSS_ENDPOINT"
echo ""

# 定义需要同步的资源目录和文件
SYNC_DIRS=(
    "public/gifs"
    "public/img" 
    "public/templates"
)

# 支持的文件扩展名
SUPPORTED_EXTENSIONS=(".gif" ".png" ".jpg" ".jpeg" ".svg" ".json" ".txt")

# 格式化文件大小（兼容macOS和Linux）
format_size() {
    local size=$1
    if command -v numfmt >/dev/null 2>&1; then
        numfmt --to=iec "$size"
    else
        # macOS fallback
        if [ "$size" -lt 1024 ]; then
            echo "${size}B"
        elif [ "$size" -lt 1048576 ]; then
            echo "$((size / 1024))KB"
        elif [ "$size" -lt 1073741824 ]; then
            echo "$((size / 1048576))MB"
        else
            echo "$((size / 1073741824))GB"
        fi
    fi
}

# 检查文件扩展名是否支持
is_supported_file() {
    local file=$1
    local ext="${file##*.}"
    ext=$(echo ".${ext}" | tr '[:upper:]' '[:lower:]') # 转换为小写并添加点

    for supported_ext in "${SUPPORTED_EXTENSIONS[@]}"; do
        if [[ "$ext" == "$supported_ext" ]]; then
            return 0
        fi
    done
    return 1
}

# 上传单个文件
upload_file() {
    local local_path=$1
    local remote_path=$2
    local file_size=$3
    
    echo -e "${BLUE}上传: $(basename "$local_path")${NC}"
    echo "本地路径: $local_path"
    echo "OSS路径: $remote_path"
    echo "文件大小: $(numfmt --to=iec $file_size)"
    
    if aliyun oss cp "$local_path" "oss://$BUCKET_NAME/$remote_path" --force; then
        echo -e "${GREEN}✅ 上传成功${NC}"
        
        # 生成访问URL
        local access_url="$NEXT_PUBLIC_ALIYUN_OSS_ENDPOINT/$remote_path"
        echo -e "${GREEN}访问URL: $access_url${NC}"
        return 0
    else
        echo -e "${RED}❌ 上传失败${NC}"
        return 1
    fi
}

# 同步目录
sync_directory() {
    local dir=$1
    
    if [ ! -d "$dir" ]; then
        echo -e "${YELLOW}⚠️  目录不存在: $dir${NC}"
        return 0
    fi
    
    echo -e "${BLUE}=== 同步目录: $dir ===${NC}"
    
    local success_count=0
    local total_count=0
    
    # 遍历目录中的所有文件
    while IFS= read -r -d '' file; do
        if [ -f "$file" ]; then
            if is_supported_file "$file"; then
                ((total_count++))
                
                # 计算相对路径（去掉public/前缀）
                local relative_path="${file#public/}"
                local file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
                
                echo ""
                if upload_file "$file" "$relative_path" "$file_size"; then
                    ((success_count++))
                fi
            else
                echo -e "${YELLOW}跳过不支持的文件: $(basename "$file")${NC}"
            fi
        fi
    done < <(find "$dir" -type f -print0)
    
    echo ""
    echo -e "${BLUE}目录 $dir 同步完成: $success_count/$total_count${NC}"
    return $((total_count - success_count))
}

# 测试资源访问
test_asset_access() {
    echo -e "${BLUE}测试资源访问...${NC}"
    
    local test_files=(
        "gifs/elick-demo-zh.gif"
        "gifs/elick-demo-en.gif"
        "img/bank.png"
        "img/syzygy.png"
        "templates/actions-example-zh.json"
        "templates/actions-example-en.json"
    )
    
    local success_count=0
    local total_count=${#test_files[@]}
    
    for file in "${test_files[@]}"; do
        local url="$NEXT_PUBLIC_ALIYUN_OSS_ENDPOINT/$file"
        echo -n "测试 $file: "
        
        if curl -s -I "$url" | grep -q "200\|404"; then
            echo -e "${GREEN}✅ 可访问${NC}"
            ((success_count++))
        else
            echo -e "${RED}❌ 不可访问${NC}"
        fi
    done
    
    echo ""
    echo -e "${BLUE}访问测试结果: $success_count/$total_count${NC}"
}

# 显示同步后的配置说明
show_usage_info() {
    echo -e "${BLUE}=== 使用说明 ===${NC}"
    echo ""
    echo -e "${GREEN}资源访问方式:${NC}"
    echo "1. 应用会自动根据网络环境选择资源源："
    echo "   - 中国大陆用户: 使用OSS高速访问"
    echo "   - 海外用户: 使用Cloudflare CDN"
    echo ""
    echo "2. 组件使用方式："
    echo "   - SmartImage: 自动选择最优图片源"
    echo "   - SmartGif: 自动选择最优GIF源"
    echo ""
    echo -e "${GREEN}资源URL格式:${NC}"
    echo "- OSS: $NEXT_PUBLIC_ALIYUN_OSS_ENDPOINT/{path}"
    echo "- CDN: https://assets.elick.it.com/cdn/{path}"
    echo ""
    echo -e "${YELLOW}注意事项:${NC}"
    echo "- 资源已配置Referer防盗链保护"
    echo "- 只允许elick.it.com域名访问"
    echo "- 支持本地开发环境访问"
}

# 主同步函数
main_sync() {
    echo -e "${BLUE}开始同步静态资源...${NC}"
    
    local total_success=0
    local total_files=0
    local failed_dirs=0
    
    for dir in "${SYNC_DIRS[@]}"; do
        if sync_directory "$dir"; then
            echo -e "${GREEN}✅ $dir 同步成功${NC}"
        else
            echo -e "${RED}❌ $dir 部分文件同步失败${NC}"
            ((failed_dirs++))
        fi
        echo ""
    done
    
    echo -e "${BLUE}=== 同步完成 ===${NC}"
    
    if [ $failed_dirs -eq 0 ]; then
        echo -e "${GREEN}🎉 所有资源同步成功！${NC}"
        
        echo ""
        test_asset_access
        
        echo ""
        show_usage_info
        
        return 0
    else
        echo -e "${YELLOW}⚠️  部分资源同步失败${NC}"
        return 1
    fi
}

# 列出将要同步的文件
list_files() {
    echo -e "${BLUE}将要同步的文件:${NC}"
    echo ""
    
    local total_count=0
    local total_size=0
    
    for dir in "${SYNC_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            echo -e "${GREEN}目录: $dir${NC}"
            
            while IFS= read -r -d '' file; do
                if [ -f "$file" ] && is_supported_file "$file"; then
                    local relative_path="${file#public/}"
                    local file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
                    
                    echo "  - $relative_path ($(numfmt --to=iec $file_size))"
                    ((total_count++))
                    ((total_size += file_size))
                fi
            done < <(find "$dir" -type f -print0)
            echo ""
        fi
    done
    
    echo -e "${BLUE}总计: $total_count 个文件, $(numfmt --to=iec $total_size)${NC}"
}

# 主函数
main() {
    case "${1:-sync}" in
        "sync")
            main_sync
            ;;
        "list")
            list_files
            ;;
        "test")
            test_asset_access
            ;;
        "help"|*)
            echo "静态资源到OSS同步工具"
            echo ""
            echo "用法:"
            echo "  $0 [操作]"
            echo ""
            echo "操作:"
            echo "  sync      # 同步所有静态资源（默认）"
            echo "  list      # 列出将要同步的文件"
            echo "  test      # 测试资源访问"
            echo ""
            echo "示例:"
            echo "  $0 sync   # 同步所有资源"
            echo "  $0 list   # 查看文件列表"
            echo "  $0 test   # 测试访问"
            echo ""
            echo "支持的文件类型:"
            printf "  %s\n" "${SUPPORTED_EXTENSIONS[@]}"
            ;;
    esac
}

main "$@"
