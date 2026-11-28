import{useState as i}from"preact/hooks";import{html as p,SmallButton as d,Hint as h}from"../ui/components.js";import{activateLicense as x,licenseView as y,openDialog as w,showSuccess as C,showToast as T}from"../app/store.js";function E({embedded:u=!1}){const s=y(),[l,c]=i(""),[n,b]=i(""),[$,g]=i(""),[o,r]=i(!1),a=(t,e="")=>{b(t),g(e)},m=async()=>{try{await navigator.clipboard.writeText(s.device),a("\u8BBE\u5907\u7801\u5DF2\u590D\u5236","ok")}catch{a("\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u4E2D\u8BBE\u5907\u7801\u590D\u5236","bad")}},f=async()=>{try{const t=await navigator.clipboard.readText();t&&(c(t.trim()),a("\u5DF2\u7C98\u8D34",""))}catch{a("\u6D4F\u89C8\u5668\u4E0D\u5141\u8BB8\u8BFB\u53D6\u526A\u8D34\u677F\uFF0C\u8BF7\u624B\u52A8\u957F\u6309\u7C98\u8D34","bad")}},k=async()=>{if(o)return;const t=l.trim();if(!t){a("\u8BF7\u5148\u7C98\u8D34\u6FC0\u6D3B\u7801","bad");return}r(!0),a("\u6B63\u5728\u6821\u9A8C\u7B7E\u540D\u2026","");try{const e=await x(t);c(""),a(`${e.message}\u3002\u8BBE\u5907\u7801\u5DF2\u66F4\u65B0\uFF0C\u4E0B\u6B21\u8D2D\u4E70\u8BF7\u590D\u5236\u65B0\u7684\u8BBE\u5907\u7801\u3002`,"ok"),C(e.message,e.unlimited,e.period)}catch(e){const v=(e==null?void 0:e.message)||String(e);a(v,"bad"),T(v)}finally{r(!1)}};return p`
    <div class=${`studio-gate${u?" embedded":""}`}>
      <div class="studio-gate-card">
        <div class="studio-gate-lock">🔒</div>
        <h2>工作室需要激活</h2>
        <p class="studio-gate-lead">
          歌曲工作室包含在 Ev移调器 的<b>无限制版</b>或<b>有效期内的时长卡</b>里。
          按次数余额不能解锁工作室。
        </p>

        <div class="support-hero">
          <div class="support-balance">${s.text}</div>
          <p class="hint">
            ${s.periodBlockedByClock?"\u68C0\u6D4B\u5230\u7CFB\u7EDF\u65F6\u95F4\u88AB\u8C03\u65E9\uFF1A\u65F6\u957F\u5361\u6682\u505C\u4F7F\u7528\uFF0C\u8BF7\u628A\u8BBE\u5907\u65F6\u95F4\u8C03\u56DE\u81EA\u52A8\u3002":s.periodActive?`\u65F6\u957F\u5361\u5269\u4F59 ${s.daysLeft} \u5929${s.untilText?`\uFF08\u81F3 ${s.untilText}\uFF09`:""}\uFF0C\u6709\u6548\u671F\u5185\u5DE5\u4F5C\u5BA4\u4E0D\u6263\u6B21\u6570\u3002`:"\u6FC0\u6D3B\u65E0\u9650\u5236\u7248\u6216\u65F6\u957F\u5361\u540E\uFF0C\u5DE5\u4F5C\u5BA4\u548C\u5176\u4ED6\u6240\u6709\u529F\u80FD\u90FD\u4E0D\u518D\u6263\u6B21\u6570\u3002"}
          </p>
        </div>

        <div class="support-qr-wrap">
          <img class="support-qr" src="./assets/contact_qr.jpg" alt="微信客服二维码" />
          <div class="support-qr-text">
            <p>扫码添加微信购买永久版或日卡 / 周卡 / 月卡。</p>
            <p class="hint">发码时请把下面的设备码发给客服。</p>
          </div>
        </div>

        <div class="device-code-block">
          <div class="field-label">设备码</div>
          <div class="device-code-line">
            <code class="device-code">${s.device}</code>
            <${d} label="复制" onClick=${m} />
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
            <${d} label="粘贴" onClick=${f} />
            <button
              type="button"
              class="primary-btn"
              disabled=${o}
              onClick=${k}
            >${o?"\u6821\u9A8C\u4E2D\u2026":"\u6FC0\u6D3B"}</button>
            <${d}
              label="打开「次数与客服」"
              onClick=${()=>w("support")}
            />
          </div>
          ${n?p`<p class=${`activation-message ${$}`}>${n}</p>`:null}
        </div>

        <${h}>
          无限制版和时长卡会同时解锁移调、调音台、打鼓、音色链、歌单和歌曲工作室；
          按次数充值只影响其他功能，不会解锁工作室。
          每次激活成功后设备码会自动更新，下次购买请复制新的设备码。
        <//>
      </div>
    </div>
  `}export{E as StudioGate};
