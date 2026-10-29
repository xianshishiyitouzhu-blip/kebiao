# 课表

离线可用的课表网页应用（PWA），可以装到 iPhone 主屏幕上当 App 用。课程数据只存在手机本地。

- 导入方式：Excel / CSV / 教务系统导出的网页表格、课表截图（本地 OCR 识别）、粘贴文字
- 断网可打开、可识别截图
- 支持备份 / 恢复、复制为文字分享

## 部署

仓库根目录就是网站根目录（`index.html` 在根目录），可以直接用 GitHub Pages 发布：
Settings → Pages → Source 选 **Deploy from a branch**，选择分支和 `/ (root)`，保存。

详细的安装和使用步骤见 [安装说明.md](安装说明.md)。

## 本地试用

```bash
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 第三方组件

- [Tesseract.js](https://github.com/naptha/tesseract.js)（截图识别）：`vendor/tesseract/`，许可证见 `vendor/tesseract/LICENSE-tesseractjs.txt`
- [SheetJS](https://sheetjs.com)（表格解析）：`vendor/xlsx.full.min.js`，许可证见 `vendor/LICENSE-sheetjs.txt`
