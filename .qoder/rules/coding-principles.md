# 编码原则

## 先思考再编码

- 明确陈述关键假设
- 如果需求模糊，先询问或呈现选项再实施
- 存在更简单方案时主动指出

## 简洁优先

- 只实现被要求的内容
- 避免任务不需要的投机性抽象、可配置性或未来扩展
- 优先选择解决当前问题的最小变更

## 精准改动

- 只触碰与请求直接相关的代码行
- 不重构或重新格式化无关代码
- 只删除当前改动引入的死代码，不清理预先存在的无关代码（除非被要求）

## 目标驱动执行

- 实施前定义清晰的成功标准
- 多步骤任务保持简短计划并验证每一步
- Bug 修复优先在测试中复现问题，再改动实现

## 避免 loading 状态引入 regression

为按钮添加 loading 文字状态时，遵循以下模式：

**正确模式：**
```js
try {
    await someAsyncOperation();
    onChange();  // 重渲染 UI，由重渲染处理成功状态
} catch (error) {
    button.textContent = originalText;  // ✓ 仅失败时恢复
    showToast(error.message);
} finally {
    button.disabled = false;  // ✓ 只处理清理
}
```

**错误模式（避免）：**
```js
finally {
    button.textContent = originalText;  // ✗ 多余且有害
    button.disabled = false;
}
```

**核心原则：**
- `finally` 块只负责清理（如解除 disabled），不恢复业务状态
- 成功时的 UI 更新应由重渲染/状态管理处理
- 文字恢复仅在 `catch` 块执行（失败场景）
- `finally` 在 `onChange()` 之后运行，操作的是旧按钮引用，可能导致状态不一致
