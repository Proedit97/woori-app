#!/bin/sh
# 사용법: ./deploy.sh "바뀐 내용 한 줄"
# 화면 버전(BUILD), version.json, 서비스워커 캐시 이름을 함께 올리고 GitHub에 배포합니다.
set -e
cd "$(dirname "$0")"
N=$(sed -n 's/.*"build": "b\([0-9]*\)".*/\1/p' version.json); N=$((N+1))
NOTE=${1:-"새 기능과 수정 사항이 적용됐어요"}
sed -i "s/const BUILD = \"b[0-9]*\";/const BUILD = \"b$N\";/" index.html
sed -i "s/woori-v[0-9]*/woori-v$N/" sw.js
printf '{ "build": "b%s", "note": "%s" }\n' "$N" "$NOTE" > version.json
git add -A && git commit -qm "업데이트 b$N: $NOTE

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01MbYoe4J9J4ZmXHzMUfwTEv" && git push -q
echo "배포 완료: b$N (1~2분 뒤 앱에 반영)"
