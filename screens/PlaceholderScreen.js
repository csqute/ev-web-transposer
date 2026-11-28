import{html as e}from"../ui/components.js";import{navigate as n}from"../app/router.js";const c={setlist:"\u6B4C\u5355",sounds:"\u97F3\u8272\u9009\u62E9",chain:"\u97F3\u8272\u94FE",mixer:"\u8C03\u97F3\u53F0",drums:"\u6253\u9F13"},a={setlist:"3\xD73 \u6B4C\u5355\u3001SongBook \u7F16\u53F7\u53D1\u9001\u3001\u4ECE\u7434\u6293\u53D6\u3001\u4E0A\u4E00\u9996/\u4E0B\u4E00\u9996\u3002",sounds:"9 \u7EC4 \xD7 6 \u9875 \xD7 48 \u683C\u97F3\u8272\u3001KEYBOARDSET \u5BFC\u5165\u3001\u70B9\u6309\u5373\u53D1\u3002",chain:"\u86C7\u5F62\u97F3\u8272\u94FE\u3001\u957F\u6309\u62D6\u52A8\u6392\u5E8F\u3001\u989C\u8272\u3001\u79FB\u8C03\u6307\u4EE4\u3001\u591A\u94FE\u7BA1\u7406\u3002",mixer:"7 \u8DEF\u63A8\u5B50\u3001CC#7\u3001\u9759\u97F3\u3001SX/MIDI \u76EE\u6807\u3001\u901A\u9053\u6620\u5C04\u3002",drums:"10 \u4E2A\u9F13\u57AB\u30019 \u4E2A\u9F13\u7EC4\u300146 \u4E2A\u97F3\u6548\u300116 \u6B65 Loop\u3002"};function d({screen:s}){const t=c[s]||"\u529F\u80FD",o=a[s]||"";return e`
    <div class="sub-screen">
      <div class="screen-header">
        <button type="button" class="back-btn" onClick=${()=>n("transpose")}>‹ 返回</button>
        <h1>${t}</h1>
        <span class="header-spacer"></span>
      </div>
      <div class="placeholder-card">
        <div class="placeholder-icon">🚧</div>
        <h2>${t}正在开发中</h2>
        <p>这个页面会在后续阶段上线。当前版本已经可以连接 MIDI、移调和授权。</p>
        <p class="hint">${o}</p>
      </div>
    </div>
  `}export{d as PlaceholderScreen};
