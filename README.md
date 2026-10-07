# KET 单词找回

给备考剑桥 A2 Key（KET）的孩子用的单词复习网页：先筛出遗忘的词，再按记忆曲线复习，配合每日打卡和星星奖励。

- 在线使用：https://yanghailong.github.io/ket/ （iPad 上用 Safari 打开，再"分享 → 添加到主屏幕"）
- 离线使用：直接用浏览器打开 `index.html`
- 学习进度只保存在本机浏览器里，换设备前请在"家长"页导出备份。

## 开发

```bash
npm test          # 单元测试
npm run build     # 生成 index.html 和 dist/ket-vocab.html
node tools/run-smoke.mjs   # 用 headless Chrome 跑交互冒烟测试（需先 build）
```

单词数据在 `src/words/<话题>.js`，修改后重新 `npm run build` 并提交 `index.html`。
