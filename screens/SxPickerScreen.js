import{useEffect as O,useRef as G,useState as C}from"preact/hooks";import{AlertDialog as H,AppDialog as D,Chip as b,SmallButton as m,haptic as B,html as o}from"../ui/components.js";import{navigate as ve}from"../app/router.js";import{addLog as me,licenseView as ke,midi as U,saveSoundPicker as W,setStatusLine as xe,soundPicker as P}from"../app/store.js";import{paneSxTargetKey as Z,withPaneSettings as ge}from"../core/sounds/picker.js";import{PickerModeSwitch as fe}from"../ui/PickerModeSwitch.js";import{connectMidi as Ce}from"../core/midi/engine.js";import{cancelSxSwitching as ye,resolveSxTarget as j,resolveSxTargetForPane as Xe,sendSxSlot as q,sxCandidateDevices as we}from"../core/sxreg/engine.js";import{SX_BUTTON_VARIANTS as Pe,decodeSxPath as I,encodeSxPath as _e}from"../core/sxreg/protocol.js";import{SX_DEFAULT_GROUP_LABELS as Ie,SX_DELAY_LABELS as Me,SX_DELAY_VALUES as z,SX_GROUP_COUNT as J,SX_GROUP_LABEL_MAX as Ae,SX_MODELS as De,SX_OTHER_MODEL_INDEX as Be,SX_PAGE_COUNT as Le,SX_PAGE_SIZE as Te,SX_SLOT_NAME_MAX as Q,SX_BANK_NAME_MAX as Ne,sxBankDisplayName as L,sxBankForPath as K,sxCurrentBankPath as R,sxDetectModelIndex as Ee,sxGroupLabel as ee,sxModel as V,sxSlotAt as F,sxSlotName as te,withSxAllSlotsCleared as Oe,withSxAutoLearn as T,withSxBankAdded as se,withSxBankMoved as le,withSxBankRemoved as Ge,withSxBankRenamed as Ue,withSxButtonCount as ne,withSxDelay as ae,withSxGroupLabel as Ke,withSxImmediateSend as ie,withSxKeepVolume as oe,withSxModel as ce,withSxSelected as re,withSxSettings as Re,withSxSlot as Ve,withSxSlotCleared as Fe,withSxTargetKey as Ye,withSxVariant as He}from"../core/sxreg/model.js";function d(i){const n=i(P.value.sx);return W({...P.value,sx:n}),n}function w(i,n="muted"){xe(i),i&&me(i,n)}function We(){return ke().shortText}function Ze({index:i,selected:n,onClick:c}){return o`
    <button
      type="button"
      class=${`sound-page-btn${n?" selected":""}`}
      onClick=${c}
    >P${i+1}</button>
  `}function je({code:i,name:n,used:c,selected:u,onTap:t,onEdit:h}){const l=G(0),$=G(null),k=()=>{clearTimeout(l.current),l.current=0},y=s=>{if(!(s.pointerType==="mouse"&&s.button!==0)){k(),$.current={x:s.clientX,y:s.clientY,long:!1,pointerId:s.pointerId},l.current=setTimeout(()=>{const a=$.current;a&&(a.long=!0,B(30),h==null||h())},450);try{s.currentTarget.setPointerCapture(s.pointerId)}catch{}}},x=s=>{const a=$.current;a&&(Math.abs(s.clientX-a.x)>9||Math.abs(s.clientY-a.y)>9)&&(a.moved=!0,k())},g=s=>{k();const a=$.current;if($.current=null,!(!a||a.moved)){try{s.currentTarget.releasePointerCapture(a.pointerId)}catch{}a.long||t==null||t()}},f=()=>{k(),$.current=null};return o`
    <div
      class=${`sound-tile${c?" used":" empty"}${u?" selected":""}`}
      role="button"
      tabindex="0"
      title=${c?`${n} \xB7 \u957F\u6309\u7F16\u8F91`:`${i} \u7A7A \xB7 \u70B9\u6309\u653E\u5165\u97F3\u8272`}
      onPointerDown=${y}
      onPointerMove=${x}
      onPointerUp=${g}
      onPointerCancel=${f}
      onContextMenu=${s=>{s.preventDefault(),h==null||h()}}
      onKeyDown=${s=>{(s.key==="Enter"||s.key===" ")&&(s.preventDefault(),t==null||t())}}
    >
      <span class="sound-tile-index">${i}</span>
      <span class="sound-tile-name">${c?n:"\u7A7A"}</span>
    </div>
  `}function qe({title:i,initial:n,maxLength:c,onClose:u,onConfirm:t}){const[h,l]=C(n||"");return o`
    <${D} title=${i} onClose=${u}>
      <div class="sx-slot-editor">
        <label class="chain-field">
          <span>名称</span>
          <input
            type="text"
            maxlength=${c}
            value=${h}
            onInput=${$=>l($.currentTarget.value.slice(0,c))}
          />
        </label>
        <div class="chain-dialog-actions">
          <${m} label="取消" onClick=${u} />
          <${m}
            label="保存"
            onClick=${()=>{t(h),u()}}
          />
        </div>
      </div>
    <//>
  `}function de(i=0,n=P.value.sx,c=U.value.devices){return Xe(n,c,i,Z(P.value,i))}function ze({pane:i=0,onClose:n,onOpenBanks:c}){const u=P.value.sx,t=u.settings,h=Z(P.value,i),l=h||t.targetDeviceKey,$=de(i),k=we(),[y,x]=C(String(t.delayMs)),[g,f]=C(!1),_=e=>d(r=>Re(r,e)),s=e=>{ye(),i<=0?d(r=>Ye(r,e)):W(ge(P.value,i,{sxTargetKey:e}))},a=e=>{const r=V(e);d(v=>ce(v,e)),w(`SX\uFF1A\u7434\u578B ${r.label}\uFF08${r.buttons} \u952E\uFF09`)};return o`
    <${D}
      title=${i>0?`\u97F3\u8272\u9009\u62E9 ${i+1} \xB7 SX \u8BBE\u7F6E`:"SX \u97F3\u8272\u9009\u62E9\u8BBE\u7F6E"}
      onClose=${n}
    >
      <div class="sound-settings sx-settings">
        <h3 class="section-title">发送到哪台 SX</h3>
        <p class="hint">
          网页版走 Web MIDI：SX 用 USB TO HOST 接在打开网页的设备上，第一次连接时允许 MIDI 权限（含 SysEx）。
          ${i>0?"\u8DDF\u968F\u5168\u5C40 = \u4F7F\u7528 SX \u8BBE\u7F6E\u91CC\u7684\u76EE\u6807\uFF1B\u5168\u5C40\u6CA1\u8BBE\u65F6\uFF0C\u7A97\u683C 1/2/3 \u4F9D\u6B21\u7528\u7B2C 1/2/3 \u53F0 SX\u3002\u4E5F\u53EF\u4EE5\u53EA\u7ED9\u8FD9\u4E2A\u7A97\u683C\u5355\u72EC\u9009\u4E00\u53F0\u3002":"\u81EA\u52A8 = \u7B2C\u4E00\u53F0\u8BC6\u522B\u5230\u7684 SX / Genos\u3002"}
        </p>
        <div class="sound-target-list">
          <${b}
            label=${i>0?"\u8DDF\u968F\u5168\u5C40":"\u81EA\u52A8\uFF08\u7B2C\u4E00\u53F0 SX\uFF09"}
            selected=${i>0?!h:!t.targetDeviceKey}
            onClick=${()=>s("")}
          />
          ${k.map(e=>o`
            <${b}
              label=${`${e.displayName}${e.isSx?" \xB7 SX":" \xB7 \u672A\u8BC6\u522B"}`}
              selected=${l===e.key}
              title=${e.outputName||e.displayName}
              onClick=${()=>s(e.key)}
            />
          `)}
        </div>
        ${k.length===0?o`<p class="hint danger">未连接 MIDI 琴。接上 SX 的 USB TO HOST 后点屏幕任意处重试。</p>`:null}
        ${l&&!$?o`<p class="hint danger">上次选择的琴当前未连接，请重新选择。</p>`:null}
        <p class="hint">当前：${($==null?void 0:$.displayName)||"\u672A\u53D1\u73B0 SX"} · 型号 ${V(t.modelIndex).label}</p>
        <p class="hint">安卓备份里的 Cable / SysEx 逐包设置会在网页版忽略；Web MIDI 按完整 SysEx 发送。</p>

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">发送方式</h3>
        <div class="modx-chip-wrap">
          <${b}
            label="点按即发"
            selected=${t.immediateSend}
            onClick=${()=>d(e=>ie(e,!0))}
          />
          <${b}
            label="预选后发送"
            selected=${!t.immediateSend}
            onClick=${()=>d(e=>ie(e,!1))}
          />
        </div>
        <p class="hint">预选模式：先点音色选中，再按底部的「发送」。</p>

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">切换后保持音量</h3>
        <p class="hint">
          琴对外部发来的注册记忆切换，可能会把右手/左手音量改成注册里保存的旧值
          （面板按键不会）。开启后，网页版在切换前先读回琴上当前音量，
          切换完成后再自动发回去。
        </p>
        <div class="modx-chip-wrap">
          <${b}
            label="保持音量 开"
            selected=${t.keepVolume}
            onClick=${()=>d(e=>oe(e,!0))}
          />
          <${b}
            label="关"
            selected=${!t.keepVolume}
            onClick=${()=>d(e=>oe(e,!1))}
          />
        </div>

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">切库后等待琴加载</h3>
        <p class="hint">
          发送切库路径后等这么久再发按键。按键落到旧库就调大；稳定后可以往小调，例如 0.1 秒。
        </p>
        <div class="modx-chip-wrap">
          ${Me.map((e,r)=>o`
            <${b}
              key=${r}
              label=${e}
              selected=${t.delayMs===z[r]}
              onClick=${()=>d(v=>ae(v,z[r]))}
            />
          `)}
        </div>
        <label class="chain-field">
          <span>自定义等待（毫秒）</span>
          <input
            type="number"
            min="0"
            max="60000"
            inputmode="numeric"
            value=${y}
            onInput=${e=>x(e.currentTarget.value.replace(/[^0-9]/g,"").slice(0,5))}
          />
        </label>
        <div class="modx-dialog-buttons">
          <${m}
            label="应用自定义等待"
            disabled=${y===""}
            onClick=${()=>{const e=Math.max(0,Math.min(6e4,Number(y)||0));d(r=>ae(r,e)),x(String(e))}}
          />
        </div>
        <p class="hint">当前：${t.delayMs} 毫秒 · 可输入 0–60000；0 = 切库后立即按键。</p>

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">SX 琴型</h3>
        <p class="hint">
          SX 一般 8 个注册键；Genos / Genos2 是 10 个。SX620 / SX720 / SX920 选「SX 新机型」，
          SX600 / SX700 / SX900 选「SX 旧机型」；切库后按键没反应就换另一种格式。
        </p>
        <div class="modx-group-picker">
          ${De.map((e,r)=>o`
            <${b}
              key=${e.label}
              label=${e.label}
              selected=${t.modelIndex===r}
              onClick=${()=>a(r)}
            />
          `)}
        </div>

        <h3 class="section-title">按键数量</h3>
        <div class="modx-chip-wrap">
          <${b}
            label="8 个（SX）"
            selected=${t.buttonCount===8}
            onClick=${()=>d(e=>ne(e,8))}
          />
          <${b}
            label="10 个（Genos）"
            selected=${t.buttonCount===10}
            onClick=${()=>d(e=>ne(e,10))}
          />
        </div>

        <h3 class="section-title">按键格式</h3>
        <div class="sound-target-list">
          ${Pe.map((e,r)=>o`
            <${b}
              key=${e.key}
              label=${e.label}
              selected=${t.variantIndex===r}
              onClick=${()=>{d(v=>He(v,r)),w(`SX\uFF1A\u6309\u952E\u683C\u5F0F ${e.label}`)}}
            />
          `)}
        </div>

        <h3 class="section-title">自动学习</h3>
        <div class="modx-chip-wrap">
          <${b}
            label="自动学习开"
            selected=${t.autoLearn}
            onClick=${()=>d(e=>T(e,!0))}
          />
          <${b}
            label="自动学习关"
            selected=${!t.autoLearn}
            onClick=${()=>d(e=>T(e,!1))}
          />
        </div>
        <p class="hint">开着时，在琴上切换的每个 .rgt 注册库都会自动加入列表。</p>

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">组名缩写（底部 9 个组）</h3>
        <p class="hint">留空使用默认分类名（Piano、Organ、Guitar、String、Brass、Trumpet、Sax、Synth、Ethnic）。</p>
        <div class="sound-label-list">
          ${Array.from({length:J},(e,r)=>{var v;return o`
            <label class="sound-label-row">
              <span>组 ${r+1}</span>
              <input
                type="text"
                maxlength=${Ae}
                value=${((v=u.groups[r])==null?void 0:v.label)||""}
                placeholder=${Ie[r]}
                onInput=${p=>d(M=>Ke(M,r,p.currentTarget.value))}
              />
            </label>
          `})}
        </div>

        <div class="mixer-divider-line"></div>
        <div class="modx-dialog-buttons">
          <${m} label="管理注册库" onClick=${c} />
          <${m} label="清空所有音色位置" onClick=${()=>f(!0)} />
        </div>
        <p class="hint">
          在琴上切换注册库时，开着的自动学习会把完整 .rgt 路径加进来；
          之后在 2×4 网格里长按格子选库和按键号即可整理。
        </p>
      </div>
    <//>

    ${g?o`
          <${H}
            title="清空所有音色位置？"
            message="会清除 SX 9 组 × 6 页里的所有位置和名字，不会改动注册库列表和琴上的数据。"
            actions=${[{label:"\u53D6\u6D88",onClick:()=>f(!1)},{label:"\u6E05\u7A7A",danger:!0,onClick:()=>{f(!1),d(e=>Oe(e)),w("SX\uFF1A\u5DF2\u6E05\u7A7A\u5168\u90E8\u97F3\u8272\u4F4D\u7F6E","ok")}}]}
          />
        `:null}
  `}function Je({onClose:i}){const n=P.value.sx,c=j(n,U.value.devices),u=R(n,(c==null?void 0:c.key)||""),[t,h]=C(-1),[l,$]=C(-1),[k,y]=C(""),[x,g]=C(!1),f=()=>{if(!u){w("SX\uFF1A\u8FD8\u6CA1\u6536\u5230\u5F53\u524D\u5E93\uFF1B\u5148\u5728\u7434\u4E0A\u9009\u4E00\u4E2A\u6CE8\u518C\u5E93","warn");return}const s=P.value.sx.banks.length,a=d(e=>se(e,u));w(a.banks.length>s?"SX\uFF1A\u5DF2\u52A0\u5165\u5F53\u524D\u5E93":"SX\uFF1A\u5F53\u524D\u5E93\u5DF2\u7ECF\u5728\u5217\u8868\u91CC",a.banks.length>s?"ok":"warn")},_=()=>{const s=k.trim();if(!s){w("SX\uFF1A\u5148\u8F93\u5165\u6CE8\u518C\u5E93\u8DEF\u5F84","warn");return}if(x&&/[^\x00-\x7f]/.test(s)){w("SX\uFF1A\u52FE\u4E86\u300C\u5DF2\u662F\u7F16\u7801\u683C\u5F0F\u300D\uFF0C\u4F46\u8DEF\u5F84\u91CC\u8FD8\u6709\u4E2D\u6587","warn");return}const a=x?s:_e(s),e=P.value.sx.banks.length;d(v=>se(v,a)).banks.length>e?(y(""),w(`SX\uFF1A\u5DF2\u52A0\u5165 ${I(a)}`,"ok")):w("SX\uFF1A\u8FD9\u4E2A\u6CE8\u518C\u5E93\u5DF2\u7ECF\u5728\u5217\u8868\u91CC","warn")};return o`
    <${D} title="SX 注册库（页面）" onClose=${i}>
      <div class="sound-settings sx-settings">
        <h3 class="section-title">自动学习</h3>
        <div class="modx-chip-wrap">
          <${b}
            label="开"
            selected=${n.settings.autoLearn}
            onClick=${()=>d(s=>T(s,!0))}
          />
          <${b}
            label="关"
            selected=${!n.settings.autoLearn}
            onClick=${()=>d(s=>T(s,!1))}
          />
        </div>
        <p class="hint">开着时，在琴上切换的每个 .rgt 注册库都会自动加入列表。</p>

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">当前琴上的库</h3>
        <p class=${`hint${u?" accent":""}`}>
          ${u?I(u):"\u8FD8\u6CA1\u6536\u5230\u56DE\u62A5 \xB7 \u5148\u5728\u7434\u4E0A\u9009\u4E00\u4E2A\u6CE8\u518C\u5E93"}
        </p>
        <div class="modx-dialog-buttons">
          <${m}
            label="把当前库加入列表"
            disabled=${!u}
            onClick=${f}
          />
        </div>

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">已学习 ${n.banks.length} 个库</h3>
        ${n.banks.length===0?o`
              <p class="hint">
                列表还是空的。勾上自动学习，在琴上依次点一遍要用的注册库，或在下面手动添加路径。
              </p>
            `:o`
              <div class="sx-bank-list">
                ${n.banks.map((s,a)=>o`
                  <div class="modx-bank-row" key=${`${s.path}-${a}`}>
                    <div class="modx-bank-info">
                      <strong>${a+1}. ${L(s)}</strong>
                      <span>${I(s.path)}</span>
                    </div>
                    <div class="sx-bank-actions">
                      <${m} label="改名" onClick=${()=>h(a)} />
                      <${m} label="↑" disabled=${a===0} onClick=${()=>d(e=>le(e,a,-1))} />
                      <${m} label="↓" disabled=${a===n.banks.length-1} onClick=${()=>d(e=>le(e,a,1))} />
                      <${m} label="删" onClick=${()=>$(a)} />
                    </div>
                  </div>
                `)}
              </div>
            `}

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">手动添加 .rgt 路径</h3>
        <label class="chain-field">
          <span>路径</span>
          <input
            type="text"
            value=${k}
            placeholder="User:/我的文件夹/[000].rgt"
            onInput=${s=>y(s.currentTarget.value)}
          />
        </label>
        <div class="sx-bank-add-row">
          <${b}
            label="路径已是编码格式"
            selected=${x}
            onClick=${()=>g(!x)}
          />
          <${m} label="加入列表" disabled=${!k.trim()} onClick=${_} />
        </div>
        <p class="hint">中文路径会自动编码；从日志复制的 +...- 路径请勾上「已是编码格式」。</p>
      </div>
    <//>

    ${t>=0&&n.banks[t]?o`
          <${qe}
            title="注册库名称"
            initial=${n.banks[t].name}
            maxLength=${Ne}
            onClose=${()=>h(-1)}
            onConfirm=${s=>{d(a=>Ue(a,t,s)),h(-1)}}
          />
        `:null}

    ${l>=0&&n.banks[l]?o`
          <${H}
            title="删除这个注册库？"
            message=${`${L(n.banks[l])}
${I(n.banks[l].path)}`}
            actions=${[{label:"\u53D6\u6D88",onClick:()=>$(-1)},{label:"\u5220\u9664",danger:!0,onClick:()=>{d(s=>Ge(s,l)),w("SX\uFF1A\u5DF2\u5220\u9664\u6CE8\u518C\u5E93","ok"),$(-1)}}]}
          />
        `:null}
  `}function Qe({group:i,slotIndex:n,onClose:c,onOpenBanks:u}){var e,r,v;const t=P.value.sx,h=t.settings,l=((r=(e=t.groups[i])==null?void 0:e.slots)==null?void 0:r[n])||null,$=j(t,U.value.devices),k=R(t,($==null?void 0:$.key)||""),[y,x]=C((l==null?void 0:l.name)||""),[g,f]=C((l==null?void 0:l.bankPath)||k||((v=t.banks[0])==null?void 0:v.path)||""),[_,s]=C(Math.min((l==null?void 0:l.button)||1,h.buttonCount)),a=()=>{if(!g){w("SX\uFF1A\u5148\u9009\u62E9\u6CE8\u518C\u5E93","warn");return}d(p=>Ve(p,i,n,{name:y,bankPath:g,button:_})),w(`SX\uFF1A\u5DF2\u4FDD\u5B58 ${i+1}-${n+1}`,"ok"),c()};return o`
    <${D} title=${`\u7F16\u8F91\u97F3\u8272\u4F4D\u7F6E ${i+1}-${n+1}`} onClose=${c}>
      <div class="sx-slot-editor">
        <label class="chain-field">
          <span>显示名字</span>
          <input
            type="text"
            maxlength=${Q}
            value=${y}
            placeholder="留空自动显示「库名 · 按键号」"
            onInput=${p=>x(p.currentTarget.value.slice(0,Q))}
          />
        </label>

        <h3 class="section-title">注册库</h3>
        ${t.banks.length===0?o`
              <p class="hint danger">
                还没有注册库。先打开「注册库」学习，或在琴上切换一次让 App 自动学习。
              </p>
              <div class="modx-dialog-buttons">
                <${m} label="打开注册库" onClick=${u} />
              </div>
            `:o`
              <div class="sound-target-list">
                ${t.banks.map(p=>o`
                  <${b}
                    key=${p.path}
                    label=${L(p)}
                    selected=${g===p.path}
                    title=${I(p.path)}
                    onClick=${()=>f(p.path)}
                  />
                `)}
              </div>
            `}
        ${g&&!K(t,g)?o`
              <${b}
                label=${`\u5F53\u524D\u4FDD\u5B58\u7684\u5E93\uFF1A${I(g)}`}
                selected=${!0}
                onClick=${()=>{}}
              />
            `:null}

        <h3 class="section-title">按键</h3>
        <div class="sx-button-grid">
          ${Array.from({length:h.buttonCount},(p,M)=>M+1).map(p=>o`
            <${b}
              key=${p}
              label=${String(p)}
              selected=${_===p}
              onClick=${()=>s(p)}
            />
          `)}
        </div>

        <p class="hint">显示名留空时自动显示「库名 · 按键号」。</p>
        <div class="modx-dialog-buttons">
          ${l?o`
                <${m}
                  label="清空这个位置"
                  onClick=${()=>{d(p=>Fe(p,i,n)),w("SX\uFF1A\u5DF2\u6E05\u7A7A\u97F3\u8272\u4F4D\u7F6E","ok"),c()}}
                />
              `:null}
          <${m} label="取消" onClick=${c} />
          <${m} label="保存" disabled=${!g} onClick=${a} />
        </div>
      </div>
    <//>
  `}function $t({embedded:i=!1,pane:n=0}){const c=P.value.sx,u=c.settings,t=u.selectedGroup,h=u.selectedPage,l=de(n),[$,k]=C(-1),[y,x]=C(!1),[g,f]=C(!1),[_,s]=C(null);O(()=>{Ce().catch(()=>{})},[]),O(()=>{k(-1)},[t,h]);const a=G("");O(()=>{if(!l){a.current="";return}if(a.current===l.key||(a.current=l.key,u.modelIndex!==Be))return;const X=Ee(l.modelText||l.displayName);X<0||X===u.modelIndex||d(S=>ce(S,X))},[l==null?void 0:l.key]);const e=h*Te,r=$>=0?F(c,t,e+$):null,v=r?te(c,r):null,p=R(c,(l==null?void 0:l.key)||""),M=p?`\u5F53\u524D\u5E93\uFF1A${K(c,p)?L(K(c,p)):I(p)}`:"\u5728\u7434\u4E0A\u5207\u6362\u6CE8\u518C\u5E93\u4F1A\u81EA\u52A8\u5B66\u4E60",Y=`${l?l.displayName:"\u672A\u53D1\u73B0 SX"} \xB7 ${V(u.modelIndex).label} \xB7 ${u.buttonCount} \u952E \xB7 ${We()}`,$e=X=>{B(),d(S=>re(S,t,X))},ue=X=>{B(),d(S=>re(S,X,0))},pe=X=>{const S=e+X;if(!F(c,t,S)){s({group:t,slotIndex:S});return}B(),k(X),u.immediateSend&&q(t,S,{target:l})};return o`
    <div class="sub-screen sound-screen sx-screen">
      <div class="sound-header">
        ${i?null:o`<button type="button" class="back-btn" onClick=${()=>ve("transpose")}>‹ 返回</button>`}
        <div class="sound-heading">
          <h1>音色选择 ${n+1} · SX</h1>
          <p class=${l?"":"danger"} title=${Y}>${Y}</p>
        </div>
        <div class="sound-header-actions">
          <${fe} pane=${n} mode="SX" />
          <${m} label="注册库" onClick=${()=>f(!0)} />
          <${m} label="设置" onClick=${()=>x(!0)} />
        </div>
      </div>

      <p class="sx-current-bank" title=${M}>${M}</p>

      <div class="sound-workspace">
        <div class="sound-grid">
          ${Array.from({length:2},(X,S)=>Array.from({length:4},(he,Se)=>{const N=S*4+Se,A=e+N,E=F(c,t,A),be=E?te(c,E):null;return o`
                <${je}
                  key=${A}
                  code=${`${t+1}-${A+1}`}
                  name=${be}
                  used=${!!E}
                  selected=${N===$}
                  onTap=${()=>pe(N)}
                  onEdit=${()=>s({group:t,slotIndex:A})}
                />
              `}))}
        </div>

        <div class="sound-pages">
          ${Array.from({length:Le},(X,S)=>o`
            <${Ze}
              key=${S}
              index=${S}
              selected=${S===h}
              onClick=${()=>$e(S)}
            />
          `)}
        </div>

        <div class="sound-groups">
          ${Array.from({length:J},(X,S)=>o`
            <button
              type="button"
              class=${`sound-group-btn${S===t?" selected":""}`}
              title=${ee(c,S)}
              onClick=${()=>ue(S)}
            >${ee(c,S)}</button>
          `)}
        </div>
      </div>

      ${u.immediateSend?null:o`
            <button
              type="button"
              class="sound-send-bar"
              disabled=${!v}
              onClick=${()=>{$>=0&&q(t,e+$,{target:l})}}
            >
              ${v?`\u53D1\u9001 ${t+1}-${e+$+1} ${v}`:"\u5148\u9009\u62E9\u4E00\u4E2A\u97F3\u8272"}
            </button>
          `}

      ${y?o`
            <${ze}
              pane=${n}
              onClose=${()=>x(!1)}
              onOpenBanks=${()=>{x(!1),f(!0)}}
            />
          `:null}

      ${g?o`
            <${Je}
              onClose=${()=>f(!1)}
            />
          `:null}

      ${_?o`
            <${Qe}
              group=${_.group}
              slotIndex=${_.slotIndex}
              onClose=${()=>s(null)}
              onOpenBanks=${()=>{s(null),f(!0)}}
            />
          `:null}
    </div>
  `}export{$t as SxPickerScreen};
