import{html as c,AlertDialog as l}from"../ui/components.js";import{closeSuccess as e,ui as i}from"../app/store.js";function u(){const s=i.value.success;return s?c`
    <${l}
      title="充值成功"
      actions=${[{label:"\u77E5\u9053\u4E86",primary:!0,onClick:()=>e()}]}
      onClose=${e}
    >
      <div class="success-check">✓</div>
      <p class="success-message">${s.message}</p>
      ${s.unlimited?c`<p class="hint">已升级为无限制版，所有功能不再扣次数。</p>`:s.period?c`<p class="hint">时长卡有效期内所有功能不扣次数，到期后自动恢复剩余次数。</p>`:null}
    <//>
  `:null}export{u as SuccessDialog};
