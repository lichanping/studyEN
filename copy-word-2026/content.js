// ========== 基础配置 ==========
const ALLOWED_DOMAINS = [
  'h5.lxll.com',
  'lx5-app.yingyutifen.cn',
  'lx3-app.yingyutifen.cn',
  'localhost',
  '127.0.0.1'
];

// 定义两种样式的选择器
const STYLES = {
  STYLE_1: {
    // 第一种样式（原始样式）
    wordItem: '.word-item',
    englishSelectors: ['.left .word span', '.left .uni-text.word span'],
    chineseSelectors: ['.right .zh span', '.right .uni-text.zh span']
  },
  STYLE_2: {
    // 第二种样式（新样式）
    wordItem: '.word-item',
    englishSelectors: ['.word-left .word-en span', '.word-left .uni-text.word-en span'],
    chineseSelectors: ['.word-right .word-zh span', '.word-right .uni-text.word-zh span']
  }
};

// ========== 工具函数 ==========
/**
 * 复制文本到剪贴板
 */
async function copyToClipboard(text) {
  if (!text || text.trim() === '') {
    console.log('[单词复制] 无有效内容可复制');
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    console.log('[单词复制] 复制成功:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    return true;
  } catch (err) {
    // 降级方案
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.top = '0';
      textarea.style.left = '0';
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, 99999);
      const result = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (result) {
        console.log('[单词复制] 降级复制成功:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
        return true;
      } else {
        console.error('[单词复制] 降级复制失败');
        return false;
      }
    } catch (err2) {
      console.error('[单词复制] 复制失败:', err2);
      return false;
    }
  }
}

/**
 * 从元素中提取文本（支持多种选择器）
 */
function extractTextWithSelectors(element, selectors) {
  if (!element) return '';

  for (const selector of selectors) {
    try {
      const el = element.querySelector(selector);
      if (el) {
        const text = el.textContent?.trim() || '';
        if (text) {
          return text;
        }
      }
    } catch (e) {
      console.warn(`[提取] 选择器 ${selector} 查询失败:`, e);
    }
  }
  return '';
}

/**
 * 检查元素是否可见
 */
function isElementVisible(element) {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  if (element.offsetWidth === 0 && element.offsetHeight === 0) {
    return false;
  }

  return true;
}

/**
 * 提取单词数据（兼容两种样式）
 */
function extractWordData(wordItem) {
  if (!wordItem) {
    console.log('[提取] 未提供单词项元素');
    return { english: '', chinese: '', style: null };
  }

  let english = '';
  let chinese = '';
  let detectedStyle = null;

  // 尝试第一种样式
  english = extractTextWithSelectors(wordItem, STYLES.STYLE_1.englishSelectors);
  if (english) {
    detectedStyle = STYLES.STYLE_1;
    chinese = extractTextWithSelectors(wordItem, STYLES.STYLE_1.chineseSelectors);
  } else {
    // 尝试第二种样式
    english = extractTextWithSelectors(wordItem, STYLES.STYLE_2.englishSelectors);
    if (english) {
      detectedStyle = STYLES.STYLE_2;
      chinese = extractTextWithSelectors(wordItem, STYLES.STYLE_2.chineseSelectors);
    }
  }

  // 如果仍然没有找到英文，尝试备用方法
  if (!english) {
    // 查找所有可能的英文元素
    const possibleEnglishElements = wordItem.querySelectorAll('[class*="word"][class*="en"], [class*="en"], [class*="word"]');
    for (const el of possibleEnglishElements) {
      const text = el.textContent?.trim() || '';
      if (text && /^[a-zA-Z]+$/.test(text)) {
        english = text;
        break;
      }
    }
  }

  // 如果仍然没有找到中文，尝试备用方法
  if (!chinese) {
    // 查找所有可能的中文元素
    const possibleChineseElements = wordItem.querySelectorAll('[class*="zh"], [class*="cn"], [class*="chinese"]');
    for (const el of possibleChineseElements) {
      if (isElementVisible(el)) {
        const text = el.textContent?.trim() || '';
        if (text && /[\u4e00-\u9fa5]/.test(text)) {
          chinese = text;
          break;
        }
      }
    }
  }

  // 验证中文是否包含中文字符
  if (chinese && !/[\u4e00-\u9fa5]/.test(chinese)) {
    chinese = '';
  }

  console.log(`[提取] 英文: "${english}", 中文: "${chinese}", 样式: ${detectedStyle ? detectedStyle === STYLES.STYLE_1 ? '样式1' : '样式2' : '未知'}`);
  return { english, chinese, style: detectedStyle };
}

/**
 * 查找最近的单词项元素
 */
function findClosestWordItem(element) {
  if (!element) return null;

  // 首先尝试两种样式的选择器
  for (const style of [STYLES.STYLE_1, STYLES.STYLE_2]) {
    const wordItem = element.closest(style.wordItem);
    if (wordItem) {
      return wordItem;
    }
  }

  // 如果找不到，向上遍历父元素查找可能的单词项
  let current = element;
  while (current && current !== document.body) {
    if (current.classList) {
      const classList = Array.from(current.classList);
      const isWordItem = classList.some(cls =>
        cls.includes('word-item') ||
        cls.includes('word') ||
        (cls.includes('item') && (classList.some(c => c.includes('word')) || classList.some(c => c.includes('en'))))
      );
      if (isWordItem) {
        return current;
      }
    }
    current = current.parentElement;
  }

  return null;
}

// ========== 核心功能：单词右键复制 ==========
async function handleWordRightClick(event) {
  // 1. 域名校验
  const hostname = window.location.hostname;
  const isAllowed = ALLOWED_DOMAINS.some(domain =>
    hostname === domain || hostname.endsWith('.' + domain)
  );

  if (!isAllowed) {
    console.log('[域名] 不在允许列表中:', hostname);
    return;
  }

  // 2. 查找单词项
  const wordItem = findClosestWordItem(event.target);
  if (!wordItem) {
    console.log('[错误] 未找到单词项');
    console.log('[调试] 点击目标:', event.target);
    console.log('[调试] 目标类名:', event.target.className);
    console.log('[调试] 目标标签:', event.target.tagName);
    return;
  }

  // 3. 提取单词数据
  const { english, chinese, style } = extractWordData(wordItem);

  // 4. 验证并复制
  if (!english) {
    console.log('[错误] 未提取到英文单词');
    console.log('[调试] 单词项HTML:', wordItem.outerHTML.substring(0, 500));

    // 显示所有可能的文本内容用于调试
    const allSpans = wordItem.querySelectorAll('span');
    const spanTexts = Array.from(allSpans).map(span => ({
      text: span.textContent?.trim(),
      class: span.className,
      visible: isElementVisible(span)
    }));
    console.log('[调试] 所有span元素:', spanTexts);

    return;
  }

  // 5. 拼接内容（只包含英文和中文，不包含序号），末尾加换行符
  const copyText = chinese ? `${english} ${chinese}\n` : `${english}\n`;
  console.log(`[复制] 样式: ${style === STYLES.STYLE_1 ? '样式1' : '样式2'}, 内容: "${copyText}"`);

  // 6. 先阻止默认右键菜单，再执行复制
  event.preventDefault();
  event.stopPropagation();

  const success = await copyToClipboard(copyText);

  // 仅在复制失败时高亮提醒（颜色与原实现一致）
  if (!success) {
    const originalBg = wordItem.style.backgroundColor;
    wordItem.style.backgroundColor = '#e6f7ff';
    wordItem.style.transition = 'background-color 0.3s ease';

    setTimeout(() => {
      wordItem.style.backgroundColor = originalBg;
    }, 300);
  }
}

// ========== 事件绑定与初始化 ==========
function initializeWordCopyPlugin() {
  console.log('[初始化] 开始初始化单词复制插件（兼容多样式）');

  // 移除可能存在的旧监听器
  document.removeEventListener('contextmenu', handleWordRightClick, { capture: true });

  // 绑定右键事件监听器
  document.addEventListener('contextmenu', handleWordRightClick, { capture: true });

  console.log('[初始化] 插件已加载，右键点击单词即可复制（兼容两种样式）');

  // 显示当前页面单词数量和样式检测
  const style1Items = document.querySelectorAll(STYLES.STYLE_1.wordItem);
  const style2Items = document.querySelectorAll(STYLES.STYLE_2.wordItem);
  console.log(`[调试] 样式1单词项数量: ${style1Items.length}`);
  console.log(`[调试] 样式2单词项数量: ${style2Items.length}`);

  // 测试每个单词项的提取
  const allWordItems = document.querySelectorAll('.word-item, [class*="word-item"], [class*="word"][class*="item"]');
  console.log(`[调试] 总单词项数量: ${allWordItems.length}`);

  allWordItems.forEach((item, idx) => {
    const { english, chinese, style } = extractWordData(item);
    const styleName = style === STYLES.STYLE_1 ? '样式1' : (style === STYLES.STYLE_2 ? '样式2' : '未知');
    console.log(`[测试${idx+1}] 样式: ${styleName}, 英文: "${english}", 中文: "${chinese}"`);
  });
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWordCopyPlugin);
} else {
  initializeWordCopyPlugin();
}

// 监听动态内容加载
if (typeof MutationObserver !== 'undefined') {
  const observer = new MutationObserver((mutations) => {
    let hasNewWordContent = false;

    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) { // 元素节点
            // 检查是否添加了单词项
            if (node.matches && (node.matches(STYLES.STYLE_1.wordItem) || node.matches(STYLES.STYLE_2.wordItem))) {
              hasNewWordContent = true;
              break;
            }
            // 检查子元素中是否有单词项
            if (node.querySelector && (node.querySelector(STYLES.STYLE_1.wordItem) || node.querySelector(STYLES.STYLE_2.wordItem))) {
              hasNewWordContent = true;
              break;
            }
          }
        }
      }
      if (hasNewWordContent) break;
    }

    if (hasNewWordContent) {
      console.log('[动态加载] 检测到新单词内容，重新初始化插件');
      setTimeout(initializeWordCopyPlugin, 100);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 导出调试函数
if (typeof window !== 'undefined') {
  window.wordCopyDebug = {
    extractWordData,
    findClosestWordItem,
    initializeWordCopyPlugin,
    detectStyles: () => {
      const style1Count = document.querySelectorAll(STYLES.STYLE_1.wordItem).length;
      const style2Count = document.querySelectorAll(STYLES.STYLE_2.wordItem).length;
      return { style1Count, style2Count };
    },
    testAllWords: () => {
      const allWordItems = document.querySelectorAll('.word-item, [class*="word-item"]');
      return Array.from(allWordItems).map((item, idx) => ({
        index: idx + 1,
        ...extractWordData(item)
      }));
    }
  };
  console.log('[完成] 单词复制插件已加载完成，可以使用 window.wordCopyDebug 进行调试');
}
