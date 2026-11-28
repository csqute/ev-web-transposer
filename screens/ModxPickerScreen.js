import{useEffect as J,useRef as De,useState as b}from"preact/hooks";import{AlertDialog as $e,AppDialog as E,Chip as N,SmallButton as C,haptic as ue,html as t}from"../ui/components.js";import{navigate as Le}from"../app/router.js";import{chainScreenForPane as et}from"../app/panes.js";import{PickerModeSwitch as tt}from"../ui/PickerModeSwitch.js";import{addLog as at,licenseView as st,midi as Ee,modx as m,modxRuntime as Q,saveModx as y,saveSoundPicker as lt,setStatusLine as nt,soundPicker as pe}from"../app/store.js";import{paneModxTargetKey as Re,withPaneSettings as ot}from"../core/sounds/picker.js";import{MODX_BANK_NAME_MAX as it,MODX_GROUP_COUNT as ee,MODX_LIVE_PAGE_COUNT as me,MODX_NAME_MAX as B,MODX_ORGANIZED_PAGE_COUNT as F,MODX_ORGANIZED_PAGE_SIZE as _,MODX_PAGE_NAME_MAX as ct,MODX_PROFILE_LIST as dt,bankKey as O,bankLabel as te,bankNonEmptyCount as ae,bankPageName as ge,bankSlot as z,ensureModxManualBank as Te,findModxBank as se,isYamahaSynthLike as rt,modxGroupLabel as Y,organizedEntry as T,organizedTotal as ve,profileIsMSeries as $t,profileSupportsCapture as ut,profileSupportsPerformanceNames as pt,refDetail as Ie,refEffectiveName as D,resolveModxProfile as be,resolveModxTarget as mt,resolveModxTargetForPane as gt,selectedModxBank as _e,slotDisplayName as le,slotGridLabel as he,slotIsEmpty as K,slotNameSourceLabel as ke,soundRefFromSlot as fe,withModxBankName as vt,withModxClearedBanks as bt,withModxClearedOrganized as ht,withModxGroupEntry as xe,withModxGroupLabel as kt,withModxOrganizedDisplayName as ft,withModxOrganizedPage as Ce,withModxPageName as xt,withModxProfileOverride as Ct,withModxSelectedBank as ze,withModxSelectedGroup as Me,withModxSelectedPage as Mt,withModxSettings as yt,withModxSlotCustomName as St,withModxTargetKey as Nt,withModxView as Pt}from"../core/modx/model.js";import{clearModxLastBank as Ot,captureModxLiveSet as wt,modxCandidateDevices as At,readModxAllNames as Dt,readModxPageNames as Lt,resetModxRoutingState as ye,sendModxOrganized as Se,sendModxSlot as Ne,stopAllModxWork as Et,stopModxCapture as Xe,stopModxNameRead as Be}from"../core/modx/engine.js";function Ke(a=m.value,s=0,o=Ee.value.devices){return gt(a,o,s,Re(pe.value,s))}function Z(a){nt(a),a&&at(a,"muted")}function Rt(){return st().shortText}function G({code:a,name:s,badge:o="",selected:c=!1,used:l=!0,className:e="",onTap:i,onLongPress:d,title:f=""}){const $=De(0),u=De(null),h=()=>{clearTimeout($.current),$.current=0},M=r=>{if(!(r.pointerType==="mouse"&&r.button!==0)){h(),u.current={x:r.clientX,y:r.clientY,long:!1,pointerId:r.pointerId},d&&($.current=setTimeout(()=>{const n=u.current;n&&(n.long=!0,ue(30),d())},450));try{r.currentTarget.setPointerCapture(r.pointerId)}catch{}}},x=r=>{const n=u.current;n&&(Math.abs(r.clientX-n.x)>9||Math.abs(r.clientY-n.y)>9)&&(n.moved=!0,h())},v=r=>{h();const n=u.current;if(u.current=null,!(!n||n.moved)){try{r.currentTarget.releasePointerCapture(n.pointerId)}catch{}n.long||i==null||i()}},p=()=>{h(),u.current=null};return t`
    <div
      class=${`modx-tile${l?" used":" empty"}${c?" selected":""}${e?` ${e}`:""}`}
      role="button"
      tabindex="0"
      title=${f||s||a}
      onPointerDown=${M}
      onPointerMove=${x}
      onPointerUp=${v}
      onPointerCancel=${p}
      onContextMenu=${r=>{r.preventDefault(),l&&d&&d()}}
      onKeyDown=${r=>{(r.key==="Enter"||r.key===" ")&&(r.preventDefault(),i==null||i())}}
    >
      <span class="modx-tile-code">${a}</span>
      ${o&&l?t`<span class="modx-tile-badge">${o}</span>`:null}
      <span class="modx-tile-name">${s||"\u7A7A"}</span>
    </div>
  `}function W({page:a,columns:s=4,count:o=me,onPage:c}){return t`
    <div class=${`modx-page-grid${s===4?" four":""}`}>
      ${Array.from({length:o},(l,e)=>t`
        <button
          type="button"
          class=${`sound-page-btn${e===a?" selected":""}`}
          onClick=${()=>c(e)}
        >${e+1}</button>
      `)}
    </div>
  `}function ne({label:a,value:s,min:o,max:c,step:l=1,display:e,onChange:i}){const d=f=>Math.max(o,Math.min(c,f));return t`
    <div class="modx-stepper-row">
      <span class="modx-stepper-label">${a}</span>
      <div class="chain-number-controls">
        <button
          type="button"
          class="stepper-btn"
          disabled=${s<=o}
          onClick=${()=>i(d(s-l))}
        >−</button>
        <span class="stepper-value chain-number-value">${e?e(s):s}</span>
        <button
          type="button"
          class="stepper-btn"
          disabled=${s>=c}
          onClick=${()=>i(d(s+l))}
        >＋</button>
      </div>
    </div>
  `}function Tt({value:a,onChange:s}){return t`
    <div class="mixer-channel-stepper sound-channel-stepper">
      <button
        type="button"
        class="stepper-btn"
        disabled=${a<=0}
        onClick=${()=>s(a-1)}
      >−</button>
      <span class="stepper-value">${a+1}</span>
      <button
        type="button"
        class="stepper-btn"
        disabled=${a>=15}
        onClick=${()=>s(a+1)}
      >＋</button>
    </div>
  `}function It({view:a,onView:s}){return t`
    <div class="modx-view-switch">
      <${N}
        label="Live Set"
        selected=${a==="LIVE_SET"}
        onClick=${()=>s("LIVE_SET")}
      />
      <${N}
        label="音色整理"
        selected=${a==="ORGANIZED"}
        onClick=${()=>s("ORGANIZED")}
      />
    </div>
  `}function Ge({state:a,runtime:s,onStopCapture:o,onStopNames:c}){if(s.capturing){const l=s.captureExpected>0?Math.min(1,s.captureReceived/s.captureExpected):0;return t`
      <div class="modx-progress">
        <div class="modx-progress-bar"><span style=${{width:`${l*100}%`}}></span></div>
        <p class="hint">
          读取 ${s.captureReceived}/${s.captureExpected} 字节 ·
          ${s.capturePackets} 包 · 校验错误 ${s.captureChecksumErrors}
        </p>
        <p class="hint modx-ellipsis">最后地址：${s.captureLastAddress||"\u2014"}</p>
        <${C} label="停止读取" onClick=${o} />
      </div>
    `}if(s.readingNames){const l=s.nameReadTotal>0?Math.min(1,s.nameReadDone/s.nameReadTotal):0;return t`
      <div class="modx-progress">
        <div class="modx-progress-bar"><span style=${{width:`${l*100}%`}}></span></div>
        <p class="hint">
          读名 ${s.nameReadDone}/${s.nameReadTotal} ·
          找到 ${s.nameReadFound}
        </p>
        ${s.nameReadCurrent?t`<p class="hint accent modx-ellipsis">正在读：${s.nameReadCurrent}</p>`:null}
        <${C} label="停止读名" onClick=${c} />
      </div>
    `}return s.message?t`<p class="hint modx-message" title=${s.message}>${s.message}</p>`:null}function _t({title:a,initial:s,maxLength:o,onClose:c,onConfirm:l}){const[e,i]=b(s||"");return t`
    <${E} title=${a} onClose=${c}>
      <div class="modx-rename-dialog">
        <label class="chain-field">
          <span>名称</span>
          <input
            type="text"
            maxlength=${o}
            value=${e}
            onInput=${d=>i(d.currentTarget.value.slice(0,o))}
          />
        </label>
        <div class="chain-dialog-actions">
          <${C} label="取消" onClick=${c} />
          <${C}
            label="保存"
            onClick=${()=>{l(e),c()}}
          />
        </div>
      </div>
    <//>
  `}function zt({pane:a=0,onClose:s,onOpenCapture:o}){const c=m.value,l=c.settings,e=Re(pe.value,a),i=e||l.targetKey,d=Ke(c,a),f=be(c,d),$=At(),[u,h]=b(!1),[M,x]=b(!1),v=(n,S=!1)=>{y(yt(m.value,n)),S&&ye()},p=n=>{a<=0?y(Nt(m.value,n)):lt(ot(pe.value,a,{modxTargetKey:n})),ye()},r=n=>{y(Ct(m.value,n)),ye()};return t`
    <${E}
      title=${a>0?`\u97F3\u8272\u9009\u62E9 ${a+1} \xB7 MODX \u8BBE\u7F6E`:"MODX \u8BBE\u7F6E"}
      onClose=${s}
    >
      <div class="sound-settings modx-settings">
        <h3 class="section-title">发送到（这个窗格只发这一台琴）</h3>
        <p class="hint">
          ${a>0?"\u8DDF\u968F\u5168\u5C40 = \u4F7F\u7528 MODX \u8BBE\u7F6E\u91CC\u7684\u76EE\u6807\uFF1B\u5168\u5C40\u6CA1\u8BBE\u65F6\uFF0C\u7A97\u683C 1/2/3 \u4F9D\u6B21\u7528\u7B2C 1/2/3 \u53F0 MODX\u3002\u4E5F\u53EF\u4EE5\u53EA\u7ED9\u8FD9\u4E2A\u7A97\u683C\u5355\u72EC\u9009\u4E00\u53F0\u3002":"\u81EA\u52A8 = \u4F18\u5148\u9009\u7B2C\u4E00\u53F0 MODX / MONTAGE\uFF1B\u4E5F\u53EF\u4EE5\u624B\u52A8\u9009\u4EFB\u610F MIDI \u8BBE\u5907\uFF08\u6D4B\u8BD5\u7528\uFF09\u3002"}
        </p>
        <div class="sound-target-list">
          <${N}
            label=${a>0?"\u8DDF\u968F\u5168\u5C40":"\u81EA\u52A8"}
            selected=${a>0?!e:!l.targetKey}
            onClick=${()=>p("")}
          />
          ${$.map(n=>t`
            <${N}
              label=${`${n.displayName}${rt(n)?" \xB7 MODX":" \xB7 \u672A\u8BC6\u522B"}`}
              selected=${i===n.key}
              title=${n.outputName||n.displayName}
              onClick=${()=>p(n.key)}
            />
          `)}
        </div>
        ${$.length===0?t`<p class="hint danger">未连接 MIDI 琴。</p>`:null}
        ${i&&!d?t`<p class="hint danger">上次选择的琴当前未连接，请重新选择。</p>`:null}
        <p class="hint">当前型号：${(f==null?void 0:f.label)||"\u672A\u8BC6\u522B\uFF08\u8BF7\u5728\u4E0B\u9762\u9009\u62E9\u578B\u53F7\uFF09"}</p>

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">型号</h3>
        <p class="hint">自动按设备名识别；识别错误时手动选择。</p>
        <div class="modx-chip-wrap">
          <${N} label="自动识别" selected=${!l.profileOverride} onClick=${()=>r("")} />
          ${dt.map(n=>t`
            <${N}
              label=${n.label+(n.name==="MONTAGE"?"\uFF08\u672A\u771F\u673A\u9A8C\u8BC1\uFF09":"")}
              selected=${l.profileOverride===n.name}
              onClick=${()=>r(n.name)}
            />
          `)}
        </div>

        <${ne}
          label="设备号"
          value=${l.deviceNumber}
          min=${1}
          max=${16}
          onChange=${n=>v({deviceNumber:n})}
        />
        <${ne}
          label="MIDI 端口（MONTAGE M 0–3）"
          value=${l.portIndex}
          min=${0}
          max=${3}
          onChange=${n=>v({portIndex:n},!0)}
        />
        <h3 class="section-title">Control 通道</h3>
        <p class="hint">MODX 的 MIDI IN 通道要和这里一致，默认 Ch1。</p>
        <${Tt}
          value=${l.controlChannel}
          onChange=${n=>v({controlChannel:n})}
        />

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">发送</h3>
        <div class="modx-chip-wrap">
          <${N}
            label="点按即发"
            selected=${l.immediateSend}
            onClick=${()=>v({immediateSend:!0})}
          />
          <${N}
            label="预选后发送"
            selected=${!l.immediateSend}
            onClick=${()=>v({immediateSend:!1})}
          />
        </div>
        <div class="modx-chip-wrap">
          <${N}
            label="跨库自动切库"
            selected=${l.crossBankSwitch}
            onClick=${()=>v({crossBankSwitch:!0})}
          />
          <${N}
            label="不自动切库"
            selected=${!l.crossBankSwitch}
            onClick=${()=>v({crossBankSwitch:!1})}
          />
        </div>
        <p class="hint">
          跨库切库是未公开 SysEx；固件不匹配时可能提示 illegal dump data，
          可改成不自动切库，先在琴上手动切库。
        </p>
        <${ne}
          label="切库等待"
          value=${l.bankWaitMs}
          min=${0}
          max=${2e3}
          step=${100}
          display=${n=>`${n} ms`}
          onChange=${n=>v({bankWaitMs:n})}
        />
        <${ne}
          label="选槽消息间隔"
          value=${l.sendGapMs}
          min=${0}
          max=${200}
          step=${10}
          display=${n=>`${n} ms`}
          onChange=${n=>v({sendGapMs:n})}
        />
        <${C} label="清除切库记录" onClick=${()=>Ot()} />

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">读取</h3>
        <div class="modx-chip-wrap">
          <${N}
            label="抓取后自动读本页名"
            selected=${l.autoReadPageNames}
            onClick=${()=>v({autoReadPageNames:!0})}
          />
          <${N}
            label="不自动读"
            selected=${!l.autoReadPageNames}
            onClick=${()=>v({autoReadPageNames:!1})}
          />
        </div>
        <${C} label="读取 Live Set" onClick=${o} />

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">9 个整理组名</h3>
        <p class="hint">显示在音色整理底部的组按钮上；留空使用默认分类名。</p>
        <div class="sound-label-list">
          ${Array.from({length:ee},(n,S)=>t`
            <label class="sound-label-row">
              <span>组 ${S+1}</span>
              <input
                type="text"
                maxlength="8"
                value=${l.groupLabels[S]}
                placeholder=${Y(l,S)}
                onInput=${P=>y(kt(m.value,S,P.currentTarget.value))}
              />
            </label>
          `)}
        </div>

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">数据</h3>
        <p class="hint">
          备份会保存 MODX 音色表，安卓和网页版可以互相导入。
        </p>
        <div class="modx-chip-wrap">
          <${C} label="清空抓取的 Live Set" onClick=${()=>h(!0)} />
          <${C} label="清空音色整理" onClick=${()=>x(!0)} />
        </div>
        <p class="hint">
          琴上先设置：UTILITY → Settings → Advanced 的 Bank Select / Pgm Change 打开；
          Part 1 → Edit → Mod/Control → Receive SW 也要打开。
        </p>
      </div>
    <//>

    ${u?t`
          <${$e}
            title="清空抓取的 Live Set？"
            message="会删除 App 里读取的库名/页名/槽位；手选网格和改过的名字会保留。音色整理和音色链里的快照仍可发送。不会改动琴。"
            actions=${[{label:"\u53D6\u6D88",onClick:()=>h(!1)},{label:"\u6E05\u7A7A",danger:!0,onClick:()=>{h(!1),Et("\u6E05\u7A7A\u6570\u636E"),y(bt(m.value)),Z("MODX\uFF1A\u5DF2\u6E05\u7A7A\u8BFB\u53D6\u7684 Live Set \u6570\u636E")}}]}
          />
        `:null}
    ${M?t`
          <${$e}
            title="清空 MODX 音色整理？"
            message="只清空 9 组 × 48 格的整理内容；读取的 Live Set 数据和音色链不受影响。"
            actions=${[{label:"\u53D6\u6D88",onClick:()=>x(!1)},{label:"\u6E05\u7A7A",danger:!0,onClick:()=>{x(!1),y(ht(m.value)),Z("MODX\uFF1A\u5DF2\u6E05\u7A7A\u97F3\u8272\u6574\u7406")}}]}
          />
        `:null}
  `}function Xt({onClose:a}){const s=m.value,o=mt(s,Ee.value.devices),c=be(s,o),l=$t(c),[e,i]=b("CURRENT"),[d,f]=b(0),[$,u]=b(!1),h=async()=>{u(!0);const M=wt(l?e:"CURRENT",l?d:0);u(!1),M&&a()};return t`
    <${E} title="读取 MODX Live Set" onClose=${a}>
      <div class="modx-capture-dialog">
        <p class="hint">
          目标：<strong class=${o?"":"danger"}>${(o==null?void 0:o.displayName)||"\u672A\u8FDE\u63A5"}</strong>
        </p>
        <p class="hint">型号：${(c==null?void 0:c.label)||"\u672A\u8BC6\u522B\uFF08\u8BF7\u5728 MODX \u8BBE\u7F6E\u91CC\u9009\u62E9\uFF09"}</p>
        ${c?ut(c)?t`
                <h3 class="section-title">读取哪个库</h3>
                <div class="modx-chip-wrap">
                  <${N}
                    label=${l?"\u5F53\u524D\u5E93":"\u5F53\u524D Live Set"}
                    selected=${e==="CURRENT"}
                    onClick=${()=>i("CURRENT")}
                  />
                  ${l?t`
                        <${N}
                          label="User 库"
                          selected=${e==="USER"}
                          onClick=${()=>i("USER")}
                        />
                        <${N}
                          label="Library 库"
                          selected=${e==="LIBRARY"}
                          onClick=${()=>i("LIBRARY")}
                        />
                      `:null}
                </div>
                ${l&&(e==="USER"||e==="LIBRARY")?t`
                      <p class="hint">库号</p>
                      <div class="modx-bank-index-row">
                        ${Array.from({length:8},(M,x)=>t`
                          <${N}
                            key=${x}
                            label=${String(x+1)}
                            selected=${d===x}
                            onClick=${()=>f(x)}
                          />
                        `)}
                      </div>
                    `:null}
                <p class="hint">
                  ${l?"M \u7CFB\u5217\u6574\u5E93\u7EA6 84 KB\uFF0C\u9700\u8981\u51E0\u79D2\u5230\u51E0\u5341\u79D2\uFF1B\u8BFB\u53D6\u5B8C\u6210\u540E\u53EF\u81EA\u52A8\u8BFB\u672C\u9875 Performance \u540D\u3002":"\u539F\u7248 MODX / MONTAGE \u8BFB\u53D6\u7434\u4E0A\u5F53\u524D Live Set\uFF1B\u663E\u793A\u7684\u662F\u69FD\u540D/\u5907\u6CE8\uFF0CPerformance \u540D\u9700\u8981\u672C\u673A\u624B\u52A8\u6574\u7406\u3002"}
                </p>
                ${Q.value.message?t`<p class="hint accent">${Q.value.message}</p>`:null}
                <${C}
                  label=${$?"\u6B63\u5728\u53D1\u9001\u2026":"\u5F00\u59CB\u8BFB\u53D6"}
                  disabled=${!o||$||Q.value.capturing}
                  onClick=${h}
                />
              `:t`<p class="hint danger">${c.label} 暂不支持读取；请升级到 OS 3.00+，或只在琴上手动选槽。</p>`:t`<p class="hint danger">未识别型号。请先到「设置」里选择 MODX / MONTAGE 型号，再回来读取。</p>`}
      </div>
    <//>
  `}function Bt({onClose:a,onOpenCapture:s}){const o=m.value;return t`
    <${E} title="Live Set 库" onClose=${a}>
      <div class="modx-bank-dialog">
        ${o.banks.length===0?t`<p class="hint">还没有读取的库。</p>`:o.banks.map(c=>{const l=O(c),e=l===o.selectedBankKey;return t`
                <div class="modx-bank-row" key=${l}>
                  <div class="modx-bank-info">
                    <strong>${c.bankName||"\u672A\u547D\u540D\u5E93"}</strong>
                    <span>
                      ${te(c)} · 非空 ${ae(c)}
                      ${c.partial?" \xB7 \u53EF\u80FD\u4E0D\u5B8C\u6574":""}
                    </span>
                  </div>
                  <${C}
                    label=${e?"\u5F53\u524D":"\u9009\u62E9"}
                    disabled=${e}
                    onClick=${()=>{y(ze(m.value,l)),a()}}
                  />
                </div>
              `})}
        <div class="mixer-divider-line"></div>
        <p class="hint">
          读取新库不会覆盖其它库；同一个库再次读取会更新，并保留你改过的音色显示名。
        </p>
        <${C} label="读取新库" onClick=${s} />
      </div>
    <//>
  `}function Kt({action:a,target:s,onClose:o,onOrganize:c}){const l=m.value,e=se(l,a.bankKey),i=e?z(e,a.page,a.slot):null,[d,f]=b((i==null?void 0:i.customName)||"");if(!e||!i)return null;const $=e.kind==="MANUAL",u=()=>{d.trim()!==(i.customName||"")&&y(St(m.value,a.bankKey,a.page,a.slot,d))},h=()=>{u(),o()};return t`
    <${E} title=${`P${a.page+1}-${a.slot+1}`} onClose=${h}>
      <div class="modx-slot-dialog">
        <p class="modx-slot-name">${le(i)}</p>
        ${$?t`<p class="hint">手选槽位 · 不读取琴上的库</p>`:t`
              <p class="hint">
                ${ke(i)} · ${i.slotType===0?"Performance":`\u7C7B\u578B ${i.slotType}`}
                · Perf ${i.bankMsb}/${i.bankLsb}/${i.performanceNumber}
              </p>
              ${i.slotName&&i.performanceName&&i.slotName!==i.performanceName?t`<p class="hint">槽名：${i.slotName}</p>`:null}
            `}
        <label class="chain-field">
          <span>显示名</span>
          <input
            type="text"
            maxlength=${B}
            value=${d}
            placeholder=${le(i)}
            onInput=${M=>f(M.currentTarget.value.slice(0,B))}
          />
        </label>
        <p class="hint">
          ${$?"\u76F4\u63A5\u8F93\u5165\uFF0C\u5173\u95ED\u540E\u81EA\u52A8\u4FDD\u5B58\uFF1B\u7559\u7A7A\u6062\u590D\u9ED8\u8BA4\u5E8F\u53F7\u3002":"\u76F4\u63A5\u8F93\u5165\uFF0C\u5173\u95ED\u540E\u81EA\u52A8\u4FDD\u5B58\uFF1B\u7559\u7A7A\u6062\u590D\u7434\u4E0A\u7684\u539F\u97F3\u8272\u540D\u3002"}
        </p>
        <div class="modx-dialog-buttons">
          <${C}
            label="发送到琴"
            onClick=${()=>{u(),Ne(a.bankKey,a.page,a.slot,{target:s}),o()}}
          />
          <${C}
            label="放入音色整理"
            onClick=${()=>{u(),c(d.trim()||le(i),i),o()}}
          />
        </div>
      </div>
    <//>
  `}function Gt({ref:a,sourceLabel:s,onClose:o}){const c=m.value,l=c.settings,[e,i]=b(a?D(a):""),[d,f]=b(l.selectedGroup),[$,u]=b(l.organizedPage),[h,M]=b(null),x=v=>{y(xe(m.value,d,v,{...a,displayName:e.trim()||D(a)})),y(Ce(Me(m.value,d),$)),Z(`MODX\uFF1A\u5DF2\u6574\u7406\u5230\u7EC4 ${d+1} \u9875 ${Math.floor(v/_)+1} \u683C ${v%_+1}`),o()};return a?t`
    <${E} title="放入音色整理" onClose=${o}>
      <div class="modx-organize-dialog">
        <p class="hint">${s||Ie(a)}</p>
        <label class="chain-field">
          <span>显示名</span>
          <input
            type="text"
            maxlength=${B}
            value=${e}
            onInput=${v=>i(v.currentTarget.value.slice(0,B))}
          />
        </label>
        <h3 class="section-title">放到哪个组</h3>
        <div class="modx-group-picker">
          ${Array.from({length:ee},(v,p)=>t`
            <${N}
              key=${p}
              label=${Y(l,p)}
              selected=${d===p}
              onClick=${()=>{f(p),u(0)}}
            />
          `)}
        </div>
        <${W}
          page=${$}
          count=${F}
          onPage=${u}
        />
        <div class="modx-organize-grid">
          ${Array.from({length:2},(v,p)=>Array.from({length:4},(r,n)=>{const S=p*4+n,P=$*_+S,A=T(c,d,P);return t`
                <${G}
                  key=${P}
                  code=${`${d+1}-${P+1}`}
                  name=${A?D(A):"\u7A7A"}
                  used=${!!A}
                  onTap=${()=>{A?M(P):x(P)}}
                />
              `}))}
        </div>
        <p class="hint">点一个格子放入；放在已占用的格子会先确认替换。</p>
      </div>
    <//>

    ${h!=null?t`
          <${$e}
            title="替换这个格子？"
            message=${`\u5F53\u524D\uFF1A${D(T(m.value,d,h))||"\u7A7A"}`}
            actions=${[{label:"\u53D6\u6D88",onClick:()=>M(null)},{label:"\u66FF\u6362",danger:!0,onClick:()=>{const v=h;M(null),x(v)}}]}
          />
        `:null}
  `:null}function Ut({group:a,slot:s,onClose:o,onOpenCapture:c}){const l=m.value,e=Math.floor(s/_),i=s%_,d=l.banks,f=d.some(p=>O(p)===l.selectedBankKey)?l.selectedBankKey:d[0]?O(d[0]):"",[$,u]=b(f),[h,M]=b(l.selectedPage),x=se(l,$)||d[0]||null,v=p=>{y(xe(m.value,a,s,{...p,displayName:D(p)})),y(Ce(Me(m.value,a),e)),Z(`MODX\uFF1A\u5DF2\u653E\u5165 \u7EC4 ${a+1} \u7B2C ${e+1} \u9875 \u7B2C ${i+1} \u683C`),o()};return t`
    <${E} title="从 Live Set 选择音色" onClose=${o}>
      <div class="modx-place-dialog">
        <p class="hint accent">
          放入 组 ${a+1} · 第 ${e+1} 页 · 第 ${i+1} 格
        </p>
        <p class="hint">也可以继续用原来的方式：在 Live Set 长按音色槽 → 放入音色整理。</p>
        ${x?t`
              ${d.length>1?t`
                    <div class="modx-chip-wrap">
                      ${d.map(p=>t`
                        <${N}
                          key=${O(p)}
                          label=${p.bankName||"\u672A\u547D\u540D\u5E93"}
                          selected=${O(p)===$}
                          onClick=${()=>{u(O(p)),M(0)}}
                        />
                      `)}
                    </div>
                  `:null}
              <p class="hint modx-ellipsis">
                ${te(x)} · 非空 ${ae(x)} ·
                ${ge(x,h)}
              </p>
              <${W} page=${h} onPage=${M} />
              <div class="modx-live-grid">
                ${Array.from({length:16},(p,r)=>{const n=z(x,h,r),S=n&&!K(n);return t`
                    <${G}
                      key=${r}
                      code=${String(r+1)}
                      name=${S?he(n):"\u7A7A"}
                      used=${S}
                      onTap=${()=>{S&&v(fe(x,n))}}
                    />
                  `})}
              </div>
              <p class="hint">点一个音色放入这个格子；空槽不能选。</p>
            `:t`
              <p class="hint danger">
                还没有读取 Live Set。先连接 MODX / MONTAGE，读取琴上的音色后再选。
              </p>
              <div class="modx-dialog-buttons">
                <${C} label="读取 Live Set" onClick=${c} />
                <${C} label="关闭" onClick=${o} />
              </div>
            `}
      </div>
    <//>
  `}function Vt({group:a,slot:s,target:o,onClose:c}){const l=m.value,e=T(l,a,s),[i,d]=b((e==null?void 0:e.displayName)||"");if(!e)return null;const f=()=>{i.trim()!==(e.displayName||"")&&y(ft(m.value,a,s,i))};return t`
    <${E} title="音色整理" onClose=${()=>{f(),c()}}>
      <div class="modx-slot-dialog">
        <p class="modx-slot-name">${D(e)}</p>
        <p class="hint">${Ie(e)}</p>
        <label class="chain-field">
          <span>显示名</span>
          <input
            type="text"
            maxlength=${B}
            value=${i}
            placeholder=${D(e)}
            onInput=${u=>d(u.currentTarget.value.slice(0,B))}
          />
        </label>
        <p class="hint">直接输入，关闭后自动保存；留空恢复原音色名。</p>
        <div class="modx-dialog-buttons">
          <${C}
            label="发送到琴"
            onClick=${()=>{f(),Se(a,s,{target:o}),c()}}
          />
          <${C}
            label="移除"
            onClick=${()=>{y(xe(m.value,a,s,null)),Z("MODX\uFF1A\u5DF2\u4ECE\u97F3\u8272\u6574\u7406\u79FB\u9664"),c()}}
          />
        </div>
      </div>
    <//>
  `}function aa({embedded:a=!1,pane:s=0}){const o=m.value,c=Q.value,l=o.settings,e=_e(o),i=Ke(o,s),d=be(o,i),f=l.view,$=l.selectedGroup,u=o.selectedPage,h=l.organizedPage,[M,x]=b(-1),[v,p]=b(-1),[r,n]=b(!1),[S,P]=b(!1),[A,L]=b(!1),[U,oe]=b(null),[Pe,Oe]=b(null),[Ue,Ve]=b(""),[ie,we]=b(null),[ce,H]=b(null),[R,de]=b(null);J(()=>{const g=Te(m.value);g!==m.value&&y(g)},[]),J(()=>{x(-1)},[o.selectedBankKey,o.selectedPage]),J(()=>{p(-1)},[$,h]);const Fe=g=>y(Pt(m.value,g)),Ft=g=>y(ze(m.value,g)),Ye=g=>y(Mt(m.value,g)),Ze=g=>y(Me(m.value,g)),We=g=>y(Ce(m.value,g)),re=e?z(e,u,M):null,j=re&&!K(re)?le(re):null,q=T(o,$,v),Ae=ve(o)===0,He=g=>{ue(),x(g);const k=z(e,u,g);k&&!K(k)&&l.immediateSend&&Ne(O(e),u,g,{target:i})},je=g=>{if(!T(o,$,g)){H({group:$,slot:g});return}ue(),p(g),l.immediateSend&&Se($,g,{target:i})},qe=(g,k)=>{const w=z(e,g,k);!w||K(w)||oe({bankKey:O(e),page:g,slot:k})},Je=g=>{T(o,$,g)&&we({group:$,slot:g})};return t`
    <div class="sub-screen sound-screen modx-screen">
      <div class="sound-header modx-header">
        ${a?null:t`<button type="button" class="back-btn" onClick=${()=>Le("transpose")}>‹ 返回</button>`}
        <div class="sound-heading">
          <h1>音色选择 ${s+1} · MODX</h1>
          <p class=${i?"":"danger"}>
            ${(i==null?void 0:i.displayName)||"\u672A\u8FDE\u63A5"} · ${(d==null?void 0:d.label)||"\u672A\u8BC6\u522B\u578B\u53F7"} ·
            Control CH ${l.controlChannel+1} · ${Rt()}
          </p>
        </div>
        <div class="sound-header-actions">
          <${tt} pane=${s} mode="MODX" />
          <${C}
            label="音色链"
            onClick=${()=>{Le(et(s))}}
          />
          <${C} label="设置" onClick=${()=>n(!0)} />
        </div>
      </div>

      <div class="modx-view-row">
        <${It} view=${f} onView=${Fe} />
        <span class="modx-view-hint">
          ${f==="LIVE_SET"?`${(e==null?void 0:e.bankName)||"\u672A\u547D\u540D\u5E93"} \xB7 \u975E\u7A7A ${e?ae(e):0}`:`\u7EC4 ${$+1} \xB7 \u7B2C ${h+1}/${F} \u9875 \xB7 \u5DF2\u6574\u7406 ${ve(o)}`}
        </span>
      </div>

      ${f==="LIVE_SET"?t`
            <div class="modx-workspace">
              <div class="modx-main">
                <div class="modx-page-heading">
                  <button
                    type="button"
                    class="modx-page-name"
                    title="点页名可改"
                    onClick=${()=>e&&de({type:"page",bankKey:O(e),page:u,name:ge(e,u),maxLength:ct})}
                  >${e?ge(e,u):"Page"}</button>
                  <span>P${u+1}/${me} · 点页名可改</span>
                </div>
                <div class="modx-live-grid">
                  ${Array.from({length:16},(g,k)=>{const w=z(e,u,k),X=w&&!K(w);return t`
                      <${G}
                        key=${k}
                        code=${String(k+1)}
                        name=${X?he(w):"\u7A7A"}
                        badge=${X&&e.kind!=="MANUAL"?ke(w):""}
                        used=${X}
                        selected=${X&&k===M}
                        onTap=${()=>He(k)}
                        onLongPress=${()=>qe(u,k)}
                      />
                    `})}
                </div>
                ${l.immediateSend?null:t`
                      <button
                        type="button"
                        class="sound-send-bar"
                        disabled=${!j}
                        onClick=${()=>{j&&Ne(O(e),u,M,{target:i})}}
                      >${j?`\u53D1\u9001 P${u+1}-${M+1} ${j}`:"\u5148\u9009\u62E9\u4E00\u4E2A\u97F3\u8272"}</button>
                    `}
              </div>

              <div class="modx-side">
                <button
                  type="button"
                  class="modx-bank-name"
                  title="点库名可改"
                  onClick=${()=>e&&de({type:"bank",bankKey:O(e),name:e.bankName,maxLength:it})}
                >${(e==null?void 0:e.bankName)||"\u672A\u547D\u540D\u5E93"}</button>
                <p class="hint modx-ellipsis">
                  ${e?te(e):""} · 非空 ${e?ae(e):0}
                  ${e!=null&&e.partial?" \xB7 \u53EF\u80FD\u4E0D\u5B8C\u6574":""}
                </p>
                ${(e==null?void 0:e.kind)==="MANUAL"?t`
                      <p class="hint accent">
                        不用读取也能用：点格直接选琴上当前库的页/槽，长按可改名；
                        名字默认是 页-槽 序号。
                      </p>
                    `:null}
                <div class="modx-side-actions">
                  <${C} label="切换库" onClick=${()=>L(!0)} />
                  <${C}
                    label="读取 Live Set"
                    disabled=${c.capturing||c.readingNames||c.sending}
                    onClick=${()=>P(!0)}
                  />
                </div>
                ${pt(d)&&(e==null?void 0:e.kind)!=="MANUAL"?t`
                      <div class="modx-side-actions">
                        <${C}
                          label="读本页名"
                          disabled=${c.capturing||c.readingNames||c.sending}
                          onClick=${()=>Lt()}
                        />
                        <${C}
                          label="读全部名"
                          disabled=${c.capturing||c.readingNames||c.sending}
                          onClick=${()=>Dt()}
                        />
                      </div>
                    `:null}
                <${W}
                  page=${u}
                  count=${me}
                  onPage=${Ye}
                />
                <${Ge}
                  state=${o}
                  runtime=${c}
                  onStopCapture=${()=>Xe()}
                  onStopNames=${()=>Be()}
                />
              </div>
            </div>
          `:t`
            <div class="modx-workspace modx-organized-workspace">
              <div class="modx-main">
                <p class="hint ${Ae?"accent":""} modx-ellipsis">
                  ${Ae?"\u97F3\u8272\u6574\u7406\u8FD8\u662F\u7A7A\u7684 \xB7 \u70B9\u7A7A\u683C\u4ECE Live Set \u9009\u97F3\u8272\u653E\u5165":`\u7EC4 ${$+1} \xB7 \u7B2C ${h+1}/${F} \u9875 \xB7 \u70B9\u683C\u53D1\u9001\uFF0C\u957F\u6309\u97F3\u8272\u7F16\u8F91\uFF0C\u70B9/\u957F\u6309\u7A7A\u683C\u653E\u5165`}
                </p>
                <div class="modx-organize-grid">
                  ${Array.from({length:2},(g,k)=>Array.from({length:4},(w,X)=>{const Qe=k*4+X,I=h*_+Qe,V=T(o,$,I);return t`
                        <${G}
                          key=${I}
                          code=${`${$+1}-${I+1}`}
                          name=${V?D(V):"\u7A7A"}
                          used=${!!V}
                          selected=${!!V&&I===v}
                          onTap=${()=>je(I)}
                          onLongPress=${()=>{V?Je(I):H({group:$,slot:I})}}
                        />
                      `}))}
                </div>
                ${l.immediateSend?null:t`
                      <button
                        type="button"
                        class="sound-send-bar"
                        disabled=${!q}
                        onClick=${()=>{q&&Se($,v,{target:i})}}
                      >${q?`\u53D1\u9001 ${D(q)}`:"\u5148\u9009\u62E9\u4E00\u4E2A\u97F3\u8272"}</button>
                    `}
              </div>

              <div class="modx-side modx-organized-side">
                <p class="hint">选择整理页</p>
                <div class="sound-pages modx-organized-pages">
                  ${Array.from({length:F},(g,k)=>t`
                    <button
                      type="button"
                      class=${`sound-page-btn${k===h?" selected":""}`}
                      onClick=${()=>We(k)}
                    >P${k+1}</button>
                  `)}
                </div>
                <${Ge}
                  state=${o}
                  runtime=${c}
                  onStopCapture=${()=>Xe()}
                  onStopNames=${()=>Be()}
                />
              </div>
            </div>
            <div class="modx-group-row">
              <div class="modx-groups">
                ${Array.from({length:ee},(g,k)=>t`
                  <button
                    type="button"
                    class=${`sound-group-btn${k===$?" selected":""}`}
                    title=${Y(l,k)}
                    onClick=${()=>Ze(k)}
                  >${Y(l,k)}</button>
                `)}
              </div>
              <${C} label="组名" onClick=${()=>n(!0)} />
            </div>
          `}

      ${r?t`
            <${zt}
              pane=${s}
              onClose=${()=>n(!1)}
              onOpenCapture=${()=>{n(!1),P(!0)}}
            />
          `:null}

      ${S?t`
            <${Xt}
              onClose=${()=>P(!1)}
            />
          `:null}

      ${A?t`
            <${Bt}
              onClose=${()=>L(!1)}
              onOpenCapture=${()=>{L(!1),P(!0)}}
            />
          `:null}

      ${U?t`
            <${Kt}
              action=${U}
              target=${i}
              onClose=${()=>oe(null)}
              onOrganize=${(g,k)=>{const w=se(m.value,U.bankKey);!w||!k||(Oe(fe(w,k,g)),Ve(`Live Set P${U.page+1}-${U.slot+1}`),oe(null))}}
            />
          `:null}

      ${Pe?t`
            <${Gt}
              ref=${Pe}
              sourceLabel=${Ue}
              onClose=${()=>Oe(null)}
            />
          `:null}

      ${ie?t`
            <${Vt}
              group=${ie.group}
              slot=${ie.slot}
              target=${i}
              onClose=${()=>we(null)}
            />
          `:null}

      ${ce?t`
            <${Ut}
              group=${ce.group}
              slot=${ce.slot}
              onClose=${()=>H(null)}
              onOpenCapture=${()=>{H(null),P(!0)}}
            />
          `:null}

      ${R?t`
            <${_t}
              title=${R.type==="bank"?"\u6539 Live Set \u5E93\u540D":"\u6539\u9875\u540D"}
              initial=${R.name}
              maxLength=${R.maxLength}
              onClose=${()=>de(null)}
              onConfirm=${g=>{R.type==="bank"?y(vt(m.value,R.bankKey,g)):y(xt(m.value,R.bankKey,R.page,g))}}
            />
          `:null}
    </div>
  `}function sa({onClose:a,onPick:s}){const o=m.value,c=o.settings;J(()=>{const p=Te(m.value);p!==m.value&&y(p)},[]);const[l,e]=b(0),[i,d]=b(c.selectedGroup),[f,$]=b(c.organizedPage),[u,h]=b(o.selectedBankKey),[M,x]=b(o.selectedPage),v=se(o,u)||_e(o);return t`
    <${E} title="选择 MODX 音色" onClose=${a}>
      <div class="modx-chain-picker">
        <div class="modx-chip-wrap">
          <${N} label="音色整理" selected=${l===0} onClick=${()=>e(0)} />
          <${N} label="Live Set" selected=${l===1} onClick=${()=>e(1)} />
        </div>

        ${l===0?ve(o)===0?t`
                <p class="hint">
                  还没有整理音色。先到「Live Set」长按一个槽，选「放入音色整理」。
                </p>
              `:t`
                <h3 class="section-title">组</h3>
                <div class="modx-group-picker">
                  ${Array.from({length:ee},(p,r)=>t`
                    <${N}
                      key=${r}
                      label=${Y(c,r)}
                      selected=${i===r}
                      onClick=${()=>{d(r),$(0)}}
                    />
                  `)}
                </div>
                <${W}
                  page=${f}
                  count=${F}
                  onPage=${$}
                />
                <div class="modx-organize-grid">
                  ${Array.from({length:2},(p,r)=>Array.from({length:4},(n,S)=>{const P=r*4+S,A=f*_+P,L=T(o,i,A);return t`
                        <${G}
                          key=${A}
                          code=${`${i+1}-${A+1}`}
                          name=${L?D(L):"\u7A7A"}
                          used=${!!L}
                          onTap=${()=>{L&&s(L)}}
                        />
                      `}))}
                </div>
                <p class="hint">点一个音色填入音色链。</p>
              `:t`
              <h3 class="section-title">库</h3>
              <div class="modx-chip-wrap">
                ${o.banks.map(p=>t`
                  <${N}
                    key=${O(p)}
                    label=${`${p.bankName||"\u672A\u547D\u540D\u5E93"} \xB7 ${te(p)}`}
                    selected=${O(p)===u}
                    onClick=${()=>h(O(p))}
                  />
                `)}
              </div>
              <${W} page=${M} onPage=${x} />
              <div class="modx-live-grid">
                ${Array.from({length:16},(p,r)=>{const n=z(v,M,r),S=n&&!K(n);return t`
                    <${G}
                      key=${r}
                      code=${String(r+1)}
                      name=${S?he(n):"\u7A7A"}
                      badge=${S&&v.kind!=="MANUAL"?ke(n):""}
                      used=${S}
                      onTap=${()=>{S&&s(fe(v,n))}}
                    />
                  `})}
              </div>
              <p class="hint">点一个非空槽填入音色链。</p>
            `}
      </div>
    <//>
  `}export{sa as ModxChainPickerDialog,aa as ModxPickerScreen};
