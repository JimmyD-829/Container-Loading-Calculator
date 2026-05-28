# 物流集装箱装柜测算系统

![Container Loading Calculator](https://img.shields.io/badge/version-2.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Build](https://img.shields.io/badge/build-passing-green)

智能 3D 装载规划与可视化系统，提供高效的集装箱装柜方案计算。

## ✨ 功能特性

### 核心功能
- 📦 **货物管理** - 支持货物基本信息录入、批量导入、属性配置、分组管理和模板库
- 🚢 **集装箱管理** - 标准柜型库（20GP、40GP、40HQ、45HQ等）和自定义集装箱支持
- 🤖 **装柜计算引擎** - 多种算法支持（FFD、BFD、GA遗传算法、SA模拟退火）
- 🎯 **多目标优化** - 空间利用率、重心平衡、堆码约束、方向约束、卸货顺序约束
- 📊 **多柜联合优化** - 自动计算最优柜数和箱型组合

### 可视化功能
- 🔹 **3D装箱预览** - WebGL渲染，支持旋转、缩放、平移
- 🔹 **分层查看** - 逐层浏览、装柜动画
- 🔹 **重心可视化** - 重心位置、安全区域显示
- 🔹 **碰撞检测** - 重叠检测、边界检测

### 方案管理
- 📁 **方案版本管理** - 自动保存、状态管理（草稿/已计算/已批准/已部署/已归档）
- 🆚 **方案对比分析** - 多指标对比、雷达图展示
- 🔍 **历史数据查询** - 多条件筛选、分页浏览
- 🔄 **方案复用** - 相似方案匹配、微调重算

### 报表导出
- 📄 PDF导出（含3D截图+装卸顺序指导书）
- 📊 Excel/CSV导出
- 📝 JSON/TXT导出

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 8
- **UI组件**: Ant Design
- **3D渲染**: Three.js + @react-three/fiber
- **状态管理**: Zustand
- **算法**: FFD、BFD、GA、SA
- **部署**: Cloudflare Pages

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 📁 项目结构

## 📖 使用说明

1. **添加货物** - 在"货物管理"页面添加或导入货物信息
2. **选择集装箱** - 在"集装箱选择"页面选择标准柜型或自定义集装箱
3. **配置计算** - 在"计算配置"页面选择算法和参数
4. **开始计算** - 点击"开始计算"按钮生成装柜方案
5. **查看结果** - 在"查看结果"页面查看3D可视化和统计数据
6. **导出报告** - 支持PDF、Excel、CSV、JSON等多种格式导出

## 📊 功能完成度

| 模块 | 完成度 |
|------|--------|
| 货物管理 | 100% |
| 集装箱管理 | 100% |
| 装柜计算引擎 | 100% |
| 3D可视化 | 100% |
| 历史方案对比 | 100% |
| 报表与导出 | 83% |
| 系统管理 | 33% |

## 📜 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**项目地址**: [https://github.com/JimmyD-829/Container-Loading-Calculator](https://github.com/JimmyD-829/Container-Loading-Calculator)

**在线演示**: [https://containercalculator-9ue.pages.dev](https://containercalculator-9ue.pages.dev)
