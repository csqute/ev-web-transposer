import{html as n}from"./components.js";import{saveSoundPicker as s,soundPicker as u}from"../app/store.js";import{withPaneMode as l}from"../core/sounds/picker.js";function d({pane:t=0,mode:o,className:e="modx-mode-switch"}){const c=i=>{s(l(u.value,t,i))};return n`
    <div
      class=${e}
      title=${`\u7A97\u683C ${t+1} \u7684\u97F3\u8272\u578B\u53F7\uFF08\u548C\u300C\u97F3\u8272\u9009\u62E9 ${t+1}\u300D\u540C\u6B65\uFF09`}
    >
      <button
        type="button"
        class=${`chip${o==="KORG"?" selected":""}`}
        onClick=${()=>c("KORG")}
      >KORG</button>
      <button
        type="button"
        class=${`chip${o==="MODX"?" selected":""}`}
        onClick=${()=>c("MODX")}
      >MODX</button>
      <button
        type="button"
        class=${`chip${o==="SX"?" selected":""}`}
        onClick=${()=>c("SX")}
      >SX</button>
    </div>
  `}export{d as PickerModeSwitch};
