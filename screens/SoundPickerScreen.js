import{useEffect as z,useRef as G,useState as N}from"preact/hooks";import{AlertDialog as ae,AppDialog as V,Chip as B,SmallButton as M,haptic as J,html as o}from"../ui/components.js";import{navigate as Q}from"../app/router.js";import{addLog as W,consumeUse as ce,controlChannel as ee,hasUses as ue,licenseView as de,midi as $e,openDialog as pe,saveSoundPicker as k,setControlChannel as me,soundPicker as $}from"../app/store.js";import{SOUND_GROUP_COUNT as te,SOUND_NAME_MAX as fe,SOUND_PAGE_COUNT as he,SOUND_PAGE_SIZE as K,defaultGroupLabel as ge,groupLabel as se,isKorgPaLike as be,keyboardSetMessages as ve,nameAt as Se,paneSettingsFor as Z,resolveSoundTargetForPane as ye,slotLabel as X,soundSlotLink as Pe,totalUsed as Ce,usedCount as ke,withAllNamesCleared as Ae,withGroupLabel as Te,withGroupNames as Ie,withPaneImmediateSend as Ne,withPaneKorgTarget as we,withPaneSelected as H,withPaneMode as Ee,withSlotName as De}from"../core/sounds/picker.js";import{chainScreenForPane as Oe}from"../app/panes.js";import{PickerModeSwitch as Ue}from"../ui/PickerModeSwitch.js";import{mixerDeviceLists as _e}from"../core/mixer/targets.js";import{scheduleKeepAfterSoundChange as Fe,sendMessagesToDevice as Me}from"../core/midi/engine.js";import{parsePrfImport as Re}from"../core/files/zip.js";import{ModxPickerScreen as Ke}from"./ModxPickerScreen.js";import{SxPickerScreen as xe}from"./SxPickerScreen.js";function Ge({value:i,onChange:t}){return o`
    <div class="mixer-channel-stepper sound-channel-stepper">
      <button type="button" class="stepper-btn" disabled=${i<=0} onClick=${()=>t(i-1)}>−</button>
      <span class="stepper-value">${i+1}</span>
      <button type="button" class="stepper-btn" disabled=${i>=15} onClick=${()=>t(i+1)}>＋</button>
    </div>
  `}function Be({group:i,slot:t,name:a,selected:p,onClick:r,onRename:u}){const A=!!a,c=`${i+1}-${t+1}`,v=G(0),g=G(null),T=()=>{clearTimeout(v.current),v.current=0},P=n=>{if(!(n.pointerType==="mouse"&&n.button!==0)){T(),g.current={x:n.clientX,y:n.clientY,long:!1,pointerId:n.pointerId},v.current=setTimeout(()=>{const d=g.current;d&&(d.long=!0,J(30),u==null||u())},450);try{n.currentTarget.setPointerCapture(n.pointerId)}catch{}}},C=n=>{const d=g.current;d&&(Math.abs(n.clientX-d.x)>9||Math.abs(n.clientY-d.y)>9)&&(d.moved=!0,T())},O=n=>{T();const d=g.current;if(g.current=null,!(!d||d.moved)){try{n.currentTarget.releasePointerCapture(d.pointerId)}catch{}d.long||r==null||r()}},w=()=>{T(),g.current=null};return o`
    <div
      class=${`sound-tile${A?" used":" empty"}${p?" selected":""}`}
      role="button"
      tabindex="0"
      title=${a?`${a} \xB7 \u957F\u6309\u6539\u540D`:`${c} \u672A\u547D\u540D \xB7 \u70B9\u6309\u53D1\u9001\uFF0C\u957F\u6309\u6539\u540D`}
      onPointerDown=${P}
      onPointerMove=${C}
      onPointerUp=${O}
      onPointerCancel=${w}
      onContextMenu=${n=>{n.preventDefault(),u==null||u()}}
      onKeyDown=${n=>{(n.key==="Enter"||n.key===" ")&&(n.preventDefault(),r==null||r())}}
    >
      <span class="sound-tile-index">${c}</span>
      <span class="sound-tile-name">${a||"\u672A\u547D\u540D"}</span>
    </div>
  `}function Le({title:i,initial:t,maxLength:a,onClose:p,onConfirm:r}){const[u,A]=N(t||"");return o`
    <${V} title=${i} onClose=${p}>
      <div class="sx-slot-editor">
        <label class="chain-field">
          <span>显示名字</span>
          <input
            type="text"
            maxlength=${a}
            value=${u}
            placeholder="留空恢复为「用户 x-y」"
            onInput=${c=>A(c.currentTarget.value.slice(0,a))}
          />
        </label>
        <p class="hint">只改 App 里显示的格名，不会改动琴上的音色。</p>
        <div class="chain-dialog-actions">
          <${M} label="取消" onClick=${p} />
          <${M}
            label="保存"
            onClick=${()=>{r(u),p()}}
          />
        </div>
      </div>
    <//>
  `}function Ye({pane:i=0,picker:t,target:a,devices:p,onClose:r,onSendMode:u,onTarget:A,onControlChannel:c,onGroupLabel:v,onImportFiles:g,onImportFolderFiles:T,onClearRequest:P,scrollToImport:C=!1}){const O=Z(t,i),w=O.korgTargetKey,x=!!w&&!a,n=Ce(t),d=G(null),I=G(null),R=navigator.userAgent,E=/Android/i.test(R),L=/iPad|iPhone|iPod/.test(R)||navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1,U=Number((R.match(/(?:Chrome|CriOS)\/(\d+)/)||[])[1]||0),D="webkitdirectory"in document.createElement("input")&&(!E||U>=132),_=D?"":E?`\u5F53\u524D\u5B89\u5353\u6D4F\u89C8\u5668${U?`\uFF08Chrome ${U}\uFF09`:""}\u4E0D\u652F\u6301\u76F4\u63A5\u9009\u6587\u4EF6\u5939\uFF0C\u9700\u8981 Chrome 132 \u6216\u66F4\u65B0\u7248\u672C\u3002\u8BF7\u5148\u7528\u300C\u9009\u62E9\u6587\u4EF6\u300D\u8FDB\u5165 KEYBOARDSET \u6587\u4EF6\u5939\uFF0C\u591A\u9009 USER01.PRF\u2013USER09.PRF\uFF1B\u6216\u628A\u6587\u4EF6\u5939\u538B\u7F29\u6210 ZIP \u518D\u5BFC\u5165\u3002`:L?"\u5F53\u524D iOS \u7248\u672C\u4E0D\u652F\u6301\u76F4\u63A5\u9009\u6587\u4EF6\u5939\uFF08\u9700\u8981 iOS 18.4 \u6216\u66F4\u65B0\u7248\u672C\uFF09\u3002\u8BF7\u7528 ZIP \u6216\u591A\u9009 PRF \u6587\u4EF6\u5BFC\u5165\u3002":"\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u76F4\u63A5\u9009\u6587\u4EF6\u5939\u3002\u8BF7\u7528 ZIP \u6216\u591A\u9009 PRF \u6587\u4EF6\u5BFC\u5165\u3002";return z(()=>{const l=d.current;l&&(l.setAttribute("webkitdirectory",""),l.setAttribute("directory",""))},[]),z(()=>{if(!C)return;const l=requestAnimationFrame(()=>{var S;(S=I.current)==null||S.scrollIntoView({block:"start",behavior:"smooth"})});return()=>cancelAnimationFrame(l)},[C]),o`
    <${V}
      title=${i>0?`\u97F3\u8272\u9009\u62E9 ${i+1} \u8BBE\u7F6E`:"\u97F3\u8272\u9009\u62E9\u8BBE\u7F6E"}
      onClose=${r}
    >
      <div class="sound-settings">
        <p class="hint">
          窗格 ${i+1} 的发送目标独立保存。三台琴可以各开一个「音色选择」窗格，分别选不同琴。
        </p>
        <h3 class="section-title">发送方式</h3>
        <div class="chip-row">
          <${B} label="点按即发" selected=${O.immediateSend} onClick=${()=>u(!0)} />
          <${B} label="预选后发送" selected=${!O.immediateSend} onClick=${()=>u(!1)} />
        </div>
        <p class="hint">预选模式：先点音色选中，再按底部的「发送」。</p>

        <div class="mixer-divider-line"></div>

        <h3 class="section-title">发送到</h3>
        <p class="hint">
          这个窗格只发到所选的一台琴。自动 = 优先 PA700/PA1000；
          窗格 1/2/3 会依次用第 1/2/3 台 PA，琴更少时重复用最后一台。
        </p>
        <div class="sound-target-list">
          <${B} label="自动" selected=${w===""} onClick=${()=>A("")} />
          ${p.map(l=>o`
            <${B}
              label=${`${l.displayName}${be(l)?" \xB7 PA":""}`}
              selected=${w===l.key}
              title=${l.outputName||l.displayName}
              onClick=${()=>A(l.key)}
            />
          `)}
        </div>
        ${p.length===0?o`<p class="hint danger">未连接 MIDI 琴。</p>`:null}
        ${x?o`<p class="hint danger">上次选择的琴当前未连接，请重新选择。</p>`:null}

        <div class="mixer-divider-line"></div>

        <h3 class="section-title">Control 通道</h3>
        <p class="hint">与歌单、音色链共用；琴上的 MIDI IN Control 通道要一致。</p>
        <${Ge} value=${ee.value} onChange=${c} />

        <div class="mixer-divider-line"></div>

        <h3 class="section-title">组名缩写</h3>
        <p class="hint">
          显示在底部 9 个组按钮上；留空则使用默认分类名（Piano、Organ、Guitar、String、Brass、Trumpet、Sax、Synth、Ethnic）。
        </p>
        <div class="sound-label-list">
          ${Array.from({length:te},(l,S)=>o`
            <label class="sound-label-row">
              <span>组 ${S+1}</span>
              <input
                type="text"
                maxlength="8"
                value=${t.settings.groupLabels[S]}
                placeholder=${ge(S)}
                onInput=${Y=>v(S,Y.currentTarget.value)}
              />
            </label>
          `)}
        </div>

        <div class="mixer-divider-line"></div>

        <h3 class="section-title" ref=${I}>导入音色表</h3>
        <p class="hint">
          在琴上 Media › Save，勾选 Keyboard Sets，导出到 U 盘；把 U 盘或 KEYBOARDSET 文件夹拷到设备上。
          选择 ZIP 或 USER01.PRF–USER09.PRF 文件；也可以直接选择 KEYBOARDSET 文件夹。
          只读名字和位置，不会改动琴。
        </p>
        <div class="sound-import-actions">
          <label class="small-btn file-pick-btn">
            选择文件（ZIP / PRF，可多选）
            <input
              type="file"
              multiple
              onChange=${g}
            />
          </label>
          ${D?o`
                <label class="small-btn file-pick-btn">
                  选择 KEYBOARDSET 文件夹
                  <input
                    ref=${d}
                    type="file"
                    multiple
                    webkitdirectory=${!0}
                    directory=${!0}
                    onChange=${T}
                  />
                </label>
              `:null}
        </div>
        ${_?o`<p class="hint danger">${_}</p>`:null}
        ${E&&D?o`<p class="hint">如果安卓文件选择器里没有文件夹选项，请进入 KEYBOARDSET 文件夹后全选 PRF，或压缩成 ZIP 再导入。</p>`:null}
        <p class="hint accent">当前已导入 ${n} 个音色名字。</p>

        <div class="mixer-divider-line"></div>
        <${M} label="清空所有音色名字" onClick=${P} />
      </div>
    <//>
  `}function it({embedded:i=!1,pane:t=0}){const a=Z($.value,t).mode;return a==="MODX"?o`<${Ke} embedded=${i} pane=${t} />`:a==="SX"?o`<${xe} embedded=${i} pane=${t} />`:o`<${je} embedded=${i} pane=${t} />`}function je({embedded:i=!1,pane:t=0}){const a=$.value,p=Z(a,t),r=p.selectedGroup,u=p.selectedPage,A=_e().midiDevices,c=ye($.value,$e.value.devices,t),v=ee.value,g=de().shortText,T=a.groups[r],[P,C]=N(-1),[O,w]=N(""),[x,n]=N(!1),[d,I]=N(!1),[R,E]=N(!1),[L,U]=N(!1),[h,D]=N(null),_=P>=0?X(a,r,u*K+P):null,l=e=>{w(e),e&&W(e,"muted")},S=async e=>{const s=u*K+e,m=X(a,r,s);if(!c){l("\u97F3\u8272\u9009\u62E9\uFF1A\u672A\u8FDE\u63A5\u6240\u9009\u7684\u7434\uFF0C\u8BF7\u5728\u8BBE\u7F6E\u91CC\u9009\u62E9");return}if(!ue(1)){pe("paywall");return}const f=Pe(r,s,m);if(!await Me(c,ve(v,f)).catch(()=>0)){l(`\u97F3\u8272\u9009\u62E9\uFF1A\u53D1\u9001\u5931\u8D25\uFF1A${c.displayName}`);return}ce(1),Fe("\u97F3\u8272\u9009\u62E9"),l(`\u97F3\u8272\u9009\u62E9\uFF1A${m}\uFF08\u7528\u6237 ${r+1}-${s+1} \xB7 ${c.displayName} \xB7 Control CH ${v+1}\uFF09`)},Y=e=>{J(),C(e),p.immediateSend&&S(e)},ne=e=>{C(-1),k(H($.value,t,r,e))},le=e=>{C(-1),k(H($.value,t,e,0))},q=async e=>{const s=Array.from(e||[]).filter(m=>/\.(zip|prf)$/i.test(m.name));if(!s.length){l("\u97F3\u8272\u9009\u62E9\uFF1A\u8BF7\u9009\u62E9 .zip\u3001.prf \u6216 KEYBOARDSET \u6587\u4EF6\u5939");return}U(!0),l("\u97F3\u8272\u9009\u62E9\uFF1A\u6B63\u5728\u8BFB\u53D6\u6587\u4EF6\u2026");try{const m=[];for(const b of s){const j=new Uint8Array(await b.arrayBuffer());m.push({name:b.name,bytes:j})}const f=Re(m);if(!f.records){const b=f.rejected.slice(0,3).join("\u3001");l(`\u97F3\u8272\u9009\u62E9\uFF1A\u5BFC\u5165\u5931\u8D25${b?`\uFF08${b}\uFF09`:""}`);return}let y=$.value;for(const[b,j]of Object.entries(f.banks))y=Ie(y,Number(b)-1,j);if(!ke($.value,r)){const b=Math.min(...Object.keys(f.banks).map(Number));y=H(y,t,b-1,0)}k(y);const F=f.rejected.length?` \xB7 \u8DF3\u8FC7 ${f.rejected.length} \u4E2A\u6587\u4EF6`:"";l(`\u97F3\u8272\u9009\u62E9\uFF1A\u5DF2\u5BFC\u5165 ${f.records} \u4E2A\u97F3\u8272\uFF08${f.pages} \u9875\uFF09${F}`),f.rejected.slice(0,3).forEach(b=>W(`\u97F3\u8272\u9009\u62E9\u5BFC\u5165\u8DF3\u8FC7\uFF1A${b}`,"warn"))}catch(m){l(`\u97F3\u8272\u9009\u62E9\uFF1A\u5BFC\u5165\u5931\u8D25\uFF08${(m==null?void 0:m.message)||m}\uFF09`)}finally{U(!1)}},oe=async e=>{const s=Array.from(e.currentTarget.files||[]);e.currentTarget.value="",n(!1),I(!1),await q(s)},re=async e=>{const s=Array.from(e.currentTarget.files||[]);e.currentTarget.value="",n(!1),I(!1),await q(s)},ie=()=>{k(Ae($.value)),C(-1),E(!1),l("\u97F3\u8272\u9009\u62E9\uFF1A\u5DF2\u6E05\u7A7A\u5BFC\u5165\u7684\u97F3\u8272\u540D\u5B57")},Ze=Array.from({length:K},(e,s)=>s);return o`
    <div class="sub-screen sound-screen">
      <div class="sound-header">
        ${i?null:o`<button type="button" class="back-btn" onClick=${()=>Q("transpose")}>‹ 返回</button>`}
        <div class="sound-heading">
          <h1>音色选择 ${t+1}</h1>
          <p class=${c?"":"danger"} title=${`\u53D1\u9001\u5230 ${(c==null?void 0:c.displayName)||"\u672A\u8FDE\u63A5"} \xB7 Control CH ${v+1} \xB7 ${g}`}>
            发送到 ${(c==null?void 0:c.displayName)||"\u672A\u8FDE\u63A5"} · Control CH ${v+1} · ${g}
          </p>
        </div>
        <div class="sound-header-actions">
          <${Ue} pane=${t} mode="KORG" />
          <${M}
            label="音色链"
            onClick=${()=>{k(Ee($.value,t,"KORG")),Q(Oe(t))}}
          />
          <${M} label="导入音色表" onClick=${()=>{I(!0),n(!0)}} disabled=${L} />
          <${M} label="设置" onClick=${()=>{I(!1),n(!0)}} />
        </div>
      </div>

      <div class="sound-workspace">
        <div class="sound-grid">
          ${Array.from({length:2},(e,s)=>Array.from({length:4},(m,f)=>{const y=s*4+f,F=u*K+y;return o`
                <${Be}
                  key=${F}
                  group=${r}
                  slot=${F}
                  name=${T[F]}
                  selected=${y===P}
                  onClick=${()=>Y(y)}
                  onRename=${()=>D({group:r,slot:F})}
                />
              `}))}
        </div>

        <div class="sound-pages">
          ${Array.from({length:he},(e,s)=>o`
            <button
              type="button"
              class=${`sound-page-btn${s===u?" selected":""}`}
              onClick=${()=>ne(s)}
            >P${s+1}</button>
          `)}
        </div>

        <div class="sound-groups">
          ${Array.from({length:te},(e,s)=>o`
            <button
              type="button"
              class=${`sound-group-btn${s===r?" selected":""}`}
              title=${se(a,s)}
              onClick=${()=>le(s)}
            >${se(a,s)}</button>
          `)}
        </div>
      </div>

      ${p.immediateSend?null:o`
            <button
              type="button"
              class="sound-send-bar"
              disabled=${!_}
              onClick=${()=>S(P)}
            >
              ${_?`\u53D1\u9001 ${r+1}-${u*K+P+1} ${_}`:"\u5148\u9009\u62E9\u4E00\u4E2A\u97F3\u8272"}
            </button>
          `}

      ${x?o`
            <${Ye}
              pane=${t}
              picker=${a}
              target=${c}
              devices=${A}
              onClose=${()=>n(!1)}
              onSendMode=${e=>k(Ne($.value,t,e))}
              onTarget=${e=>k(we($.value,t,e))}
              onControlChannel=${e=>me(e)}
              onGroupLabel=${(e,s)=>k(Te($.value,e,s))}
              onImportFiles=${oe}
              onImportFolderFiles=${re}
              onClearRequest=${()=>E(!0)}
              scrollToImport=${d}
            />
          `:null}

      ${R?o`
            <${ae}
              title="清空音色名字？"
              message="只清除 App 里导入的名字，不会改动琴上的数据。"
              actions=${[{label:"\u53D6\u6D88",onClick:()=>E(!1)},{label:"\u6E05\u7A7A",danger:!0,onClick:ie}]}
            />
          `:null}

      ${h?o`
            <${Le}
              title=${`\u97F3\u8272\u4F4D\u7F6E ${h.group+1}-${h.slot+1} \u6539\u540D`}
              initial=${Se($.value,h.group,h.slot)||""}
              maxLength=${fe}
              onClose=${()=>D(null)}
              onConfirm=${e=>{const s=De($.value,h.group,h.slot,e);k(s),l(`\u97F3\u8272\u9009\u62E9\uFF1A${h.group+1}-${h.slot+1} \u2192 `+X(s,h.group,h.slot)),D(null)}}
            />
          `:null}
    </div>
  `}export{it as SoundPickerScreen};
