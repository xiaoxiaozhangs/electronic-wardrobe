#!/bin/bash
# ============================================================
# 电子衣橱 CloudBase 部署脚本 (tcb v3)
# 环境: cloud1-d4g6cb3nyf821a7a0
# 日期: 2026-06-14
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR"
CLOUDBASE_DIR="$BACKEND_DIR/cloudfunctions"
ENV_ID="cloud1-d4g6cb3nyf821a7a0"
BASE_URL="https://${ENV_ID}.service.tcloudbase.com/api/v1"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ============================================================
# Step 0: 预检
# ============================================================
preflight() {
  log_info "=== 预检 ==="

  if ! command -v node &> /dev/null; then
    log_error "未安装 Node.js，请先安装 Node.js 18+"
    exit 1
  fi
  log_ok "Node.js $(node --version)"

  if ! command -v tcb &> /dev/null; then
    log_warn "CloudBase CLI (tcb) 未安装，正在安装..."
    npm install -g @cloudbase/cli
  fi
  log_ok "tcb CLI $(tcb --version 2>&1)"

  log_warn "请确保已登录 CloudBase: tcb login"
  log_warn "或使用 API Key 登录: tcb login --apiKeyId xxx --apiKey yyy"
}

# ============================================================
# Step 1: 安装依赖
# ============================================================
install_deps() {
  log_info "=== 安装云函数依赖 ==="
  for func_dir in "$CLOUDBASE_DIR"/*/; do
    if [ -f "${func_dir}package.json" ]; then
      local name=$(basename "$func_dir")
      log_info "安装 $name 依赖..."
      (cd "$func_dir" && npm install --production 2>&1 | tail -1)
      log_ok "$name 依赖安装完成"
    fi
  done
}

# ============================================================
# Step 2: 部署云函数（带 HTTP 触发器）
# ============================================================
deploy_functions() {
  log_info "=== 部署云函数到 ${ENV_ID} ==="
  cd "$BACKEND_DIR"

  # ===== Event 函数（无 HTTP 访问） =====
  log_info "部署 seed（Event 函数，手动调用）..."
  tcb fn deploy seed --force --dir "$CLOUDBASE_DIR/seed"

  # ===== HTTP 函数 =====
  log_info "部署 auth ..."
  tcb fn deploy auth --force --httpFn --path /api/v1/auth/login --dir "$CLOUDBASE_DIR/auth"
  log_ok "auth → ${BASE_URL}/auth/login"

  log_info "部署 upload ..."
  tcb fn deploy upload --force --httpFn --path /api/v1/wardrobe/upload --dir "$CLOUDBASE_DIR/upload"
  log_ok "upload → ${BASE_URL}/wardrobe/upload"

  log_info "部署 outfit ..."
  tcb fn deploy outfit --force --httpFn --path /api/v1/outfits --dir "$CLOUDBASE_DIR/outfit"
  log_ok "outfit → ${BASE_URL}/outfits/*"

  log_info "部署 stats ..."
  tcb fn deploy stats --force --httpFn --path /api/v1/stats --dir "$CLOUDBASE_DIR/stats"
  log_ok "stats → ${BASE_URL}/stats/*"

  log_info "部署 aiTag ..."
  tcb fn deploy aiTag --force --httpFn --path /api/v1/ai --dir "$CLOUDBASE_DIR/aiTag"
  log_ok "aiTag → ${BASE_URL}/ai/*"

  log_info "部署 wardrobe（主 API 处理器）..."
  tcb fn deploy wardrobe --force --httpFn --path /api/v1 --dir "$CLOUDBASE_DIR/wardrobe"
  log_ok "wardrobe → ${BASE_URL}/* (categories/tags/wardrobe)"
}

# ============================================================
# Step 3: 执行种子数据
# ============================================================
run_seed() {
  log_info "=== 初始化数据库种子数据 ==="
  log_info "调用 seed 云函数..."
  tcb fn invoke seed --envId "$ENV_ID" --params '{"mode":"insert"}' --output json 2>&1 | tail -10
  log_ok "种子数据导入完成"
}

# ============================================================
# Step 4: 配置环境变量
# ============================================================
setup_env() {
  log_info "=== 配置环境变量 ==="

  # WX_APP_SECRET 需要手动设置
  log_warn "=============================================="
  log_warn "环境变量已通过 cloudbaserc.json 配置默认值"
  log_warn "生产环境请手动修改以下环境变量："
  log_warn ""
  log_warn "  CloudBase 控制台 → 云函数 → auth → 函数配置 → 环境变量"
  log_warn "  - JWT_SECRET: 使用 openssl rand -hex 32 生成新密钥"
  log_warn "  - WX_APP_SECRET: 微信公众平台的 AppSecret"
  log_warn ""
  log_warn "  CloudBase 控制台 → 云函数 → wardrobe/outfit/stats/upload/aiTag"
  log_warn "  - JWT_SECRET: 与 auth 函数保持一致"
  log_warn "=============================================="
}

# ============================================================
# Step 5: 验证
# ============================================================
verify() {
  log_info "=== 验证部署 ==="
  echo ""
  echo "已部署云函数列表："
  tcb fn list --envId "$ENV_ID" 2>&1
  echo ""
  echo "============================================"
  echo "  API Base URL: ${BASE_URL}"
  echo "============================================"
  echo ""
  echo "接口验证命令（部署后执行）："
  echo ""
  echo "# 1. 品类字典（无需token）"
  echo "curl -s ${BASE_URL}/categories | python3 -m json.tool"
  echo ""
  echo "# 2. 标签字典"
  echo "curl -s '${BASE_URL}/tags?type=color,style' | python3 -m json.tool"
  echo ""
  echo "# 3. 微信登录（需先获取 wx.login code）"
  echo "curl -s -X POST ${BASE_URL}/auth/login \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -d '{\"code\":\"081xxxxxx\"}' | python3 -m json.tool"
  echo ""
  echo "# 4. 创建衣物（TOKEN=从上一步获取的jwt）"
  echo "curl -s -X POST ${BASE_URL}/wardrobe \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -H 'Authorization: Bearer \$TOKEN' \\"
  echo "  -d '{\"imageFileId\":\"cloud://test.jpg\",\"categoryId\":\"<从categories获取的_id>\",\"primaryColor\":\"黑色\"}'"
  echo ""
  echo "# 5. 获取衣橱列表"
  echo "curl -s '${BASE_URL}/wardrobe?page=1&pageSize=20' \\"
  echo "  -H 'Authorization: Bearer \$TOKEN' | python3 -m json.tool"
}

# ============================================================
# 主流程
# ============================================================
main() {
  echo ""
  echo "╔════════════════════════════════════════════╗"
  echo "║   电子衣橱 CloudBase 部署工具 v2.0        ║"
  echo "║   环境: ${ENV_ID}  ║"
  echo "╚════════════════════════════════════════════╝"
  echo ""

  case "${1:-all}" in
    preflight)   preflight ;;
    install)     install_deps ;;
    deploy)      preflight && install_deps && deploy_functions ;;
    seed)        run_seed ;;
    env)         setup_env ;;
    verify)      verify ;;
    all)
      preflight
      install_deps
      deploy_functions
      run_seed
      setup_env
      verify
      log_ok "🎉 部署完成！Base URL: ${BASE_URL}"
      log_warn "请手动在 CloudBase 控制台更新 WX_APP_SECRET 环境变量！"
      ;;
    *)
      echo "用法: $0 {preflight|install|deploy|seed|env|verify|all}"
      exit 1
      ;;
  esac
}

main "$@"
