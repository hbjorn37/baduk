# baduk

![Baduk](docs/images/baduk-1.png)

**바둑(Go/Baduk)** 을 브라우저에서 연습하고 기보를 다루는 웹 앱입니다. 아버지가 온라인으로 편하게 바둑을 두실 수 있도록 2012년에 HTML5와 JavaScript만으로 만들었고, v2.0에서 TypeScript로 전면 개편했습니다.

**https://hbjorn.dev/baduk/**

## 기능

- 흑백 번갈아 두기, 따냄, 자충수 금지, 패(단순 ko) 규칙
- 돌 색 모드: 자동 / 흑 / 백 / 마우스(좌클릭 백, 우클릭 흑) — 혼자 연습하거나 사활 문제를 놓을 때 편합니다
- 수순 번호, 마지막 수 표시, 돌 보기/숨기기
- 무르기, 패스, 영역 계가(덤 포함)
- 9 / 13 / 19줄 판
- SGF 열기·저장, 기보 재생(처음 · 이전 · 다음 · 마지막)
- 대국이 브라우저에 자동 저장되어 새로고침해도 이어집니다
- PC와 모바일(터치) 지원, 판 크기는 화면 너비에 맞춰 자동 조절, 다크 모드

### 한계

- 계가는 사석을 판단하지 않습니다. 죽은 돌은 직접 들어낸 뒤 계가하세요.
- SGF의 변화도는 첫 번째 줄기만 읽습니다.
- 슈퍼코(superko)는 지원하지 않습니다.
- 온라인 대국, 채팅, AI는 아직 없습니다.

## 스크린샷

<img src="docs/images/baduk-2.png" alt="모바일 화면" width="320" />

## 개발

Node.js 20 이상이 필요합니다.

```sh
npm install
npm run dev      # 개발 서버
npm test         # 단위 테스트
npm run lint     # ESLint
npm run build    # dist/ 에 정적 파일 생성
npm run preview  # 빌드 결과 미리보기
```

### 구조

```
src/core/   DOM에 의존하지 않는 순수 TypeScript. 모든 규칙은 여기에 있고 테스트됩니다.
  board.ts    불변 보드, 덩어리·활로 계산
  rules.ts    착수 판정(따냄, 자충수, 패)
  game.ts     수순, 무르기, 기보 이동
  score.ts    영역 계가
  sgf.ts      SGF 파서/직렬화
  record.ts   SGF <-> Game 변환
src/ui/     SVG 바둑판 렌더링, 입력, localStorage
src/main.ts 화면과 코어 연결
```

런타임 의존성은 없습니다. 화면 계층만 바꾸면 되므로 나중에 React 같은 프레임워크로 옮기기도 쉽습니다.

### 배포

`main`에 푸시하면 GitHub Actions가 테스트 후 빌드해 GitHub Pages에 배포합니다. 빌드 결과는 상대 경로라서 어떤 정적 호스팅에 올려도 동작합니다.

## 버전 규칙

기본은 `메이저.마이너`(예: `2.0`, `2.1`)이고, 핫픽스일 때만 `2.0.1`처럼 세 자리를 씁니다. `package.json`은 npm 규격상 `2.0.0` 형식으로 적습니다. 변경 내역은 [CHANGES](CHANGES)를 보세요.

## 라이선스

[GPL-3.0-or-later](LICENSE). 제작자는 [AUTHORS](AUTHORS)를 보세요.
