import{useEffect as F,useRef as be,useState as f}from"preact/hooks";import{AlertDialog as ve,AppDialog as Y,SmallButton as S,haptic as O,html as c}from"../ui/components.js";import{navigate as he}from"../app/router.js";import{addLog as ne,beginSetListCapture as Ce,cancelSetListCapture as H,clearCapturedSetListNumber as V,consumeUse as Ie,controlChannel as oe,hasUses as ke,licenseView as Te,midi as se,openDialog as Ne,saveSetList as M,setControlChannel as Ge,setList as v,statusLine as we}from"../app/store.js";import{SET_LIST_NAME_MAX as E,SET_LIST_SLOT_COUNT as De,SONGBOOK_MAX_NUMBER as Ae,SONGBOOK_MIN_NUMBER as ye,addGroup as Me,configuredCount as Le,currentGroup as K,deleteGroup as Pe,indexOfNumber as ze,nextConfiguredSlot as Be,renameGroup as Ee,slotConfigured as L,slotDisplayName as U,songBookMessages as _e,swapSlots as xe,withSlot as j}from"../core/setlist/model.js";import{connectMidi as Oe,midiPerformanceDevices as Ue,scheduleKeepAfterSoundChange as Re,sendMessagesToDevice as Ze}from"../core/midi/engine.js";function Xe({value:i,onChange:o}){return c`
    <div class="mixer-channel-stepper setlist-channel-stepper">
      <button type="button" class="stepper-btn" disabled=${i<=0} onClick=${()=>o(i-1)}>−</button>
      <span class="stepper-value">${i+1}</span>
      <button type="button" class="stepper-btn" disabled=${i>=15} onClick=${()=>o(i+1)}>＋</button>
    </div>
  `}function Ye({index:i,slot:o,current:s,editMode:m,dragging:k,dropTarget:h,onClick:C}){const p=L(o);return c`
    <button
      type="button"
      data-setlist-slot=${i}
      class=${`setlist-tile${s?" current":""}${p?" configured":""}${k?" dragging":""}${h?" drop-target":""}`}
      onClick=${C}
    >
      <span class="setlist-index">${i+1}</span>
      <span class="setlist-corner">${h?"\u653E\u5230\u8FD9\u91CC":s?"\u25B6 \u5F53\u524D":m?"\u7F16\u8F91":""}</span>
      <span class="setlist-name">${o.number!=null?U(o):"\u7A7A"}</span>
      <span class="setlist-number">${o.number!=null?`SongBook #${o.number}`:"\u70B9\u6B64\u8BBE\u7F6E"}</span>
    </button>
  `}function Ve({group:i,groupIndex:o,slotIndex:s,slot:m,onClose:k}){var z;const[h,C]=f(((z=m.number)==null?void 0:z.toString())||""),[p,D]=f(m.name||""),[T,N]=f(""),[A,I]=f(!1),G=v.value,b=G.captureSlot===s,_=G.capturedNumber;F(()=>{A&&_!=null&&(C(String(_)),N(""),I(!1),V())},[_,A]);const R=()=>{H(),V(),k()},a=()=>{const u=h.trim(),w=u?Number(u):null;if(u&&(!Number.isInteger(w)||w<ye||w>Ae)){N("\u7F16\u53F7\u5E94\u4E3A 1\u20139999");return}const Z=v.value;M(j(Z,o,s,w,p)),H(),V(),ne(w!=null?`\u6B4C\u5355\uFF1A\u7B2C ${s+1} \u683C \u2192 SongBook #${w}`:`\u6B4C\u5355\uFF1A\u5DF2\u6E05\u7A7A\u7B2C ${s+1} \u683C`,"muted"),k()},P=()=>{const u=v.value;M(j(u,o,s,null,"")),H(),V(),k()};return c`
    <${Y} title=${`\u7F16\u8F91\u7B2C ${s+1} \u683C`} onClose=${R}>
      <div class="setlist-edit-dialog">
        <div class="setlist-number-row">
          <label class="setlist-number-field">
            <span>SongBook 编号</span>
            <input
              type="text"
              inputmode="numeric"
              maxlength="4"
              value=${h}
              placeholder="1–9999"
              onInput=${u=>{C(u.currentTarget.value.replace(/\D/g,"").slice(0,4)),N("")}}
            />
          </label>
          <${S}
            label=${b?"\u7B49\u5F85\u7434\u4E0A\u9009\u62E9\u2026":"\u4ECE\u7434\u6293\u53D6"}
            disabled=${b}
            onClick=${()=>{I(!0),Ce(o,s)}}
          />
        </div>
        ${b?c`<p class="hint accent">现在在 PA700 上选择这首歌，App 会自动读取 SongBook 编号。</p>`:null}
        <label class="setlist-name-field">
          <span>显示名称（可留空）</span>
          <input
            type="text"
            maxlength=${E}
            value=${p}
            onInput=${u=>D(u.currentTarget.value.slice(0,E))}
          />
        </label>
        ${T?c`<p class="hint danger">${T}</p>`:null}
        <div class="chain-dialog-actions">
          <${S} label="保存" onClick=${a} />
          <${S} label="清空" onClick=${P} />
          <${S} label="取消" onClick=${R} />
        </div>
        <p class="hint">
          编号是 PA700 里 SongBook 条目的 Number（SongBook › Write › Number）。
          如果琴上没有编号，请先在琴上给这些歌设置编号。
        </p>
      </div>
    <//>
  `}function Ke({group:i,onClose:o,onConfirm:s}){const[m,k]=f(i.name);return c`
    <${Y} title="组名" onClose=${o}>
      <div class="setlist-rename-dialog">
        <label class="setlist-name-field">
          <span>名称</span>
          <input
            type="text"
            maxlength=${E}
            value=${m}
            onInput=${h=>k(h.currentTarget.value.slice(0,E))}
          />
        </label>
        <div class="chain-dialog-actions">
          <${S} label="取消" onClick=${o} />
          <${S} label="保存" disabled=${!m.trim()} onClick=${()=>s(m)} />
        </div>
      </div>
    <//>
  `}function We({state:i,onClose:o,onAdd:s,onSwitch:m,onRename:k,onDelete:h}){const[C,p]=f(""),[D,T]=f(null),[N,A]=f(null),I=i.groups;return c`
    <${Y} title="歌单组" onClose=${o}>
      <div class="setlist-group-manager">
        <p class="hint">
          组是 App 里的 9 首一页歌单。切换组会切换下面 9 个格子；
          PA700 的 Set List 页不能通过 MIDI 远程翻页。
        </p>
        <div class="chain-new-row">
          <input
            type="text"
            maxlength=${E}
            value=${C}
            placeholder="新组名称"
            onInput=${G=>p(G.currentTarget.value.slice(0,E))}
          />
          <${S} label="新建组" onClick=${()=>{s(C),p("")}} />
        </div>
        <div class="chain-manager-list">
          ${I.map((G,b)=>c`
            <div class="chain-manager-row">
              <div class="chain-manager-info">
                <strong>${G.name}</strong>
                <span>${Le(G)}/9 首 · 第 ${b+1}/${I.length} 组</span>
              </div>
              <${S}
                label=${b===i.currentGroupIndex?"\u5F53\u524D":"\u5207\u6362"}
                disabled=${b===i.currentGroupIndex}
                onClick=${()=>m(b)}
              />
              <${S} label="改名" onClick=${()=>T(b)} />
              <${S} label="删除" disabled=${I.length<=1} onClick=${()=>A(b)} />
            </div>
          `)}
        </div>
        <p class="hint">每格填写 PA700 SongBook 条目的 Number；一个组对应演出的一页 9 首。</p>
      </div>
    <//>

    ${D!==null?c`
          <${Ke}
            group=${I[D]}
            onClose=${()=>T(null)}
            onConfirm=${G=>{k(D,G),T(null)}}
          />
        `:null}

    ${N!==null?c`
          <${ve}
            title=${`\u5220\u9664\u300C${I[N].name}\u300D\uFF1F`}
            message="这个组里的 9 格设置会一起删除，不能撤销。"
            actions=${[{label:"\u53D6\u6D88",onClick:()=>A(null)},{label:"\u5220\u9664",danger:!0,onClick:()=>{h(N),A(null)}}]}
          />
        `:null}
  `}function qe({onClose:i}){return c`
    <${Y} title="歌单设置" onClose=${i}>
      <div class="setlist-settings">
        <h3 class="section-title">Control 通道</h3>
        <p class="hint">
          PA700 的 SongBook 选曲走特殊 Control 通道。App 发送和接收都使用这个通道；
          琴上也要把 MIDI IN/OUT 的同一个通道设为 Control。
        </p>
        <${Xe} value=${oe.value} onChange=${o=>Ge(o)} />

        <div class="mixer-divider-line"></div>

        <h3 class="section-title accent">PA700 设置步骤</h3>
        <p class="hint">
          1. 确认要控制的歌曲在 SongBook 里有 Number（SongBook › Write › Number，1–9999）。<br />
          2. Global › MIDI › MIDI IN Channel：把同一个通道设为 Control；
          MIDI OUT Channel 也设为 Control（常用 16，等同 Tablet MIDI Preset）。<br />
          3. 保存 MIDI Preset（Write MIDI Preset）。<br />
          4. 使用时 PA700 请在 Style Play 或 Song Play 模式；发送选曲后琴会加载对应 SongBook 条目。
        </p>

        <div class="mixer-divider-line"></div>

        <h3 class="section-title accent">关于 Set List 页</h3>
        <p class="hint">
          PA700 没有公开的 MIDI 命令来翻 Set List 页，所以 App 用「组」切换 9 首一页的歌单；
          切组只换 App 里的 9 格，不会翻琴上的 Set List 页。下一首/上一首由 App 按 SongBook 编号发送。
        </p>

        <div class="mixer-divider-line"></div>

        <h3 class="section-title accent">抓取编号</h3>
        <p class="hint">
          在编辑格子里点「从琴抓取」，然后在 PA700 上选择那首歌；琴会把 SongBook 编号通过 Control OUT 通道发给 App。
        </p>

        <div class="mixer-divider-line"></div>

        <p class="hint danger">
          如果点格子后琴没反应：检查 Control 通道是否一致、MIDI IN Filters 是否屏蔽 Control Change，
          以及琴当前是否在 Style Play / Song Play 模式。
        </p>
      </div>
    <//>
  `}function st({embedded:i=!1}){var ee;const o=v.value,s=K(o),m=oe.value,k=Te().shortText,h=Ue(),C=h.length>0,[p,D]=f(!1),[T,N]=f(-1),[A,I]=f(!1),[G,b]=f(!1),[_,R]=f(""),[a,P]=f(null);F(()=>{se.value.supported&&se.value.status!=="connected"&&Oe().catch(()=>{})},[]);const z=t=>M(t),u=t=>{R(t),t&&ne(t,"muted")},w=async t=>{const e=v.value,l=K(e).slots[t];if(!L(l)){N(t);return}if(C&&!ke(1)){Ne("paywall");return}if(M({...e,currentSlot:t,remoteNumber:l.number}),!C){u(`\u6B4C\u5355\uFF1A\u672A\u8FDE\u63A5\u7434\uFF0C\u672A\u53D1\u9001 SongBook #${l.number}`);return}let d=0;for(const $ of h)await Ze($,_e(m,l.number)).catch(()=>0)>0&&(d+=1);d>0?(Ie(1),Re("\u6B4C\u5355"),u(`\u6B4C\u5355\uFF1ASongBook #${l.number} \xB7 ${U(l)}\uFF08Control CH ${m+1}\uFF09`)):u("\u6B4C\u5355\uFF1A\u53D1\u9001\u5931\u8D25\uFF1A\u6CA1\u6709\u53EF\u7528\u7684 MIDI \u8F93\u51FA")},Z=t=>{const e=Be(s.slots,o.currentSlot,t);if(e===null){u(`\u6B4C\u5355\uFF1A${s.name} \u91CC\u8FD8\u6CA1\u6709\u53EF\u7528\u7684\u6B4C\u66F2`);return}w(e)},W=t=>{const e=v.value;if(t<0||t>=e.groups.length)return;const n=e.groups[t],l=e.remoteNumber!=null?ze(n,e.remoteNumber):-1;M({...e,currentGroupIndex:t,currentSlot:l,captureSlot:-1,capturedNumber:null})},J=t=>{const e=o.groups.length;e<=1||W(((o.currentGroupIndex+t)%e+e)%e)},y=be({pending:null,active:!1,fromGroupId:"",fromSlot:-1,overSlot:-1,zone:0,zoneLock:0,dwellZone:0,dwellTimer:null,songName:"",suppressClickUntil:0});F(()=>()=>{const t=y.current;t.dwellTimer&&clearTimeout(t.dwellTimer)},[]);const Q=()=>{const t=y.current;t.dwellTimer&&clearTimeout(t.dwellTimer),t.dwellTimer=null,t.dwellZone=0,t.pending=null,t.active=!1,t.fromGroupId="",t.fromSlot=-1,t.overSlot=-1,t.zone=0,t.zoneLock=0,t.songName="",P(null)},le=t=>{const e=v.value,n=e.groups.length;n<=1||W(((e.currentGroupIndex+t)%n+n)%n)},re=(t,e,n,l,d)=>{const $=t.groups.find(B=>B.id===e),g=t.groups.find(B=>B.id===l);if(!$||!g)return;const r=$.slots[n],X=g.slots[d],x=L(X)?"\u5DF2\u4EA4\u6362":"\u5DF2\u79FB\u52A8";u(e===l?`\u6B4C\u5355\uFF1A${x}\u7B2C ${n+1} \u683C\u300C${U(r)}\u300D\u2192 \u7B2C ${d+1} \u683C\uFF08\u672A\u53D1\u9001\uFF09`:`\u6B4C\u5355\uFF1A${x}\u300C${$.name}\u300D\u7B2C ${n+1} \u683C \u2194\u300C${g.name}\u300D\u7B2C ${d+1} \u683C\uFF08\u672A\u53D1\u9001\uFF09`)},ie=t=>{var g,r;if(t.pointerType==="mouse"&&t.button!==0)return;const e=(r=(g=t.target).closest)==null?void 0:r.call(g,"[data-setlist-slot]");if(!e)return;const n=Number(e.dataset.setlistSlot);if(!Number.isInteger(n)||n<0||n>=De)return;const l=v.value,d=K(l),$=d.slots[n];L($)&&(y.current.pending={pointerId:t.pointerId,startX:t.clientX,startY:t.clientY,index:n,groupId:d.id,name:U($)})},ae=t=>{var X,x,B,te;const e=y.current;if(!e.pending||e.pending.pointerId!==t.pointerId)return;if(!e.active){const fe=t.clientX-e.pending.startX,Se=t.clientY-e.pending.startY;if(Math.hypot(fe,Se)<10)return;e.active=!0,e.fromGroupId=e.pending.groupId,e.fromSlot=e.pending.index,e.overSlot=e.pending.index,e.zone=0,e.zoneLock=0,e.songName=e.pending.name,(x=(X=t.currentTarget).setPointerCapture)==null||x.call(X,t.pointerId),O(),P({fromGroupId:e.fromGroupId,fromSlot:e.fromSlot,overSlot:e.overSlot,zone:0,name:e.songName})}if(!e.active)return;t.preventDefault();const n=document.elementFromPoint(t.clientX,t.clientY),l=(B=n==null?void 0:n.closest)==null?void 0:B.call(n,"[data-setlist-slot]"),d=(te=n==null?void 0:n.closest)==null?void 0:te.call(n,"[data-setlist-zone]"),$=l?Number(l.dataset.setlistSlot):-1,g=!l&&d?Number(d.dataset.setlistZone):0;let r=g;r!==0&&r===e.zoneLock?r=0:g===0&&(e.zoneLock=0),r===0?(e.dwellTimer&&(clearTimeout(e.dwellTimer),e.dwellTimer=null),e.dwellZone=0):e.dwellZone!==r&&(e.dwellTimer&&clearTimeout(e.dwellTimer),e.dwellZone=r,e.dwellTimer=setTimeout(()=>{!e.active||e.dwellZone!==r||(e.dwellZone=0,e.dwellTimer=null,e.zoneLock=r,e.zone=0,e.overSlot=-1,P({fromGroupId:e.fromGroupId,fromSlot:e.fromSlot,overSlot:-1,zone:0,name:e.songName}),le(r))},600)),(e.overSlot!==$||e.zone!==r)&&(e.overSlot=$,e.zone=r,P({fromGroupId:e.fromGroupId,fromSlot:e.fromSlot,overSlot:$,zone:r,name:e.songName}))},ce=t=>{const e=y.current;if(!(!e.pending||e.pending.pointerId!==t.pointerId)){if(e.active){e.suppressClickUntil=Date.now()+400;const n=v.value,l=K(n).id,d=e.fromGroupId,$=e.fromSlot,g=e.overSlot;if(g>=0){const r=xe(n,d,$,l,g);r!==n&&(M(r),re(n,d,$,l,g),O())}t.preventDefault()}Q()}},ue=t=>{const e=y.current;!e.pending||e.pending.pointerId!==t.pointerId||Q()},Fe=(t,e,n)=>{const l=v.value;M(j(l,l.currentGroupIndex,t,e,n))},pe=t=>{var n;const e=Me(v.value,t);z(e),u(`\u6B4C\u5355\uFF1A\u65B0\u5EFA\u300C${((n=e.groups.at(-1))==null?void 0:n.name)||t}\u300D`)},de=(t,e)=>{z(Ee(v.value,t,e))},$e=t=>{z(Pe(v.value,t))},me=t=>{O(),N(t)},ge=a?`\u62D6\u52A8\u300C${a.name}\u300D\uFF1A\u677E\u624B\u4EA4\u6362 / \u79FB\u5165\u7A7A\u683C \xB7 \u62D6\u5230 \u2039 \u6216 \u203A \u505C\u7559\u53EF\u6362\u7EC4`:p?"\u7F16\u8F91\uFF1A\u70B9\u683C\u5B50\u8BBE\u7F6E\u7F16\u53F7\u6216\u540D\u79F0 \xB7 \u62D6\u52A8\u683C\u5B50\u6362\u4F4D\uFF08\u53EF\u8DE8\u7EC4\uFF09 \xB7 \u62D6\u5230 \u2039 \u203A \u6362\u7EC4":"\u70B9\u683C\u5B50\u5207\u6B4C \xB7 \u62D6\u52A8\u683C\u5B50\u6362\u4F4D/\u79FB\u5165\u7A7A\u683C\uFF08\u53EF\u8DE8\u7EC4\uFF09 \xB7 \u5E95\u90E8\u4E0A\u4E00\u9996/\u4E0B\u4E00\u9996",q=_||we.value;return c`
    <div class="sub-screen setlist-screen">
      <div class="setlist-header">
        ${i?null:c`<button type="button" class="back-btn" onClick=${()=>p?D(!1):he("transpose")}>‹ 返回</button>`}
        <div class="setlist-heading">
          <h1>歌单</h1>
          <p>PA700 SET LIST · 9 首/组 · Control CH ${m+1} · 组 ${o.currentGroupIndex+1}/${o.groups.length} · ${k}</p>
        </div>
        <div class="setlist-header-actions">
          <span
            class=${`setlist-group-zone${(a==null?void 0:a.zone)===-1?" active":""}`}
            data-setlist-zone="-1"
          >
            <${S} label="‹" disabled=${o.groups.length<=1} onClick=${()=>J(-1)} />
          </span>
          <button type="button" class="chain-name-chip" onClick=${()=>I(!0)} title="管理歌单组">${s.name}</button>
          <span
            class=${`setlist-group-zone${(a==null?void 0:a.zone)===1?" active":""}`}
            data-setlist-zone="1"
          >
            <${S} label="›" disabled=${o.groups.length<=1} onClick=${()=>J(1)} />
          </span>
          <span class=${`drum-conn${C?" on":""}`}>
            <span class="mixer-conn-dot"></span>${C?"\u5DF2\u8FDE\u63A5":"\u672A\u8FDE\u63A5"}
          </span>
          <${S} label=${p?"\u5B8C\u6210":"\u7F16\u8F91"} onClick=${()=>{O(),D(!p)}} />
          <${S} label="设置" onClick=${()=>b(!0)} />
        </div>
      </div>

      <div class=${`setlist-hint${p||a?" edit":""}`}>${ge}</div>

      <div
        class=${`setlist-grid${a?" dragging":""}`}
        onPointerDown=${ie}
        onPointerMove=${ae}
        onPointerUp=${ce}
        onPointerCancel=${ue}
        onPointerLeave=${()=>{const t=y.current;t.active||(t.pending=null)}}
      >
        ${Array.from({length:9},(t,e)=>{const n=s.slots[e];return c`
            <${Ye}
              key=${`${s.id}-${e}`}
              index=${e}
              slot=${n}
              current=${o.currentSlot===e}
              editMode=${p}
              dragging=${!!a&&a.fromGroupId===s.id&&a.fromSlot===e}
              dropTarget=${!!a&&a.overSlot===e&&!(a.fromGroupId===s.id&&a.fromSlot===e)}
              onClick=${()=>{Date.now()<y.current.suppressClickUntil||(O(),p||!L(n)?me(e):w(e))}}
            />
          `})}
      </div>

      ${p?null:c`
            <div class="setlist-transport">
              <button type="button" class="setlist-transport-btn" onClick=${()=>Z(-1)}>◀ 上一首</button>
              <div class="setlist-now">
                <strong>${L(s.slots[o.currentSlot])?U(s.slots[o.currentSlot]):"\u672A\u9009\u62E9\u6B4C\u66F2"}</strong>
                <span>
                  ${L(s.slots[o.currentSlot])?`\u7B2C ${o.currentSlot+1} \u683C \xB7 SongBook #${s.slots[o.currentSlot].number}`:"\u70B9\u683C\u5B50\u6216\u6309\u4E0B\u4E00\u9996\u5F00\u59CB"}
                  ${o.remoteNumber!=null&&((ee=s.slots[o.currentSlot])==null?void 0:ee.number)!==o.remoteNumber?` \xB7 \u7434\u4E0A #${o.remoteNumber}`:""}
                </span>
              </div>
              <button type="button" class="setlist-transport-btn" onClick=${()=>Z(1)}>下一首 ▶</button>
            </div>
          `}

      ${q?c`<div class="setlist-status" title=${q}>${q}</div>`:null}

      ${T>=0?c`
            <${Ve}
              key=${`${s.id}-${T}`}
              group=${s}
              groupIndex=${o.currentGroupIndex}
              slotIndex=${T}
              slot=${s.slots[T]}
              onClose=${()=>N(-1)}
            />
          `:null}

      ${A?c`
            <${We}
              state=${o}
              onClose=${()=>I(!1)}
              onAdd=${pe}
              onSwitch=${t=>{W(t),I(!1)}}
              onRename=${de}
              onDelete=${$e}
            />
          `:null}

      ${G?c`<${qe} onClose=${()=>b(!1)} />`:null}
    </div>
  `}export{st as SetListScreen};
