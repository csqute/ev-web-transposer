import{useState as i}from"preact/hooks";import{html as p,AppDialog as x,SmallButton as v,Hint as y}from"../ui/components.js";import{activateLicense as h,closeDialog as k,licenseView as w,showSuccess as C,showToast as T}from"../app/store.js";function A(){const s=w(),[l,c]=i(""),[n,u]=i(""),[$,b]=i(""),[o,d]=i(!1),a=(t,e="")=>{u(t),b(e)},g=async()=>{try{await navigator.clipboard.writeText(s.device),a("\u8BBE\u5907\u7801\u5DF2\u590D\u5236","ok")}catch{a("\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u4E2D\u8BBE\u5907\u7801\u590D\u5236","bad")}},m=async()=>{try{const t=await navigator.clipboard.readText();t&&(c(t.trim()),a("\u5DF2\u7C98\u8D34",""))}catch{a("\u6D4F\u89C8\u5668\u4E0D\u5141\u8BB8\u8BFB\u53D6\u526A\u8D34\u677F\uFF0C\u8BF7\u624B\u52A8\u957F\u6309\u7C98\u8D34","bad")}},f=async()=>{if(o)return;const t=l.trim();if(!t){a("\u8BF7\u5148\u7C98\u8D34\u6FC0\u6D3B\u7801","bad");return}d(!0),a("\u6B63\u5728\u6821\u9A8C\u7B7E\u540D\u2026","");try{const e=await h(t);c(""),a(`${e.message}\u3002\u8BBE\u5907\u7801\u5DF2\u66F4\u65B0\uFF0C\u4E0B\u6B21\u8D2D\u4E70\u8BF7\u590D\u5236\u65B0\u7684\u8BBE\u5907\u7801\u3002`,"ok"),C(e.message,e.unlimited,e.period)}catch(e){const r=(e==null?void 0:e.message)||String(e);a(r,"bad"),T(r)}finally{d(!1)}};return p`
    <${x} title="次数与客服" onClose=${k}>
      <div class="support-hero">
        <div class="support-balance">${s.text}</div>
        <p class="hint">
          ${s.unlimited?"\u6240\u6709\u529F\u80FD\u4E0D\u9650\u6B21\u6570\uFF0C\u65E0\u9700\u518D\u5145\u503C\u3002":s.periodBlockedByClock?"\u68C0\u6D4B\u5230\u7CFB\u7EDF\u65F6\u95F4\u88AB\u8C03\u65E9\uFF1A\u65F6\u957F\u5361\u6682\u505C\u4F7F\u7528\uFF0C\u8BF7\u628A\u624B\u673A/\u7535\u8111\u65F6\u95F4\u8C03\u56DE\u81EA\u52A8\u3002":s.periodActive?`\u65F6\u957F\u5361\u5269\u4F59 ${s.daysLeft} \u5929${s.untilText?`\uFF08\u81F3 ${s.untilText}\uFF09`:""}\uFF0C
                   \u5230\u671F\u540E\u6062\u590D\u5269\u4F59 ${s.balance} \u6B21\uFF1B\u6709\u6548\u671F\u5185\u6240\u6709\u529F\u80FD\u4E0D\u6263\u6B21\u6570\u3002`:"\u6BCF\u6B21\u6210\u529F\u79FB\u8C03\u3001\u63A8\u5B50\u3001\u6253\u9F13\u3001\u6B4C\u5355/\u97F3\u8272\u53D1\u9001\u6263 1 \u6B21\uFF1B\u8BBE\u7F6E\u3001\u6D4B\u8BD5\u97F3\u514D\u8D39\u3002"}
        </p>
      </div>

      <div class="support-qr-wrap">
        <img class="support-qr" src="./assets/contact_qr.jpg" alt="微信客服二维码" />
        <div class="support-qr-text">
          <p>扫码添加微信购买次数、日卡/周卡/月卡或永久版。</p>
          <p class="hint">发码时请把下面的设备码发给客服。</p>
        </div>
      </div>

      <div class="device-code-block">
        <div class="field-label">设备码</div>
        <div class="device-code-line">
          <code class="device-code">${s.device}</code>
          <${v} label="复制" onClick=${g} />
        </div>
      </div>

      <div class="activation-block">
        <div class="field-label">激活码（EV1...）</div>
        <textarea
          class="activation-input"
          rows="3"
          value=${l}
          onInput=${t=>c(t.currentTarget.value)}
          placeholder="粘贴 EV1 开头的激活码"
        ></textarea>
        <div class="button-row">
          <${v} label="粘贴" onClick=${m} />
          <button
            type="button"
            class="primary-btn"
            disabled=${o}
            onClick=${f}
          >${o?"\u6821\u9A8C\u4E2D\u2026":"\u6FC0\u6D3B"}</button>
        </div>
        ${n?p`<p class=${`activation-message ${$}`}>${n}</p>`:null}
      </div>

      <${y}>
        免费额度 50 次。激活码可以增加次数、开通日卡/周卡/月卡（自定义 1–3650 天）或升级永久；
        次数不过期，时长卡在有效期内不扣次数，到期后恢复剩余次数，续费会在当前到期时间上叠加。
        歌曲工作室需要无限制版或有效期内的时长卡；按次数余额不能解锁工作室。
        清空浏览器数据后设备码和剩余次数会重置；卸载或换浏览器需要重新激活。
        每次激活成功后设备码会自动更新，下次购买请复制新的设备码。
        网页版激活码只能防随意分享，无法像安卓版一样校验安装包。
      <//>
    <//>
  `}export{A as SupportDialog};
