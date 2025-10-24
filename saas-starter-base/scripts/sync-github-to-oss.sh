#!/bin/bash

# GitHub Release 到阿里云OSS同步脚本
# 自动下载GitHub Release文件并上传到OSS

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
GITHUB_REPO="BlackStar1453/Elick-public"
VERSION="${1:-v1.0.3}"
TEMP_DIR="/tmp/github-oss-sync-$$"

echo -e "${BLUE}=== GitHub Release 到 OSS 同步工具 ===${NC}"
echo "仓库: $GITHUB_REPO"
echo "版本: $VERSION"
echo ""

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

# 创建临时目录
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

# 获取GitHub Release信息
get_release_assets() {
    echo -e "${BLUE}获取GitHub Release信息...${NC}"
    
    local api_url="https://api.github.com/repos/$GITHUB_REPO/releases/tags/$VERSION"
    
    if ! curl -s "$api_url" > release.json; then
        echo -e "${RED}错误: 无法获取Release信息${NC}"
        exit 1
    fi
    
    if ! jq -e '.assets' release.json > /dev/null; then
        echo -e "${RED}错误: Release不存在或无文件${NC}"
        exit 1
    fi
    
    local asset_count=$(jq '.assets | length' release.json)
    echo -e "${GREEN}找到 $asset_count 个文件${NC}"
}

# 下载文件
download_file() {
    local url=$1
    local filename=$2
    local size=$3
    
    echo -e "${BLUE}下载: $filename${NC}"
    echo "大小: $(numfmt --to=iec $size)"
    echo "URL: $url"
    
    if curl -L -o "$filename" "$url" --progress-bar; then
        echo -e "${GREEN}✅ 下载成功: $filename${NC}"
        return 0
    else
        echo -e "${RED}❌ 下载失败: $filename${NC}"
        return 1
    fi
}

# 上传到OSS
upload_to_oss() {
    local filename=$1
    local oss_path="downloads/$VERSION/$filename"
    
    echo -e "${BLUE}上传到OSS: $oss_path${NC}"
    
    if aliyun oss cp "$filename" "oss://$BUCKET_NAME/$oss_path" --force; then
        echo -e "${GREEN}✅ 上传成功: $oss_path${NC}"
        
        # 生成访问URL
        local access_url="$NEXT_PUBLIC_ALIYUN_OSS_ENDPOINT/$oss_path"
        echo -e "${GREEN}访问URL: $access_url${NC}"
        return 0
    else
        echo -e "${RED}❌ 上传失败: $oss_path${NC}"
        return 1
    fi
}

# 同步单个文件
sync_file() {
    local name=$1
    local url=$2
    local size=$3
    
    echo ""
    echo -e "${YELLOW}=== 同步文件: $name ===${NC}"
    
    if download_file "$url" "$name" "$size"; then
        if upload_to_oss "$name"; then
            rm -f "$name"  # 清理本地文件
            return 0
        fi
    fi
    
    return 1
}

# 主同步函数
sync_all_files() {
    echo -e "${BLUE}开始同步所有文件...${NC}"
    
    local success_count=0
    local total_count=0
    
    # 读取所有assets并同步
    while IFS= read -r asset; do
        local name=$(echo "$asset" | jq -r '.name')
        local url=$(echo "$asset" | jq -r '.browser_download_url')
        local size=$(echo "$asset" | jq -r '.size')
        
        ((total_count++))
        
        if sync_file "$name" "$url" "$size"; then
            ((success_count++))
        fi
        
    done < <(jq -c '.assets[]' release.json)
    
    echo ""
    echo -e "${BLUE}=== 同步完成 ===${NC}"
    echo "成功: $success_count/$total_count"
    
    if [ $success_count -eq $total_count ]; then
        echo -e "${GREEN}🎉 所有文件同步成功！${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  部分文件同步失败${NC}"
        return 1
    fi
}

# 选择性同步（只同步主要的安装文件）
sync_main_files() {
    echo -e "${BLUE}同步主要安装文件...${NC}"
    
    local main_files=(
        "Elick_.*_x64-setup\.exe$"
        "Elick_.*_x64_x86_64\.dmg$"
        "Elick_.*_aarch64\.dmg$"
        "Elick_.*_universal_universal\.dmg$"
        "latest\.json$"
    )
    
    local success_count=0
    local total_count=0
    
    for pattern in "${main_files[@]}"; do
        while IFS= read -r asset; do
            local name=$(echo "$asset" | jq -r '.name')
            local url=$(echo "$asset" | jq -r '.browser_download_url')
            local size=$(echo "$asset" | jq -r '.size')
            
            if [[ $name =~ $pattern ]]; then
                ((total_count++))
                
                if sync_file "$name" "$url" "$size"; then
                    ((success_count++))
                fi
            fi
            
        done < <(jq -c '.assets[]' release.json)
    done
    
    echo ""
    echo -e "${BLUE}=== 主要文件同步完成 ===${NC}"
    echo "成功: $success_count/$total_count"
    
    if [ $success_count -eq $total_count ]; then
        echo -e "${GREEN}🎉 主要文件同步成功！${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  部分文件同步失败${NC}"
        return 1
    fi
}

# 清理函数
cleanup() {
    echo -e "${BLUE}清理临时文件...${NC}"
    cd /
    rm -rf "$TEMP_DIR"
}

# 设置清理陷阱
trap cleanup EXIT

# 主函数
main() {
    case "${2:-main}" in
        "all")
            get_release_assets
            sync_all_files
            ;;
        "main")
            get_release_assets
            sync_main_files
            ;;
        "list")
            get_release_assets
            echo -e "${BLUE}Release文件列表:${NC}"
            jq -r '.assets[] | "\(.name) (\(.size | tonumber | . / 1024 / 1024 | floor)MB)"' release.json
            ;;
        "help"|*)
            echo "GitHub Release 到 OSS 同步工具"
            echo ""
            echo "用法:"
            echo "  $0 <版本> [模式]"
            echo ""
            echo "版本:"
            echo "  v1.0.3    # 指定版本号"
            echo ""
            echo "模式:"
            echo "  main      # 同步主要安装文件（默认）"
            echo "  all       # 同步所有文件"
            echo "  list      # 列出所有文件"
            echo ""
            echo "示例:"
            echo "  $0 v1.0.3 main    # 同步v1.0.3的主要文件"
            echo "  $0 v1.0.3 all     # 同步v1.0.3的所有文件"
            echo "  $0 v1.0.3 list    # 列出v1.0.3的所有文件"
            ;;
    esac
}

main "$@"
