# Contributing / 贡献指南

Thanks for your interest in Abyss Echo! 感谢你对《深渊回响》的关注！

## Ways to contribute / 参与方式

- **Report bugs** — open an issue with steps to reproduce / 提 issue 并附复现步骤
- **Suggest features** — describe the idea and why it fits the game / 描述想法与契合点
- **Translate** — improve zh/en strings in `js/lang.js` and `js/data.js` / 完善双语文本
- **Balance** — numbers live in `js/data.js`; tweak with care and record reasoning / 数值平衡调整
- **Code** — see development notes below

## Development notes / 开发说明

```bash
npm test              # run the test suite (node --test)
```

- Logic lives in `js/logic.js` and **must stay pure** (no DOM, no globals except `ABYSS`)
- All content data lives declaratively in `js/data.js` — prefer data over code
- Every PR should keep tests green; add tests for new mechanics
- Keep the game **zero-dependency**: no npm packages, no CDN scripts, no build step
- Keep it playable by double-clicking `index.html` (no fetch/XHR to external hosts)

## Pull request checklist / PR 检查清单

1. `npm test` passes
2. No new dependencies
3. Chinese & English strings both updated where applicable
4. Screenshots in `docs/` updated only when UI visibly changes

## License

By contributing you agree your contributions are licensed under the [MIT License](LICENSE).