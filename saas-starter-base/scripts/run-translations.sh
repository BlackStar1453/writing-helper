#!/bin/bash

# 功能翻译管理脚本
# 使用方法:
# ./scripts/run-translations.sh --help

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
    echo -e "${BLUE}功能翻译管理脚本${NC}"
    echo ""
    echo "使用方法:"
    echo "  $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --create-tables          创建翻译数据表"
    echo "  --translate-all <locales> 为所有功能生成翻译"
    echo "  --translate-feature <feature-id> <locales> 为指定功能生成翻译"
    echo "  --list-features          列出所有功能ID"
    echo "  --help                   显示此帮助信息"
    echo ""
    echo "语言代码示例:"
    echo "  zh    中文"
    echo "  ja    日本語"
    echo "  ko    한국어"
    echo "  fr    Français"
    echo "  de    Deutsch"
    echo "  es    Español"
    echo ""
    echo "示例:"
    echo "  $0 --create-tables"
    echo "  $0 --translate-all zh,ja,ko"
    echo "  $0 --translate-feature abc123 zh"
    echo "  $0 --list-features"
}

# 创建数据表
create_tables() {
    echo -e "${YELLOW}正在创建翻译数据表...${NC}"
    
    if [ ! -f "scripts/create-translation-tables.sql" ]; then
        echo -e "${RED}错误: 找不到 scripts/create-translation-tables.sql 文件${NC}"
        exit 1
    fi
    
    # 这里需要根据你的数据库配置来执行SQL
    # 示例使用 psql (PostgreSQL)
    if command -v psql &> /dev/null; then
        echo -e "${BLUE}使用 PostgreSQL 执行 SQL...${NC}"
        # psql -d your_database -f scripts/create-translation-tables.sql
        echo -e "${YELLOW}请手动执行以下命令:${NC}"
        echo "psql -d your_database -f scripts/create-translation-tables.sql"
    else
        echo -e "${YELLOW}请手动执行 scripts/create-translation-tables.sql 中的 SQL 语句${NC}"
    fi
    
    echo -e "${GREEN}数据表创建完成!${NC}"
}

# 翻译所有功能
translate_all() {
    local locales=$1
    
    if [ -z "$locales" ]; then
        echo -e "${RED}错误: 请指定语言代码${NC}"
        echo "示例: $0 --translate-all zh,ja,ko"
        exit 1
    fi
    
    echo -e "${YELLOW}正在为所有功能生成翻译 (语言: $locales)...${NC}"
    
    if command -v npx &> /dev/null; then
        npx tsx scripts/generate-feature-translations.ts --locale "$locales" --all
    else
        echo -e "${RED}错误: 找不到 npx 命令，请确保已安装 Node.js${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}翻译生成完成!${NC}"
}

# 翻译指定功能
translate_feature() {
    local feature_id=$1
    local locales=$2
    
    if [ -z "$feature_id" ] || [ -z "$locales" ]; then
        echo -e "${RED}错误: 请指定功能ID和语言代码${NC}"
        echo "示例: $0 --translate-feature abc123 zh,ja"
        exit 1
    fi
    
    echo -e "${YELLOW}正在为功能 $feature_id 生成翻译 (语言: $locales)...${NC}"
    
    if command -v npx &> /dev/null; then
        npx tsx scripts/generate-feature-translations.ts --feature-id "$feature_id" --locale "$locales"
    else
        echo -e "${RED}错误: 找不到 npx 命令，请确保已安装 Node.js${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}翻译生成完成!${NC}"
}

# 列出所有功能
list_features() {
    echo -e "${YELLOW}正在获取功能列表...${NC}"
    
    if command -v npx &> /dev/null; then
        # 这里可以创建一个简单的脚本来列出功能
        echo -e "${BLUE}请访问管理员界面查看功能列表，或者查看数据库中的 features 表${NC}"
        echo -e "${YELLOW}SQL查询示例:${NC}"
        echo "SELECT id, title, status FROM features ORDER BY priority DESC, created_at DESC;"
    else
        echo -e "${RED}错误: 找不到 npx 命令${NC}"
        exit 1
    fi
}

# 主逻辑
case "$1" in
    --create-tables)
        create_tables
        ;;
    --translate-all)
        translate_all "$2"
        ;;
    --translate-feature)
        translate_feature "$2" "$3"
        ;;
    --list-features)
        list_features
        ;;
    --help|"")
        show_help
        ;;
    *)
        echo -e "${RED}错误: 未知选项 '$1'${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
