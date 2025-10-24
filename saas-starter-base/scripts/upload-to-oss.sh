#!/bin/bash

# 阿里云OSS文件上传脚本
# 用于将GitHub Release文件上传到阿里云OSS

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置检查
check_config() {
    # 使用正确的环境变量名
    ALIYUN_OSS_ENDPOINT="$NEXT_PUBLIC_ALIYUN_OSS_ENDPOINT"
    ALIYUN_OSS_BUCKET="$NEXT_PUBLIC_ALIYUN_OSS_BUCKET"
    ALIYUN_OSS_REGION="$NEXT_PUBLIC_ALIYUN_OSS_REGION"

    if [ -z "$ALIYUN_OSS_ENDPOINT" ] || [ -z "$ALIYUN_OSS_BUCKET" ]; then
        echo -e "${RED}错误: 请先配置环境变量${NC}"
        echo "需要配置:"
        echo "- NEXT_PUBLIC_ALIYUN_OSS_ENDPOINT"
        echo "- NEXT_PUBLIC_ALIYUN_OSS_BUCKET"
        echo "- ALIYUN_OSS_ACCESS_KEY_ID"
        echo "- ALIYUN_OSS_ACCESS_KEY_SECRET"
        echo ""
        echo "当前配置:"
        echo "- ALIYUN_OSS_ENDPOINT: $ALIYUN_OSS_ENDPOINT"
        echo "- ALIYUN_OSS_BUCKET: $ALIYUN_OSS_BUCKET"
        echo "- ACCESS_KEY_ID: ${ALIYUN_OSS_ACCESS_KEY_ID:+已设置}"
        echo "- ACCESS_KEY_SECRET: ${ALIYUN_OSS_ACCESS_KEY_SECRET:+已设置}"
        exit 1
    fi

    echo "✅ 配置检查通过"
    echo "- OSS Endpoint: $ALIYUN_OSS_ENDPOINT"
    echo "- OSS Bucket: $ALIYUN_OSS_BUCKET"
    echo "- OSS Region: ${ALIYUN_OSS_REGION:-cn-hangzhou}"
}

# 检查阿里云CLI
check_aliyun_cli() {
    if ! command -v aliyun &> /dev/null; then
        echo -e "${YELLOW}阿里云CLI未安装，正在安装...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install aliyun-cli
        else
            echo -e "${RED}请手动安装阿里云CLI: https://help.aliyun.com/document_detail/121541.html${NC}"
            exit 1
        fi
    fi
}

# 配置阿里云CLI
configure_aliyun_cli() {
    echo -e "${BLUE}配置阿里云CLI...${NC}"
    # 从OSS region转换为阿里云CLI region格式
    local cli_region=${ALIYUN_OSS_REGION#oss-}
    aliyun configure set \
        --profile default \
        --mode AK \
        --region ${cli_region:-cn-hangzhou} \
        --access-key-id $ALIYUN_OSS_ACCESS_KEY_ID \
        --access-key-secret $ALIYUN_OSS_ACCESS_KEY_SECRET
}

# 上传文件到OSS
upload_file() {
    local local_file=$1
    local oss_path=$2
    local filename=$(basename "$local_file")
    
    echo -e "${BLUE}上传文件: $filename${NC}"
    echo "本地路径: $local_file"
    echo "OSS路径: oss://$ALIYUN_OSS_BUCKET/$oss_path"
    
    if [ ! -f "$local_file" ]; then
        echo -e "${RED}错误: 文件不存在 $local_file${NC}"
        return 1
    fi
    
    # 上传文件
    if aliyun oss cp "$local_file" "oss://$ALIYUN_OSS_BUCKET/$oss_path" --force; then
        echo -e "${GREEN}✅ 上传成功: $filename${NC}"
        
        # 生成访问URL
        local access_url="$ALIYUN_OSS_ENDPOINT/$oss_path"
        echo -e "${GREEN}访问URL: $access_url${NC}"
        return 0
    else
        echo -e "${RED}❌ 上传失败: $filename${NC}"
        return 1
    fi
}

# 批量上传版本文件
upload_version() {
    local version=$1
    local local_dir=$2
    
    if [ -z "$version" ] || [ -z "$local_dir" ]; then
        echo "用法: upload_version <版本号> <本地目录>"
        echo "示例: upload_version v1.0.3 ./downloads/"
        return 1
    fi
    
    if [ ! -d "$local_dir" ]; then
        echo -e "${RED}错误: 目录不存在 $local_dir${NC}"
        return 1
    fi
    
    echo -e "${BLUE}=== 上传版本 $version 的文件 ===${NC}"
    
    # 定义文件映射
    local files=(
        "Elick_${version#v}_x64-setup.exe:downloads/$version/Elick_${version#v}_x64-setup.exe"
        "Elick_${version#v}_x64.dmg:downloads/$version/Elick_${version#v}_x64_x86_64.dmg"
        "Elick_${version#v}_aarch64.dmg:downloads/$version/Elick_${version#v}_aarch64.dmg"
        "Elick_${version#v}_universal_universal.dmg:downloads/$version/Elick_${version#v}_universal_universal.dmg"
    )
    
    local success_count=0
    local total_count=${#files[@]}
    
    for file_mapping in "${files[@]}"; do
        IFS=':' read -r filename oss_path <<< "$file_mapping"
        local local_file="$local_dir/$filename"
        
        if upload_file "$local_file" "$oss_path"; then
            ((success_count++))
        fi
        echo ""
    done
    
    echo -e "${BLUE}=== 上传完成 ===${NC}"
    echo "成功: $success_count/$total_count"
    
    if [ $success_count -eq $total_count ]; then
        echo -e "${GREEN}🎉 所有文件上传成功！${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  部分文件上传失败${NC}"
        return 1
    fi
}

# 创建latest.json文件
create_latest_json() {
    local version=$1
    local temp_file="/tmp/latest.json"
    
    cat > "$temp_file" << EOF
{
  "version": "$version",
  "pub_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "platforms": {
    "windows": true,
    "macIntel": true,
    "macAppleSilicon": true,
    "macUniversal": true
  },
  "source_info": {
    "source": "aliyun_oss",
    "endpoint": "$ALIYUN_OSS_ENDPOINT",
    "bucket": "$ALIYUN_OSS_BUCKET"
  }
}
EOF
    
    echo -e "${BLUE}创建 latest.json 文件...${NC}"
    if upload_file "$temp_file" "downloads/latest.json"; then
        rm -f "$temp_file"
        return 0
    else
        rm -f "$temp_file"
        return 1
    fi
}

# 主函数
main() {
    echo -e "${BLUE}=== 阿里云OSS文件上传工具 ===${NC}"

    # 从环境变量或.env.local读取配置
    if [ -f ".env.local" ]; then
        echo "正在读取 .env.local 配置..."
        # 更安全的方式读取环境变量
        set -a
        source .env.local
        set +a
    fi

    check_config
    check_aliyun_cli
    configure_aliyun_cli
    
    case "${1:-help}" in
        "upload")
            if [ $# -lt 3 ]; then
                echo "用法: $0 upload <版本号> <本地目录>"
                echo "示例: $0 upload v1.0.3 ./downloads/"
                exit 1
            fi
            upload_version "$2" "$3"
            create_latest_json "$2"
            ;;
        "file")
            if [ $# -lt 3 ]; then
                echo "用法: $0 file <本地文件> <OSS路径>"
                echo "示例: $0 file ./app.exe downloads/v1.0.3/app.exe"
                exit 1
            fi
            upload_file "$2" "$3"
            ;;
        "latest")
            if [ $# -lt 2 ]; then
                echo "用法: $0 latest <版本号>"
                echo "示例: $0 latest v1.0.3"
                exit 1
            fi
            create_latest_json "$2"
            ;;
        "help"|*)
            echo "阿里云OSS上传工具"
            echo ""
            echo "用法:"
            echo "  $0 upload <版本号> <本地目录>  # 批量上传版本文件"
            echo "  $0 file <本地文件> <OSS路径>   # 上传单个文件"
            echo "  $0 latest <版本号>            # 创建latest.json"
            echo ""
            echo "环境变量:"
            echo "  ALIYUN_OSS_ENDPOINT         # OSS访问地址"
            echo "  ALIYUN_OSS_BUCKET           # Bucket名称"
            echo "  ALIYUN_OSS_ACCESS_KEY_ID    # AccessKey ID"
            echo "  ALIYUN_OSS_ACCESS_KEY_SECRET # AccessKey Secret"
            echo "  ALIYUN_OSS_REGION           # 地域（可选，默认cn-hangzhou）"
            ;;
    esac
}

main "$@"
