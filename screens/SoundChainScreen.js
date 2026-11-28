import{useEffect as Se,useRef as ne,useState as g}from"preact/hooks";import{AlertDialog as Ge,AppDialog as se,Chip as B,SmallButton as P,haptic as at,html as t}from"../ui/components.js";import{navigate as ot}from"../app/router.js";import{soundScreenForPane as it}from"../app/panes.js";import{PickerModeSwitch as lt}from"../ui/PickerModeSwitch.js";import{addLog as ct,consumeUse as rt,controlChannel as xe,hasUses as $e,licenseView as $t,midi as Me,modx as ye,openDialog as de,saveModx as dt,saveSoundChain as ut,saveSoundPicker as pt,setControlChannel as ht,settings as De,soundChain as Ke,soundPicker as ue,statusLine as Be,updateSettings as mt}from"../app/store.js";import{SOUND_CHAIN_LINK_NAME_MAX as Ue,SOUND_CHAIN_MAX_LINKS as pe,SOUND_CHAIN_NAME_MAX as he,activateChain as He,activeChain as gt,addChain as Ye,addLink as ft,bankLabel as vt,chainDisplayName as V,chainLinkDetail as ze,chainTileDetail as Ve,chainsForMode as Ct,deleteChain as bt,deleteLink as St,duplicateLink as We,factoryCategory as xt,moveLink as Mt,moveLinkTo as yt,newId as Dt,nextChainLink as Xt,normalizeLink as Pt,pageRange as je,programRange as qe,resolvePaneChainIndex as It,renameChain as Ot,serpentineSlots as At,soundChainMessages as kt,sxLinkName as me,transposeDetail as wt,transposeOffsetFor as Ze,updateLink as Lt,withCurrentLink as ge,withPaneActiveChainIndex as Tt}from"../core/sounds/chain.js";import{groupLabel as Et,nameAt as Xe,paneSettingsFor as Nt,resolveSoundTargetForPane as Rt,slotLabel as _t}from"../core/sounds/picker.js";import{isConnected as Ft,scheduleKeepAfterSoundChange as Gt,sendMessagesToDevice as Kt,sendTranspose as Bt}from"../core/midi/engine.js";import{noteLabel as fe,signedOffset as ve}from"../core/midi/notes.js";import{modxProfile as Je,normalizeRef as Ut,profileWireCompatible as Ht,refBankLabel as Yt,refDetail as zt,refEffectiveName as Pe,resolveModxProfile as Vt,resolveModxTargetForPane as Wt}from"../core/modx/model.js";import{sendModxChainLink as jt}from"../core/modx/engine.js";import{resolveSxTargetForPane as qt,sendSxSlotValue as Zt}from"../core/sxreg/engine.js";import{decodeSxPath as Jt}from"../core/sxreg/protocol.js";import{SX_DELAY_LABELS as Qt,SX_DELAY_VALUES as en,SX_GROUP_COUNT as tn,SX_PAGE_COUNT as nn,SX_PAGE_SIZE as sn,sxGroupLabel as an,sxSlotAt as on,sxSlotName as ln,withSxDelay as cn}from"../core/sxreg/model.js";import{ModxChainPickerDialog as rn}from"./ModxPickerScreen.js";const Qe=["#EF5350","#FFA726","#FFD54F","#66BB6A","#26C6DA","#42A5F5","#AB47BC"],_n=5;function et({value:e,onChange:i}){return t`
    <div class="mixer-channel-stepper sound-channel-stepper">
      <button type="button" class="stepper-btn" disabled=${e<=0} onClick=${()=>i(e-1)}>−</button>
      <span class="stepper-value">${e+1}</span>
      <button type="button" class="stepper-btn" disabled=${e>=15} onClick=${()=>i(e+1)}>＋</button>
    </div>
  `}function Ce({label:e,value:i,min:r,max:v,display:h,onChange:x}){return t`
    <div class="chain-number-row">
      <span class="chain-number-label">${e}</span>
      <div class="chain-number-controls">
        <button type="button" class="stepper-btn" disabled=${i<=r} onClick=${()=>x(Math.max(r,i-1))}>−</button>
        <span class="stepper-value chain-number-value">${h?h(i):i}</span>
        <button type="button" class="stepper-btn" disabled=${i>=v} onClick=${()=>x(Math.min(v,i+1))}>＋</button>
      </div>
    </div>
  `}function $n({index:e,link:i,displayName:r,current:v,dragging:h,highlighted:x,style:M,tileRef:I,onSelect:o,onEdit:$,onPointerDown:C,onPointerMove:y,onPointerUp:L,onPointerCancel:m}){const D=i.colorIndex>0?Qe[i.colorIndex-1]:null;return t`
    <div
      class=${`chain-tile${v?" current":""}${h?" dragging":""}${x?" highlighted":""}${D?" custom":""}`}
      style=${{...M,...D?{"--chain-color":D}:{}}}
      ref=${I}
      role="button"
      tabindex="0"
      data-chain-id=${i.id}
      onPointerDown=${C}
      onPointerMove=${y}
      onPointerUp=${L}
      onPointerCancel=${m}
      onKeyDown=${d=>{(d.key==="Enter"||d.key===" ")&&(d.preventDefault(),o())}}
    >
      <div class="chain-tile-top">
        <span class="chain-tile-index">${e+1}</span>
        <span
          class="chain-edit"
          role="button"
          tabindex="0"
          title="编辑"
          onPointerDown=${d=>d.stopPropagation()}
          onClick=${d=>{d.stopPropagation(),$()}}
        >✎</span>
      </div>
      <div class="chain-tile-name">${r}</div>
      <div class="chain-tile-detail">
        ${i.transpose?Ve(i):Ve(i)}
      </div>
    </div>
  `}function dn({chain:e,picker:i,currentIndex:r,onSelect:v,onEdit:h,onMove:x,onAddFirst:M}){const I=ne(null),o=ne(null),$=ne(new Map),C=ne(null),y=ne(0),[L,m]=g(0),[D,d]=g(4),[k,u]=g(null),[T,F]=g(-1),[q,W]=g("");Se(()=>{const n=I.current;if(!n)return;const l=()=>{const c=n.clientWidth;m(c),d(Math.max(4,Math.min(12,Math.floor(c/74))))};l();const b=new ResizeObserver(l);return b.observe(n),()=>b.disconnect()},[e.links.length===0]),Se(()=>{const n=requestAnimationFrame(()=>{const l=o.current;if(!l||e.links.length<2){W("");return}const b=l.getBoundingClientRect(),c=[];for(const N of e.links){const X=$.current.get(N.id);if(!X)continue;const E=X.getBoundingClientRect();c.push([E.left-b.left+E.width/2,E.top-b.top+E.height/2])}if(c.length<2){W("");return}W(c.map(([N,X],E)=>`${E?"L":"M"}${N.toFixed(1)} ${X.toFixed(1)}`).join(" "))});return()=>cancelAnimationFrame(n)},[e.links.map(n=>n.id).join("|"),e.currentIndex,D,L]);const U=At(e.links.length,D),A=(n,l,b)=>{for(const[c,N]of e.links.entries()){if(c===b)continue;const X=$.current.get(N.id);if(!X)continue;const E=X.getBoundingClientRect();if(n>=E.left&&n<=E.right&&l>=E.top&&l<=E.bottom)return c}return-1},O=()=>{clearTimeout(y.current),y.current=0},ae=(n,l,b)=>{if(!(n.button!==void 0&&n.button!==0)){O(),C.current={index:l,link:b,startX:n.clientX,startY:n.clientY,pointerId:n.pointerId,moved:!1,active:!1};try{n.currentTarget.setPointerCapture(n.pointerId)}catch{}y.current=setTimeout(()=>{const c=C.current;!c||c.moved||(c.active=!0,u({index:l,dx:0,dy:0}),F(l),at(30))},360)}},R=n=>{const l=C.current;if(!l||n.pointerId!==l.pointerId)return;const b=n.clientX-l.startX,c=n.clientY-l.startY;if(!l.active){(Math.abs(b)>8||Math.abs(c)>8)&&(l.moved=!0,O());return}n.preventDefault(),u({index:l.index,dx:b,dy:c}),F(A(n.clientX,n.clientY,l.index))},G=n=>{const l=C.current;if(!(!l||n&&n.pointerId!==l.pointerId)){O();try{n.currentTarget.releasePointerCapture(l.pointerId)}catch{}if(l.active){const b=T;u(null),F(-1),b>=0&&b!==l.index&&x(l.index,b)}else l.moved||v(l.index);C.current=null}},Z=n=>{O();const l=C.current;if(l)try{n.currentTarget.releasePointerCapture(l.pointerId)}catch{}C.current=null,u(null),F(-1)};return e.links.length?t`
    <div class="chain-grid-wrap" ref=${I}>
      <div class="chain-grid-inner" ref=${o}>
        <svg class="chain-flow" aria-hidden="true">
          <path d=${q} vector-effect="non-scaling-stroke"></path>
        </svg>
        <div class="chain-grid" style=${{gridTemplateColumns:`repeat(${D}, minmax(0, 1fr))`}}>
          ${U.map((n,l)=>{if(n===null)return t`<div class="chain-tile-placeholder"></div>`;const b=e.links[n],c=(k==null?void 0:k.index)===n,N=c?{transform:`translate(${k.dx}px, ${k.dy}px)`,zIndex:5}:{};return t`
              <${$n}
                key=${b.id}
                index=${n}
                link=${b}
                displayName=${V(b,i)}
                current=${n===r}
                dragging=${c}
                highlighted=${T===n&&k&&k.index!==n}
                style=${N}
                tileRef=${X=>{X?$.current.set(b.id,X):$.current.delete(b.id)}}
                onSelect=${()=>v(n)}
                onEdit=${()=>h(n)}
                onPointerDown=${X=>ae(X,n,b)}
                onPointerMove=${R}
                onPointerUp=${G}
                onPointerCancel=${Z}
              />
            `})}
        </div>
      </div>
    </div>
  `:t`
      <div class="chain-empty">
        <h2>这条链还没有音色</h2>
        <p>
          点右上角「＋ 添加」，选择 PA700 组合音色、MODX Live Set 音色
          或 SX 注册记忆；三种来源可以混在同一条链里。
        </p>
        <${P} label="＋ 添加第一个音色" onClick=${M} />
      </div>
    `}function un({mode:e,onCreate:i}){return t`
    <div class="chain-empty">
      <h2>还没有 ${e} 音色链</h2>
      <p>
        KORG、MODX、SX 各有自己的链库；切换型号只显示该型号的链。
        这个窗格可以用其中任意一条，其他窗格不受影响。
      </p>
      <${P} label=${`\uFF0B \u65B0\u5EFA ${e} \u97F3\u8272\u94FE`} onClick=${i} />
    </div>
  `}function pn({picker:e,onClose:i,onPick:r}){const[v,h]=g(0),[x,M]=g(0),I=e.groups;return t`
    <${se} title="从音色列表选择" onClose=${i}>
      <div class="chain-picker-dialog">
        <h3 class="section-title">组</h3>
        <div class="chain-picker-groups">
          ${Array.from({length:9},(o,$)=>t`
            <${B}
              label=${Et(e,$)}
              selected=${v===$}
              onClick=${()=>{h($),M(0)}}
            />
          `)}
        </div>
        <div class="chain-picker-pages">
          ${Array.from({length:6},(o,$)=>t`
            <button
              type="button"
              class=${`sound-page-btn${x===$?" selected":""}`}
              onClick=${()=>M($)}
            >P${$+1}</button>
          `)}
        </div>
        <div class="chain-picker-grid">
          ${Array.from({length:2},(o,$)=>Array.from({length:4},(C,y)=>{var d;const L=$*4+y,m=x*8+L,D=(d=I[v])==null?void 0:d[m];return t`
                <button
                  type="button"
                  class=${`chain-picker-tile${D?" used":""}`}
                  onClick=${()=>r(v,m,_t(e,v,m))}
                >
                  <span>${v+1}-${m+1}</span>
                  <strong>${D||"\u672A\u547D\u540D"}</strong>
                </button>
              `}))}
        </div>
        <p class="hint">点一个位置即可填入，不需要先导入音色表；未命名位置显示为「用户 x-y」。</p>
      </div>
    <//>
  `}function hn({onClose:e,onPick:i}){const r=ue.value.sx,[v,h]=g(r.settings.selectedGroup||0),[x,M]=g(r.settings.selectedPage||0),I=r.groups.reduce(($,C)=>$+(C.slots||[]).filter(Boolean).length,0),o=x*sn;return t`
    <${se} title="选择 SX 音色" onClose=${e}>
      <div class="chain-picker-dialog">
        ${I===0?t`
              <p class="hint">
                还没有整理 SX 音色。请先回到「音色选择 · SX」页，
                把注册库和按键放进 9 组 × 6 页 × 8 格里。
              </p>
            `:t`
              <h3 class="section-title">组</h3>
              <div class="chain-picker-groups">
                ${Array.from({length:tn},($,C)=>t`
                  <${B}
                    label=${an(r,C)}
                    selected=${v===C}
                    onClick=${()=>{h(C),M(0)}}
                  />
                `)}
              </div>
              <div class="chain-picker-pages">
                ${Array.from({length:nn},($,C)=>t`
                  <button
                    type="button"
                    class=${`sound-page-btn${x===C?" selected":""}`}
                    onClick=${()=>M(C)}
                  >P${C+1}</button>
                `)}
              </div>
              <div class="chain-picker-grid">
                ${Array.from({length:2},($,C)=>Array.from({length:4},(y,L)=>{const m=C*4+L,D=o+m,d=on(r,v,D);return t`
                      <button
                        type="button"
                        class=${`chain-picker-tile${d?" used":""}`}
                        disabled=${!d}
                        onClick=${()=>d&&i(d)}
                      >
                        <span>${v+1}-${D+1}</span>
                        <strong>${d?ln(r,d):"\u7A7A"}</strong>
                      </button>
                    `}))}
              </div>
              <p class="hint">点一个有内容的格子即可填入；空位置不能选。</p>
            `}
      </div>
    <//>
  `}function tt({link:e,chain:i,picker:r,paneMode:v="KORG",currentOffset:h,onClose:x,onSave:M,onDelete:I,onMoveUp:o,onMoveDown:$,onDuplicate:C}){var ke,we,Le,Te,Ee,Ne,Re;const y=!!e,L=v==="MODX"?"MODX":v==="SX"?"SX":"KORG",[m,D]=g(e?e.source||"KORG":L),[d,k]=g((e==null?void 0:e.modx)||null),[u,T]=g((e==null?void 0:e.sx)||null),[F,q]=g(!1),[W,U]=g(!1),[A,O]=g((e==null?void 0:e.name)||""),ae=(e==null?void 0:e.source)==="MODX"?e!=null&&e.modx?Pe(e.modx):"":(e==null?void 0:e.source)==="SX"?e!=null&&e.sx?me(e.sx):"":(e==null?void 0:e.bankMsb)===17&&Xe(r,e.bankLsb,e.program)||"",[R,G]=g(!!e&&!!e.name.trim()&&e.name.trim()===ae),[Z,n]=g(""),[l,b]=g(!!(e!=null&&e.transpose)),[c,N]=g(((ke=e==null?void 0:e.transpose)==null?void 0:ke.mode)||"OFFSET"),[X,E]=g(((we=e==null?void 0:e.transpose)==null?void 0:we.value)||0),[p,oe]=g((Le=e==null?void 0:e.bankMsb)!=null?Le:17),[K,ee]=g((Te=e==null?void 0:e.bankLsb)!=null?Te:0),[H,te]=g((Ee=e==null?void 0:e.program)!=null?Ee:0),[ie,re]=g((Ne=e==null?void 0:e.colorIndex)!=null?Ne:0),[be,J]=g(!1),[s,f]=g(!1),_={page:je(p),program:qe(p)},S=(a=p,w=K,z=H)=>{if(!l){if(m==="SX"){if(A.trim()&&!R)return;O(u?me(u):""),G(!0);return}m==="KORG"&&(A.trim()&&!R||(a===17?(O(Xe(r,w,z)||""),G(!0)):R&&O("")))}},j=a=>{oe(a);const w=je(a),z=qe(a),_e=Math.max(w[0],Math.min(w[1],K)),Fe=Math.max(z[0],Math.min(z[1],H));ee(_e),te(Fe),S(a,_e,Fe)},Ie=a=>{ee(a),S(p,a,H)},Oe=a=>{te(a),S(p,K,a)},le=a=>{N(a)},Q=a=>{b(a),a&&R&&(O(""),G(!1)),a||S()},Y=a=>{a!==m&&(D(a),n(""),R&&(O(""),G(!0)))},ce=()=>{const a=!l&&m==="MODX",w=!l&&m==="SX";if(a&&!d){n("\u8BF7\u5148\u9009\u62E9\u4E00\u4E2A MODX \u97F3\u8272");return}if(w&&!(u!=null&&u.bankPath)){n("\u8BF7\u5148\u9009\u62E9\u4E00\u4E2A SX \u97F3\u8272");return}n("");const z=a||w;M(Pt({id:(e==null?void 0:e.id)||Dt(),name:A,bankMsb:z?0:p,bankLsb:z?0:K,program:z?0:H,colorIndex:ie,transpose:l?{mode:c,value:X}:null,source:m,modx:a?d:null,sx:w?u:null}))},Ae=p===17?Xe(r,K,H):null,nt=p===16?"\u5206\u7C7B\uFF08CC#32\uFF09":"\u9875\uFF08CC#32\uFF09",st=p===16?K:K+1;return t`
    <${se} title=${e?e.transpose?"\u7F16\u8F91\u79FB\u8C03\u6307\u4EE4":"\u7F16\u8F91\u97F3\u8272":"\u6DFB\u52A0\u6B65\u9AA4"} onClose=${x}>
      <div class="chain-link-dialog">
        ${y?null:t`
              <h3 class="section-title">添加类型</h3>
              <div class="chip-row">
                <${B} label="音色" selected=${!l} onClick=${()=>Q(!1)} />
                <${B} label="移调指令" selected=${l} onClick=${()=>Q(!0)} />
              </div>
            `}

        <label class="chain-field">
          <span>名称（选填）</span>
          <input
            type="text"
            maxlength=${Ue}
            value=${A}
            placeholder=${l?"\u4F8B\u5982\uFF1A\u526F\u6B4C\u5347\u8C03 / \u56DE\u5230\u539F\u8C03":"\u4F8B\u5982\uFF1A\u94A2\u7434 / \u5F26\u4E50 / \u6F14\u51FA 1"}
            onInput=${a=>{O(a.currentTarget.value.slice(0,Ue)),G(!1)}}
          />
        </label>

        <h3 class="section-title">颜色</h3>
        <p class="hint">选一个颜色方便在链条里区分；默认跟随主题。</p>
        <div class="chain-color-row">
          <button
            type="button"
            class=${`chain-color none${ie===0?" selected":""}`}
            onClick=${()=>re(0)}
          >无</button>
          ${Qe.map((a,w)=>t`
            <button
              type="button"
              class=${`chain-color${ie===w+1?" selected":""}`}
              style=${{background:a}}
              title=${`\u989C\u8272 ${w+1}`}
              onClick=${()=>re(w+1)}
            ></button>
          `)}
        </div>

        <div class="mixer-divider-line"></div>

        ${l?t`
              <h3 class="section-title">移调方式</h3>
              <p class="hint">选中这一步时，按下面的设置改变移调。</p>
              <div class="chip-row">
                <${B} label="按偏移量" selected=${c==="OFFSET"} onClick=${()=>le("OFFSET")} />
                <${B} label="直接跳到" selected=${c==="TARGET"} onClick=${()=>le("TARGET")} />
              </div>
              <${Ce}
                label=${c==="OFFSET"?"\u504F\u79FB\u91CF":"\u76EE\u6807\u534A\u97F3"}
                value=${X}
                min=${-12}
                max=${12}
                display=${a=>c==="OFFSET"?`${ve(a)} \u534A\u97F3`:`${ve(a)}\uFF08${fe(a)}\uFF09`}
                onChange=${E}
              />
              <p class="hint accent">
                ${c==="OFFSET"?`\u76F8\u5BF9\u5F53\u524D\u8C03\u79FB\u52A8 ${ve(X)} \u4E2A\u534A\u97F3\uFF1B\u73B0\u5728\u662F ${fe(h)}\uFF0C\u9009\u4E2D\u540E \u2192 ${fe(Ze({mode:c,value:X},h))}\u3002`:`\u65E0\u8BBA\u5F53\u524D\u662F\u4EC0\u4E48\u8C03\uFF0C\u9009\u4E2D\u8FD9\u4E00\u6B65\u65F6 Key=${fe(X)}\uFF08${ve(X)} \u534A\u97F3\uFF09\u3002`}
              </p>
            `:t`
              <h3 class="section-title">音色来源</h3>
              <div class="chip-row">
                <${B}
                  label="KORG（PA）"
                  selected=${m==="KORG"}
                  onClick=${()=>Y("KORG")}
                />
                <${B}
                  label="MODX"
                  selected=${m==="MODX"}
                  onClick=${()=>Y("MODX")}
                />
                <${B}
                  label="SX"
                  selected=${m==="SX"}
                  onClick=${()=>Y("SX")}
                />
              </div>
              <p class="hint">
                KORG、MODX 和 SX 可以混在同一条链里；每个步骤按自己的来源发送。
              </p>
              ${m==="MODX"?t`
                    <h3 class="section-title">MODX 音色</h3>
                    <p class="hint">
                      从读取的 Live Set 或音色整理里选择；琴上需要打开 Bank Select / Pgm Change。
                    </p>
                    <${P}
                      label=${d?"\u91CD\u65B0\u9009\u62E9 MODX \u97F3\u8272":"\u9009\u62E9 MODX \u97F3\u8272"}
                      onClick=${()=>q(!0)}
                    />
                    ${d?t`
                          <p class="modx-chain-ref-name">${Pe(d)}</p>
                          <p class="hint">${zt(d)}</p>
                          <p class="hint accent">
                            ${((Re=Je(d.profile))==null?void 0:Re.label)||d.profile}
                            · ${Yt(d)}
                          </p>
                        `:null}
                  `:m==="SX"?t`
                    <h3 class="section-title">SX 注册记忆</h3>
                    <p class="hint">
                      从「音色选择 · SX」的 9 组 × 6 页 × 8 格里选择；切换时会先切注册库，等设定时间后再按 1–10 键。
                    </p>
                    <${P}
                      label=${u!=null&&u.bankPath?"\u91CD\u65B0\u9009\u62E9 SX \u97F3\u8272":"\u9009\u62E9 SX \u97F3\u8272"}
                      onClick=${()=>U(!0)}
                    />
                    ${u!=null&&u.bankPath?t`
                          <p class="modx-chain-ref-name">${me(u)}</p>
                          <p class="hint">${Jt(u.bankPath)}</p>
                          <p class="hint accent">按键 ${u.button}</p>
                        `:null}
                  `:t`
                    <h3 class="section-title">组合音色库</h3>
                    <p class="hint">
                      按 PA700/PA1000 Keyboard Set Library 的库/页/编号选择；编号在琴上显示从 1 开始，MIDI 使用 0 开始。
                    </p>
                    <div class="chain-dialog-actions">
                      <${P}
                        label="从音色列表选择"
                        onClick=${()=>J(!0)}
                      />
                    </div>
                    <div class="chip-row wrap chain-bank-row">
                      ${[[17,"\u7528\u6237"],[18,"\u76F4\u63A5\u7528\u6237"],[19,"\u672C\u673A"],[16,"\u51FA\u5382"]].map(([a,w])=>t`
                        <${B} label=${w} selected=${p===a} onClick=${()=>j(a)} />
                      `)}
                      <${B}
                        label="自定义"
                        selected=${![16,17,18,19].includes(p)}
                        onClick=${()=>j([16,17,18,19].includes(p)?0:p)}
                      />
                    </div>
                    ${[16,17,18,19].includes(p)?null:t`
                          <${Ce}
                            label="Bank MSB"
                            value=${p}
                            min=${0}
                            max=${127}
                            onChange=${j}
                          />
                        `}
                    <${Ce}
                      label=${nt}
                      value=${K}
                      min=${_.page[0]}
                      max=${_.page[1]}
                      display=${a=>p===16?`${a} \xB7 ${xt(a)}`:`${a+1}`}
                      onChange=${Ie}
                    />
                    <${Ce}
                      label="编号（PC）"
                      value=${H}
                      min=${_.program[0]}
                      max=${_.program[1]}
                      display=${a=>`${a+1}`}
                      onChange=${Oe}
                    />
                    <p class="hint accent">
                      Bank ${p}-${K} · PC ${H}
                      （琴上显示 ${vt(p)} ${st}-${H+1}）
                    </p>
                    ${Ae?t`<p class="hint">音色列表名称：${Ae}</p>`:null}
                  `}
            `}

        ${Z?t`<p class="hint danger">${Z}</p>`:null}

        <div class="chain-dialog-actions">
          <${P} label="取消" onClick=${x} />
          <${P} label="保存" onClick=${ce} />
          ${y?t`<${P} label="复制到链尾" onClick=${()=>C()} />`:null}
        </div>

        ${y?t`
              <div class="chain-dialog-actions chain-dialog-danger">
                <${P} label="删除" onClick=${()=>f(!0)} />
                ${o?t`<${P} label="上移" onClick=${()=>o()} />`:null}
                ${$?t`<${P} label="下移" onClick=${()=>$()} />`:null}
              </div>
            `:null}
      </div>
    <//>

    ${be?t`
          <${pn}
            picker=${r}
            onClose=${()=>J(!1)}
            onPick=${(a,w,z)=>{b(!1),oe(17),ee(a),te(w),O(z),G(!0),J(!1)}}
          />
        `:null}

    ${F?t`
          <${rn}
            onClose=${()=>q(!1)}
            onPick=${a=>{k(Ut(a)),(!A.trim()||R)&&(O(Pe(a)),G(!0)),n(""),q(!1)}}
          />
        `:null}

    ${W?t`
          <${hn}
            onClose=${()=>U(!1)}
            onPick=${a=>{T(a),(!A.trim()||R)&&(O(me(a)),G(!0)),n(""),U(!1)}}
          />
        `:null}

    ${s&&I?t`
          <${Ge}
            title="删除这个步骤？"
            message=${m==="MODX"?"\u53EA\u4F1A\u4ECE\u5F53\u524D\u94FE\u91CC\u79FB\u9664\uFF1B\u4E0D\u4F1A\u6539\u52A8\u7434\u4E0A\u7684 Live Set\u3002":m==="SX"?"\u53EA\u4F1A\u4ECE\u5F53\u524D\u94FE\u91CC\u79FB\u9664\uFF1B\u4E0D\u4F1A\u6539\u52A8\u7434\u4E0A\u7684\u6CE8\u518C\u8BB0\u5FC6\u3002":"\u53EA\u4F1A\u4ECE\u5F53\u524D\u94FE\u91CC\u79FB\u9664\uFF1B\u4E0D\u4F1A\u6539\u52A8 PA700 \u4E0A\u7684\u7EC4\u5408\u97F3\u8272\u3002"}
            actions=${[{label:"\u53D6\u6D88",onClick:()=>f(!1)},{label:"\u5220\u9664",danger:!0,onClick:()=>{f(!1),I()}}]}
          />
        `:null}
  `}function mn({chain:e,onClose:i,onConfirm:r}){const[v,h]=g(e.name);return t`
    <${se} title="链名" onClose=${i}>
      <div class="chain-rename-dialog">
        <label class="chain-field">
          <span>名称</span>
          <input
            type="text"
            maxlength=${he}
            value=${v}
            onInput=${x=>h(x.currentTarget.value.slice(0,he))}
          />
        </label>
        <div class="chain-dialog-actions">
          <${P} label="取消" onClick=${i} />
          <${P} label="保存" disabled=${!v.trim()} onClick=${()=>r(v)} />
        </div>
      </div>
    <//>
  `}function gn({mode:e,entries:i,activeIndex:r,onClose:v,onActivate:h,onAdd:x,onRename:M,onDelete:I}){const[o,$]=g(""),[C,y]=g(-1),[L,m]=g(-1),D=i.find(u=>u.index===C)||null,d=i.find(u=>u.index===L)||null,k=()=>{o.trim()&&(x(o),$(""))};return t`
    <${se}
      title=${`\u97F3\u8272\u94FE \xB7 ${e}`}
      onClose=${v}
      headerAction=${t`<${P} label="保存" disabled=${!o.trim()} onClick=${k} />`}
    >
      <div class="chain-manager">
        <p class="hint">
          每个型号有自己的链库；这里只显示 ${e} 的链。演出时可以建多条链，
          用顶部的「‹ / ›」切换。窗格 1–3 各自记住自己用哪条。
        </p>
        <div class="chain-new-row">
          <input
            type="text"
            maxlength=${he}
            value=${o}
            placeholder=${`\u8F93\u5165\u65B0\u7684 ${e} \u94FE\u540D\u79F0\uFF0C\u70B9\u53F3\u4E0A\u89D2\u300C\u4FDD\u5B58\u300D`}
            onInput=${u=>$(u.currentTarget.value.slice(0,he))}
            onKeyDown=${u=>{u.key==="Enter"&&k()}}
          />
        </div>
        <div class="chain-manager-list">
          ${i.map(({chain:u,index:T},F)=>t`
            <div class="chain-manager-row">
              <div class="chain-manager-info">
                <strong>${u.name}</strong>
                <span>${u.links.length} 个音色 · 第 ${F+1}/${i.length} 条</span>
              </div>
              <${P}
                label=${T===r?"\u5F53\u524D":"\u5207\u6362"}
                disabled=${T===r}
                onClick=${()=>h(T)}
              />
              <${P} label="改名" onClick=${()=>y(T)} />
              <${P} label="删除" disabled=${i.length<=1} onClick=${()=>m(T)} />
            </div>
          `)}
        </div>
        <p class="hint">链的名称和每个窗格的位置保存在本机，重启后保留。</p>
      </div>
    <//>

    ${D?t`
          <${mn}
            chain=${D.chain}
            onClose=${()=>y(-1)}
            onConfirm=${u=>{M(D.index,u),y(-1)}}
          />
        `:null}

    ${d?t`
          <${Ge}
            title=${`\u5220\u9664\u300C${d.chain.name}\u300D\uFF1F`}
            message=${`\u8FD9\u6761\u94FE\u91CC\u7684 ${d.chain.links.length} \u4E2A\u97F3\u8272\u4F1A\u4E00\u8D77\u5220\u9664\uFF0C\u4E0D\u80FD\u64A4\u9500\u3002`}
            actions=${[{label:"\u53D6\u6D88",onClick:()=>m(-1)},{label:"\u5220\u9664",danger:!0,onClick:()=>{I(d.index),m(-1)}}]}
          />
        `:null}
  `}function fn({onClose:e,onChannel:i,modxChannel:r,onModxChannel:v,sx:h,onSxDelay:x}){return t`
    <${se} title="音色链设置" onClose=${e}>
      <div class="chain-settings">
        <h3 class="section-title">PA700 Control 通道</h3>
        <p class="hint">
          和歌单共用。PA700 的 Global › MIDI › MIDI IN Channels 要把这个通道设为 Control，
          App 才能发送组合音色切换。
        </p>
        <${et} value=${xe.value} onChange=${i} />
        <div class="mixer-divider-line"></div>
        <h3 class="section-title">MODX Control 通道</h3>
        <p class="hint">
          MODX 的 MIDI IN 通道要和这里一致，默认 Ch1。跨库切库、设备号、端口在
          「音色选择 → MODX 设置」里调整。
        </p>
        <${et} value=${r} onChange=${v} />
        <div class="mixer-divider-line"></div>
        <h3 class="section-title">SX 注册记忆</h3>
        <p class="hint">
          SX 步骤通过 USB 直连发送，不使用 Control 通道；切换注册库后，
          等设定的时间再按 1–10 键。和「音色选择 · SX」共用同一个设置。
        </p>
        <div class="chip-row wrap">
          ${en.map((M,I)=>t`
            <${B}
              label=${Qt[I]}
              selected=${h.settings.delayMs===M}
              onClick=${()=>x(M)}
            />
          `)}
        </div>
        <div class="mixer-divider-line"></div>
        <h3 class="section-title">用户组组合音色的 MIDI 值</h3>
        <p class="hint">
          用户 CC#0=17，页 CC#32=0–8，编号 PC=0–47；直接用户 CC#0=18，本机 CC#0=19，
          出厂 CC#0=16。
        </p>
        <p class="hint">
          音色链里可以混用 KORG、MODX 和 SX 步骤；每个步骤按自己的来源发送。
        </p>
      </div>
    <//>
  `}function Fn({embedded:e=!1,pane:i=0}){const r=ue.value,v=Nt(r,i),h=v.mode==="MODX"?"MODX":v.mode==="SX"?"SX":"KORG",x=Ke.value,M=Ct(x,h),I=It(x,i,h),o=I>=0?x.chains[I]:null,$={...x,activeChainIndex:I},C=ye.value,y=Wt(C,Me.value.devices,i,v.modxTargetKey),L=Vt(C,y),m=Rt(r,Me.value.devices,i),D=r.sx,d=qt(D,Me.value.devices,i,v.sxTargetKey),k=o?o.links[o.currentIndex]:null,u=k&&!k.transpose?k.source||"KORG":h,T=u==="MODX"?y:u==="SX"?d:m,F=u==="MODX"?C.settings.controlChannel:u==="SX"?null:xe.value,q=$t().shortText,[W,U]=g(!1),[A,O]=g(-1),[ae,R]=g(!1),[G,Z]=g(!1),[n,l]=g(""),b=ne(0);Se(()=>()=>clearTimeout(b.current),[]);const c=s=>{const f=i===0?s:{...s,activeChainIndex:Ke.value.activeChainIndex};ut(Tt(f,i,s.activeChainIndex,h))},N=M.findIndex(s=>s.index===I),X=s=>{if(M.length<=1)return;const _=((N>=0?N:0)+s+M.length)%M.length;c(He($,M[_].index))},E=()=>c(Ye($,"",h)),p=s=>{if(!s)return;const f=/失败|请先|未连接|不能|缺失/.test(s),_=!f&&s.match(/^音色链：([^（]+)（/),S=_?`\u97F3\u8272\u94FE\uFF1A${_[1].trim()} \xB7 \u5DF2\u53D1\u9001`:s;l(S),ct(s,"muted"),clearTimeout(b.current),b.current=setTimeout(()=>l(""),f?4e3:2500)},oe=async s=>{var le;if(!o)return;const f=$,S=gt(f).links[s];if(!S)return;const j=S.source==="MODX"?C.settings.controlChannel:xe.value;if(S.transpose){if(Ft()&&!$e(1)){de("paywall");return}c(ge(f,s));const Y=Ze(S.transpose,De.value.offset);mt({offset:Y});const ce=await Bt(Y,{consume:!0,reason:"\u97F3\u8272\u94FE"});p(ce?`\u97F3\u8272\u94FE\uFF1A${V(S,r)}\uFF08${wt(S.transpose)}\uFF09`:`\u97F3\u8272\u94FE\uFF1A${V(S,r)}\uFF08\u672A\u53D1\u9001\uFF1A\u6CA1\u6709\u53EF\u7528\u7684\u7434\uFF09`);return}if(S.source==="SX"){const Q=!!d;if(Q&&!$e(1)){de("paywall");return}if(c(ge(f,s)),!((le=S.sx)!=null&&le.bankPath)){p("\u97F3\u8272\u94FE\uFF1ASX \u97F3\u8272\u6570\u636E\u7F3A\u5931\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9");return}if(!Q){p("\u97F3\u8272\u94FE\uFF1A\u672A\u8FDE\u63A5 SX\uFF1B\u8BF7\u8FDE\u63A5 USB TO HOST \u5E76\u5141\u8BB8 SysEx");return}await Zt(S.sx,{context:"\u97F3\u8272\u94FE",target:d}),p(Be.value||`\u97F3\u8272\u94FE\uFF1A${V(S,r)}`);return}if(S.source==="MODX"){if(!!y&&!$e(1)){de("paywall");return}if(c(ge(f,s)),!S.modx){p("\u97F3\u8272\u94FE\uFF1AMODX \u97F3\u8272\u6570\u636E\u7F3A\u5931\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9");return}if(!y){p("\u97F3\u8272\u94FE\uFF1A\u672A\u8FDE\u63A5\u6240\u9009\u7684 MODX \u7434\uFF08\u5728 MODX \u8BBE\u7F6E\u91CC\u9009\u62E9\uFF09\uFF0C\u672A\u53D1\u9001 "+V(S,r));return}const Y=Je(S.modx.profile);if(S.modx.kind!=="MANUAL"&&Y&&L&&!Ht(Y,L)){p(`\u97F3\u8272\u94FE\uFF1A\u6B64\u97F3\u8272\u6765\u81EA ${Y.label}\uFF0C\u5F53\u524D\u7434\u662F ${L.label}\uFF0C\u4E0D\u80FD\u76F4\u63A5\u53D1\u9001`);return}const ce=await jt(S.modx,{target:y});p(ce?`\u97F3\u8272\u94FE\uFF1A${V(S,r)}\uFF08${ze(S)} \xB7 ${y.displayName} \xB7 Control CH ${j+1}\uFF09`:Be.value||`\u97F3\u8272\u94FE\uFF1A\u53D1\u9001\u5931\u8D25\uFF08${y.displayName}\uFF09`);return}if(!!m&&!$e(1)){de("paywall");return}if(c(ge(f,s)),!m){p("\u97F3\u8272\u94FE\uFF1A\u672A\u8FDE\u63A5\u6240\u9009\u7684\u7434\uFF08\u5728\u97F3\u8272\u9009\u62E9\u8BBE\u7F6E\u91CC\u9009\u62E9\uFF09\uFF0C\u672A\u53D1\u9001 "+V(S,r));return}if(!await Kt(m,kt(F,S)).catch(()=>0)){p(`\u97F3\u8272\u94FE\uFF1A\u53D1\u9001\u5931\u8D25\uFF1A${m.displayName}`);return}rt(1),Gt("\u97F3\u8272\u94FE"),p(`\u97F3\u8272\u94FE\uFF1A${V(S,r)}\uFF08${ze(S)} \xB7 ${m.displayName} \xB7 Control CH ${j+1}\uFF09`)},K=s=>{if(!o)return;const f=Xt(o.links,o.currentIndex,s);if(f===null){p("\u97F3\u8272\u94FE\uFF1A\u8BF7\u5148\u6DFB\u52A0\u7EC4\u5408\u97F3\u8272");return}oe(f)},ee=s=>{if(W){const f=ft($,s);if(!f.added){p(`\u97F3\u8272\u94FE\uFF1A\u6BCF\u6761\u94FE\u6700\u591A ${pe} \u4E2A\u97F3\u8272`);return}c(f.state),p(`\u97F3\u8272\u94FE\uFF1A\u5DF2\u6DFB\u52A0 ${V(s,r)}`),U(!1)}else c(Lt($,A,s)),O(-1)},H=()=>{c(St($,A)),O(-1)},te=s=>{c(Mt($,A,s)),O(-1)},ie=()=>{if(!o)return;const s=o.currentIndex,f=We($,s);if(!f.added){p(`\u97F3\u8272\u94FE\uFF1A\u6BCF\u6761\u94FE\u6700\u591A ${pe} \u4E2A\u97F3\u8272`);return}c(f.state),p(`\u97F3\u8272\u94FE\uFF1A\u5DF2\u590D\u5236\u300C${V(o.links[s],r)}\u300D\u5230\u94FE\u5C3E`)},re=()=>{const s=We($,A);if(!s.added){p(`\u97F3\u8272\u94FE\uFF1A\u6BCF\u6761\u94FE\u6700\u591A ${pe} \u4E2A\u97F3\u8272`);return}c(s.state),p("\u97F3\u8272\u94FE\uFF1A\u5DF2\u590D\u5236\u5230\u94FE\u5C3E")},be=o?o.links[o.currentIndex]:null,J=o&&A>=0?o.links[A]:null;return t`
    <div class="sub-screen chain-screen">
      ${n?t`<div
            class=${`chain-toast${/失败|请先|未连接|不能|缺失/.test(n)?" danger":""}`}
            role="status"
            aria-live="polite"
          >${n}</div>`:null}
      <div class="chain-header">
        <button
          type="button"
          class="back-btn chain-back"
          title="返回音色选择"
          onClick=${()=>ot(it(i))}
        >‹ 返回</button>
        <div class="chain-heading">
          <div class="chain-title-row">
            <h1>音色链 ${i+1}</h1>
            <${lt} pane=${i} mode=${h} />
          </div>
          <p class=${T?"":"danger"}>
            ${(T==null?void 0:T.displayName)||"\u672A\u8FDE\u63A5"} ·
            ${F===null?"SX USB \u76F4\u8FDE":`Control CH ${F+1}`} ·
            ${h} 链 ${N>=0?N+1:0}/${M.length} · ${q}
          </p>
        </div>
        <div class="chain-header-actions">
          <${P} label="‹" disabled=${M.length<=1} onClick=${()=>X(-1)} />
          <button type="button" class="chain-name-chip" onClick=${()=>R(!0)} title="管理音色链">${o?o.name:`\u6682\u65E0 ${h} \u94FE`}</button>
          <${P} label="›" disabled=${M.length<=1} onClick=${()=>X(1)} />
          <${P} label="＋ 添加" disabled=${!o} onClick=${()=>U(!0)} />
          <${P} label="复制到链尾" disabled=${!o||!be||o.links.length>=pe} onClick=${ie} />
          <${P} label="设置" onClick=${()=>Z(!0)} />
        </div>
      </div>

      ${o?t`
            <${dn}
              chain=${o}
              picker=${r}
              currentIndex=${o.currentIndex}
              onSelect=${oe}
              onEdit=${s=>O(s)}
              onMove=${(s,f)=>c(yt($,s,f))}
              onAddFirst=${()=>U(!0)}
            />
          `:t`
            <${un} mode=${h} onCreate=${E} />
          `}

      <div class="chain-footer">
        <button type="button" class="chain-transport" disabled=${!o||!o.links.length} onClick=${()=>K(-1)}>◀ 上一个</button>
        <button type="button" class="chain-transport" disabled=${!o||!o.links.length} onClick=${()=>K(1)}>下一个 ▶</button>
      </div>
      <div class="chain-hint">
        点方块切换 · 长按拖动排序 · ✎ 编辑 · 每次切换扣 1 次 ·
        发送目标跟随「音色选择 ${i+1}」· 链按型号分开
      </div>

      ${W&&o?t`
            <${tt}
              link=${null}
              chain=${o}
              picker=${r}
              paneMode=${h}
              currentOffset=${De.value.offset}
              onClose=${()=>U(!1)}
              onSave=${ee}
            />
          `:null}

      ${J?t`
            <${tt}
              key=${J.id}
              link=${J}
              chain=${o}
              picker=${r}
              paneMode=${h}
              currentOffset=${De.value.offset}
              onClose=${()=>O(-1)}
              onSave=${ee}
              onDelete=${H}
              onMoveUp=${A>0?()=>te(-1):null}
              onMoveDown=${A<o.links.length-1?()=>te(1):null}
              onDuplicate=${re}
            />
          `:null}

      ${ae?t`
            <${gn}
              mode=${h}
              entries=${M}
              activeIndex=${I}
              onClose=${()=>R(!1)}
              onActivate=${s=>{c(He($,s)),R(!1)}}
              onAdd=${s=>c(Ye($,s,h))}
              onRename=${(s,f)=>c(Ot($,s,f))}
              onDelete=${s=>{const f=bt($,s),_=f.chains[f.activeChainIndex],S=_&&_.mode===h?f.activeChainIndex:f.chains.findIndex(j=>j.mode===h);c({...f,activeChainIndex:S})}}
            />
          `:null}

      ${G?t`
            <${fn}
              onClose=${()=>Z(!1)}
              onChannel=${s=>ht(s)}
              modxChannel=${C.settings.controlChannel}
              onModxChannel=${s=>dt({...ye.value,settings:{...ye.value.settings,controlChannel:s}})}
              sx=${D}
              onSxDelay=${s=>pt({...ue.value,sx:cn(ue.value.sx,s)})}
            />
          `:null}
    </div>
  `}export{Fn as SoundChainScreen};
