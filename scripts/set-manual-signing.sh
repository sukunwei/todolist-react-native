#!/usr/bin/env bash
#
# 把 Release 設定改成手動簽名，指定 App Store 發行證書與分發描述文件。
#
# 為什麼要手動：Xcode 的自動簽名在這個帳號上一直落到 development 型別
# （會報 "conflicting provisioning settings"），必須明確指定。
# Debug 維持自動簽名，真機調試才不會受影響。
#
# 用法：
#   ./scripts/set-manual-signing.sh "TODOLIST App Store"
#
set -euo pipefail

PROFILE_NAME="${1:-}"
if [[ -z "$PROFILE_NAME" ]]; then
  echo "用法：$0 <描述檔名稱>" >&2
  echo "可先用 ./scripts/import-profile.sh <.mobileprovision> 查到名稱" >&2
  exit 1
fi

TEAM_ID="9NRVT8Q8MQ"
PBX="ios/TODOLIST.xcodeproj/project.pbxproj"

python3 - "$PROFILE_NAME" "$TEAM_ID" "$PBX" <<'PY'
import pathlib, sys

profile_name, team_id, pbx_path = sys.argv[1], sys.argv[2], sys.argv[3]
p = pathlib.Path(pbx_path)
s = p.read_text()

# 定位 Release 配置塊
i = s.index("13B07F951A680F5B00A75B9A /* Release */")
j = s.index("name = Release;", i)
block = s[i:j]

settings = (
    '\t\t\t\tCODE_SIGN_IDENTITY = "Apple Distribution";\n'
    '\t\t\t\tCODE_SIGN_STYLE = Manual;\n'
    '\t\t\t\tDEVELOPMENT_TEAM = %s;\n'
    '\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "%s";\n'
) % (team_id, profile_name)

# 移除既有的相關設定再插入
for line in (
    '\t\t\t\tCODE_SIGN_IDENTITY = "Apple Distribution";\n',
    '\t\t\t\tCODE_SIGN_STYLE = Automatic;\n',
    '\t\t\t\tDEVELOPMENT_TEAM = %s;\n' % team_id,
):
    block = block.replace(line, "")
block = block.replace("\t\t\t\tCLANG_ENABLE_MODULES = YES;\n",
                      "\t\t\t\tCLANG_ENABLE_MODULES = YES;\n" + settings, 1)

s = s[:i] + block + s[j:]
p.write_text(s)
print(f"Release 已改為手動簽名：")
print(f"  CODE_SIGN_IDENTITY            = Apple Distribution")
print(f"  PROVISIONING_PROFILE_SPECIFIER = {profile_name}")
print(f"  DEVELOPMENT_TEAM              = {team_id}")
PY

echo
echo "接著可以歸檔了："
echo "    ./scripts/release.sh"
