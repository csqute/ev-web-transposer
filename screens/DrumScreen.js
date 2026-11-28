import{useEffect as Q,useRef as H,useState as B}from"preact/hooks";import{AlertDialog as tt,AppDialog as he,Chip as F,SmallButton as E,Toggle as ge,haptic as D,html as i}from"../ui/components.js";import{DrumPad as nt}from"../ui/DrumPad.js";import{DrumLoopGrid as st}from"../ui/DrumLoopGrid.js";import{navigate as ot}from"../app/router.js";import{addLog as M,consumeUse as Me,drumLoopMode as re,drumPlayhead as se,drumPlaying as Y,drums as c,hasUses as Se,licenseView as it,midi as de,openDialog as be,previewDrums as Z,saveDrums as V,setDrumChannel as lt,updateDrums as _}from"../app/store.js";import{DRUM_KIT_BY_ID as R,DRUM_KITS as ct,DRUM_MAX_BPM as ue,DRUM_MIN_BPM as ee,DRUM_SFX as at,DRUM_SFX_GROUPS as rt,DRUM_STEP_COUNT as dt,chineseFor as pe,drumSendsTo as Ce,drumStepIntervalMs as ut,hasStep as pt,labelFor as $t,noteFor as q,sfxFor as ye,withDefaultSfxAssignments as mt,withDrumTargetAll as ft,withDrumTargetEnabled as vt,withPatternCleared as ht,withSfxAssigned as gt,withSwappedPads as Mt}from"../core/drums/model.js";import{anyKeyboardConnected as St,drumConnectedTargets as bt,drumOutputConnected as K,drumTargetCandidates as $e,hasMidiDrumOutput as L,noteForState as j,sendAllDrumNoteOffs as Ct,sendDrumKit as De,sendDrumNoteOff as oe,sendDrumNoteOn as ie}from"../core/drums/engine.js";import{connectMidi as yt}from"../core/midi/engine.js";const A=8;function Dt({connected:n}){return i`
    <span class=${`drum-conn${n?" on":""}`}>
      <span class="mixer-conn-dot"></span>
      ${n?"\u5DF2\u8FDE\u63A5":"\u672A\u8FDE\u63A5"}
    </span>
  `}function xt({state:n,editMode:s,velocityMode:$,fixedVelocity:f,centerVelocity:h,edgeVelocity:u,onPadDown:S,onPadUp:y,onSwap:x}){const g=H(null),[l,a]=B(-1),[w,k]=B(-1);Q(()=>{s||(a(-1),k(-1))},[s]);const X=(d,r)=>{var N;const m=(N=g.current)==null?void 0:N.getBoundingClientRect();if(!m||m.width<=0||m.height<=0||d<m.left-A||d>m.right+A||r<m.top-A||r>m.bottom+A)return-1;const I=(m.width-A*4)/5,v=(m.height-A)/2,T=Math.max(0,Math.min(4,Math.floor((d-m.left)/(I+A))));return Math.max(0,Math.min(1,Math.floor((r-m.top)/(v+A))))*5+T},W=d=>{a(d),k(d)},U=(d,r,m)=>{l===d&&k(X(r,m))},z=(d,r,m)=>{if(l!==d)return;const I=X(r,m);a(-1),k(-1),I>=0&&I!==d&&(D(),x(d,I))};return i`
    <div class="drum-grid" ref=${g}>
      ${n.padOrder.map((d,r)=>i`
        <${nt}
          key=${d}
          padId=${d}
          index=${r}
          title=${$t(n,d)}
          subtitle=${pe(n,d)}
          note=${q(n,d)}
          editMode=${s}
          isDragging=${l===r}
          isHoverTarget=${s&&l>=0&&w===r&&l!==r}
          velocityMode=${$}
          fixedVelocity=${f}
          centerVelocity=${h}
          edgeVelocity=${u}
          onDown=${m=>S(d,m)}
          onUp=${()=>y(d)}
          onDragStart=${W}
          onDragMove=${U}
          onDragEnd=${z}
        />
      `)}
    </div>
  `}function Pt({bpm:n,onPreview:s,onCommit:$}){const f=H(null),h=H(null),u=(n-ee)/(ue-ee),S=l=>{var k;const a=(k=f.current)==null?void 0:k.getBoundingClientRect();if(!a||a.width<=0)return n;const w=Math.max(0,Math.min(1,(l-a.left)/a.width));return Math.round(ee+w*(ue-ee))},y=l=>{var a;if(!(l.button!==void 0&&l.button!==0)){l.preventDefault(),h.current=l.pointerId;try{(a=f.current)==null||a.setPointerCapture(l.pointerId)}catch{}s(S(l.clientX))}},x=l=>{h.current===l.pointerId&&(l.preventDefault(),s(S(l.clientX)))},g=l=>{var a;if(h.current===l.pointerId){h.current=null;try{(a=f.current)==null||a.releasePointerCapture(l.pointerId)}catch{}$()}};return i`
    <div
      class="bpm-slider"
      ref=${f}
      onPointerDown=${y}
      onPointerMove=${x}
      onPointerUp=${g}
      onPointerCancel=${g}
    >
      <div class="bpm-track"></div>
      <div class="bpm-fill" style=${{width:`${u*100}%`}}></div>
      <div class="bpm-thumb" style=${{left:`${u*100}%`}}></div>
    </div>
  `}function wt({bpm:n,playing:s,onTogglePlay:$,onBpmPreview:f,onBpmCommit:h,onClear:u}){return i`
    <div class="loop-transport">
      <button type="button" class=${`transport-btn${s?" stop":""}`} onClick=${$}>
        <span>${s?"\u25A0":"\u25B6"}</span>
        <span>${s?"\u505C\u6B62":"\u64AD\u653E"}</span>
      </button>
      <span class="bpm-label">BPM</span>
      <${Pt} bpm=${n} onPreview=${f} onCommit=${h} />
      <span class="bpm-value">${n}</span>
      <span class="bpm-range">${ee}–${ue}</span>
      <${E} label="清空" onClick=${u} />
    </div>
  `}function kt({sfxMode:n}){return i`
    <div class="drum-hint-row">
      <span>
        ${n?"\u672A\u68C0\u6D4B\u5230\u666E\u901A MIDI\uFF1A\u8FDE\u63A5 PA700 \u540E\u97F3\u6548\u57AB\u624D\u80FD\u53D1\u58F0\u3002":"\u672A\u68C0\u6D4B\u5230\u7434\uFF1A\u8FDE\u63A5 PA700 \u6216 SX\uFF08SX \u56DE\u73AF\uFF09\u540E\u9F13\u57AB\u624D\u80FD\u53D1\u58F0\u3002"}
      </span>
    </div>
  `}function It(){return i`
    <div class="drum-sfx-hint">
      打鼓发送目标：选中的琴都没有连接。打开「设置 › 发送到琴」重新选择，或点「全部琴」。
    </div>
  `}function Xt(){return i`
    <div class="drum-sfx-hint">
      音效垫只发送普通 MIDI（PA700）。当前只有 SX 回环；SX 的 SFX 键位不同，请切回「鼓组垫」使用。
    </div>
  `}function Tt(){return i`
    <div class="drum-edit-hint">
      排序模式：拖动一个鼓垫到另一个鼓垫上，松手即可交换位置（不会触发鼓声）。
    </div>
  `}function Ft({value:n,onChange:s}){return i`
    <div class="mixer-channel-stepper drum-channel-stepper">
      <button type="button" class="stepper-btn" disabled=${n<=0} onClick=${()=>s(n-1)}>−</button>
      <span class="stepper-value">${n+1}</span>
      <button type="button" class="stepper-btn" disabled=${n>=15} onClick=${()=>s(n+1)}>＋</button>
    </div>
  `}function me({label:n,value:s,min:$=1,max:f=127,onPreview:h,onCommit:u}){return i`
    <div class="drum-range-block">
      <span class="drum-range-label">${n}：${s}</span>
      <input
        class="drum-range"
        type="range"
        min=${$}
        max=${f}
        value=${s}
        onInput=${S=>h(Number(S.currentTarget.value))}
        onPointerUp=${()=>u()}
        onKeyUp=${()=>u()}
        onBlur=${()=>u()}
      />
      <div class="drum-range-scale"><span>1</span><span>${s}</span><span>127</span></div>
    </div>
  `}function Vt({state:n,channel:s,targets:$,onClose:f,onOpenSfxEditor:h,onChannelChange:u,onPadModeChange:S,onSelectKit:y,onVelocityModeChange:x,onVelocityPreview:g,onVelocityCommit:l,onCenterPreview:a,onCenterCommit:w,onEdgePreview:k,onEdgeCommit:X,onCompensationChange:W,onResendKit:U,onTargetAll:z,onTargetToggle:d}){const r=n.padMode==="SFX",m=[...$.midi.map(v=>({device:v,tag:"\u666E\u901A MIDI"})),...$.sx.map(v=>({device:v,tag:"SX \u56DE\u73AF"}))],I=m.filter(v=>Ce(n,v.device.key)).length;return i`
    <${he} title="打鼓设置" onClose=${f}>
      <div class="drum-settings">
        <h3 class="section-title">打鼓通道</h3>
        <p class="hint">
          打鼓页、鼓组音色和音效垫都发到这个通道，与调音台的鼓组滑杆分开。
          默认 MIDI 通道 10；打击垫接在别的通道时在这里单独设置。
        </p>
        <${Ft} value=${s} onChange=${u} />

        <div class="mixer-divider-line"></div>

        <h3 class="section-title">发送到琴</h3>
        <p class="hint">
          默认发送到全部已连接的琴。只想让部分琴发声时，点「全部琴」下面的开关
          关掉不需要的琴；选中的琴断开后会自动跳过，重新接上后继续发送。
        </p>
        <div class="chip-row">
          <${F}
            label="全部琴"
            selected=${n.sendAllTargets!==!1}
            onClick=${z}
          />
        </div>
        ${m.length===0?i`<p class="hint">当前没有已连接的琴；接上琴后这里会出现可选的琴。</p>`:m.map(({device:v,tag:T})=>i`
              <${ge}
                label=${`${v.shortName||v.displayName} \xB7 ${T}`}
                checked=${Ce(n,v.key)}
                onChange=${P=>d(v.key,P)}
              />
            `)}
        ${n.sendAllTargets===!1&&I===0?i`<p class="hint danger">没有选中任何琴：打鼓和鼓组切换都不会发送。</p>`:null}

        <div class="mixer-divider-line"></div>

        <h3 class="section-title">打击垫用途</h3>
        <p class="hint">
          鼓组垫：10 个打击垫打鼓。音效垫：10 个垫触发 PA700 的 SFX Kit GM 音效，每个垫都能单独选声音。
        </p>
        <div class="chip-row">
          <${F} label="鼓组垫" selected=${!r} onClick=${()=>S("DRUM")} />
          <${F} label="音效垫" selected=${r} onClick=${()=>S("SFX")} />
        </div>
        ${r?i`
              <p class="hint">
                音效垫使用 SFX Kit GM（Bank 120 / LSB 0 / PC 56）。琴上切节奏/风格会换掉
                Drum 轨音色，每次触发音效前会自动补发 SFX 鼓组，切完节奏也不会跑音。
                如果琴上仍没变化，请把 Drum 轨选为 SFX Kit GM。
                SX 回环的 SFX 键位与 PA700 不同，音效垫只发送普通 MIDI。
              </p>
              <div class="drum-dialog-actions">
                <${E} label="编辑 10 个音效垫 ›" onClick=${h} />
              </div>
            `:null}

        <div class="mixer-divider-line"></div>

        ${r?i`
              <h3 class="section-title">音效鼓组</h3>
              <p class="hint">
                音效垫固定使用 SFX Kit GM（CC00 120 / CC32 0 / PC 56），音效名称和音符编号按 GM2 SFX Set。
                每次触发前会自动补发鼓组，所以琴上切节奏后音效也不会变成别的鼓声。
              </p>
              <div class="drum-dialog-actions">
                <${E} label="重发 SFX 鼓组" onClick=${U} />
              </div>
              ${L()?null:i`<p class="hint danger">当前没有普通 MIDI 连接：音效垫不会发声。</p>`}
            `:i`
              <h3 class="section-title">鼓组音色</h3>
              <p class="hint">
                普通 MIDI 琴发送 GM2 Bank 120；SX 发送 Yamaha Bank 127（SFX 为 126）。
                SX 的 Drum 轨需选鼓组并接收通道 10。切换后点鼓垫试听。
              </p>
              <div class="drum-kit-grid">
                ${ct.map(v=>i`
                  <${F}
                    label=${v.chinese}
                    selected=${n.selectedKit===v.id}
                    onClick=${()=>y(v)}
                  />
                `)}
              </div>
              <p class="hint accent">
                App 选择：${R[n.selectedKit].label}
                （${R[n.selectedKit].chinese}）· 点上方按钮发送到琴
              </p>
              ${K(!0)?null:i`<p class="hint danger">当前未连接琴：切换鼓组只会更新界面，不会发送到琴。</p>`}
              <p class="hint">如果琴上没有变化，请在琴上直接选择 Drum 轨道的鼓组。</p>
            `}

        <div class="mixer-divider-line"></div>

        <h3 class="section-title">力度</h3>
        <p class="hint">
          固定力度使用滑块数值；位置力度下，敲击鼓垫中心力度最大，越靠近边缘力度越小，
          中心/边缘力度都可调。Loop 播放使用固定力度。
        </p>
        <div class="chip-row">
          <${F} label="固定力度" selected=${n.velocityMode==="FIXED"} onClick=${()=>x("FIXED")} />
          <${F} label="位置力度" selected=${n.velocityMode==="POSITION"} onClick=${()=>x("POSITION")} />
        </div>
        <${me}
          label="固定 / Loop 力度"
          value=${n.fixedVelocity}
          onPreview=${g}
          onCommit=${l}
        />
        ${n.velocityMode==="POSITION"?i`
              <${me}
                label="中心力度（鼓垫正中间）"
                value=${n.centerVelocity}
                onPreview=${a}
                onCommit=${w}
              />
              <${me}
                label="边缘力度（鼓垫最外侧）"
                value=${n.edgeVelocity}
                onPreview=${k}
                onCommit=${X}
              />
            `:null}

        <div class="mixer-divider-line"></div>

        <${ge}
          label="移调补偿"
          checked=${n.transposeCompensation}
          onChange=${W}
        />
        <p class="hint">
          默认关闭。PA700 / SX 鼓组不跟随移调；只有琴把输入音符也移调时才需要打开。
        </p>

        <div class="mixer-divider-line"></div>

        <h3 class="section-title accent">GM 鼓音符</h3>
        <p class="hint">
          底鼓 36 · 军鼓 38 · 闭镲 42 · 开镲 46<br />
          高音通鼓 50 · 中音通鼓 47 · 低音通鼓 45 · 落地通鼓 43<br />
          吊镲 49 · 叮叮镲 51
        </p>
        <p class="hint">
          如果鼓声不对：在琴上进入 Global › Tuning › Transpose Control，关闭 Mode › Midi In Notes；
          或者在上面打开「移调补偿」。<br />
          如果完全没声音：确认琴上已选择 Style、Drum 轨道没有被 Track Mute，并且调音台里 DRUMS 不是静音。
        </p>
      </div>
    <//>
  `}function Rt({state:n,onClose:s,onAssign:$,onReset:f}){const h=n.padOrder,[u,S]=B(h[0]||"KICK"),y=h.includes(u)?u:h[0],x=ye(n,y);return i`
    <${he} title="音效垫设置" onClose=${s}>
      <div class="sfx-dialog">
        <p class="hint">先点一个打击垫，再点下面的音效。点音效会立即分配并试听；所有设置自动保存。</p>

        <h3 class="section-title">10 个打击垫</h3>
        <div class="sfx-pad-list">
          ${h.map((g,l)=>{const a=ye(n,g);return i`
              <button
                type="button"
                class=${`sfx-pad-row${g===y?" selected":""}`}
                onClick=${()=>S(g)}
              >
                <span class="sfx-pad-index">${l+1}</span>
                <span class="sfx-pad-chinese">${pe({...n,padMode:"DRUM"},g)}</span>
                <span class="sfx-pad-arrow">→</span>
                <span class="sfx-pad-effect">${a.chinese}</span>
                <span class="sfx-pad-label">${a.label}</span>
                <span class="sfx-pad-note">${a.note}</span>
              </button>
            `})}
        </div>

        <div class="mixer-divider-line"></div>

        <h3 class="section-title">给「${pe({...n,padMode:"DRUM"},y)}」选音效</h3>
        <p class="hint accent">当前：${x.chinese}（${x.label} · NOTE ${x.note}）</p>
        ${L()?null:i`<p class="hint danger">当前没有普通 MIDI 连接：选择只会保存，不会试听。</p>`}

        ${rt.map(g=>i`
          <div class="sfx-group">
            <h4>${g.label}</h4>
            ${at.filter(l=>l.group===g.id).map(l=>{const a=x.id===l.id;return i`
                <button
                  type="button"
                  class=${`sfx-option${a?" selected":""}`}
                  onClick=${()=>$(y,l)}
                >
                  <span class="sfx-option-chinese">${l.chinese}</span>
                  <span class="sfx-option-label">${l.label}</span>
                  <span class="sfx-option-note">NOTE ${l.note}</span>
                  <span class="sfx-option-check">${a?"\u2713":""}</span>
                </button>
              `})}
          </div>
        `)}

        <div class="mixer-divider-line"></div>
        <div class="drum-dialog-actions">
          <${E} label="恢复 10 个默认音效" onClick=${f} />
        </div>
        <p class="hint">
          鼓组音效来自 GM2 SFX Set（PA700：SFX Kit GM，Bank 120 / LSB 0 / PC 56）；
          只发送普通 MIDI，SX 回环请用鼓组垫。
        </p>
      </div>
    <//>
  `}function Qt({embedded:n=!1}){const s=c.value,$=re.value,f=Y.value,h=se.value,u=s.padMode==="SFX",S=s.channel,y=St(),x=K(!0),g=L(),l=u&&!g,[a,w]=B(!1),[k,X]=B(!1),[W,U]=B(!1),[z,d]=B(!1),r=H({token:0,timer:0}),m=de.value.devices.map(e=>{var t,o;return`${e.key}:${e.mode}:${((o=(t=e.output)==null?void 0:t.port)==null?void 0:o.id)||e.outputName}`}).join("|"),I=H(-1/0),v=H(-1/0),T=({force:e=!1}={})=>{if(c.value.padMode!=="SFX"||!L())return!1;const o=performance.now();return!e&&o-v.current<400?!1:(v.current=o,De(R.SFX,!1).catch(()=>{}),!0)},P=({force:e=!1}={})=>{const t=performance.now();if(!e&&t-I.current<1200)return!1;const o=c.value,p=o.padMode==="SFX",b=p?R.SFX:R[o.selectedKit],C=!p;return K(C)?(I.current=t,p&&(v.current=t),De(b,C).catch(()=>{}),!0):!1},N=({silent:e=!1}={})=>{const t=Y.value;r.current.token+=1,clearTimeout(r.current.timer),r.current.timer=0,Y.value=!1,se.value=-1;const o=$e();if(!t&&o.midi.length===0&&o.sx.length===0)return;const p=c.value,b=p.padMode==="DRUM",C=p.padOrder.map(ne=>j(q(p,ne),p));Ct(C,b).catch(()=>{}),t&&!e&&M("\u6253\u9F13\uFF1A16 \u6B65 Loop \u5DF2\u505C\u6B62","muted")},xe=()=>{if(Y.value)return;const e=c.value,t=e.padMode==="DRUM",o=K(t);if(o&&!Se(1)){be("paywall");return}const p=r.current.token+1;r.current.token=p,clearTimeout(r.current.timer),Y.value=!0,se.value=0,o&&Me(1),o&&e.padMode==="SFX"&&T({force:!0}),M(o?`\u6253\u9F13\uFF1A16 \u6B65 Loop \u5F00\u59CB\u64AD\u653E\uFF08${e.bpm} BPM\uFF09`:"\u6253\u9F13\uFF1A\u672A\u8FDE\u63A5\u7434\uFF0CLoop \u53EA\u8D70\u754C\u9762\u4E0D\u51FA\u58F0",o?"ok":"muted");let b=0,C=performance.now();const ne=()=>{if(p!==r.current.token)return;const O=c.value,ce=ut(O.bpm),ae=O.padMode==="DRUM",J=[];for(const G of O.padOrder)pt(O,G,b)&&J.push(j(q(O,G),O));if(J.length){ae||T();for(const G of J)ie(G,O.fixedVelocity,ae).catch(()=>{})}se.value=b;const et=Math.max(25,Math.min(70,Math.round(ce/3)));J.length&&setTimeout(()=>{if(p===r.current.token)for(const G of J)oe(G,ae).catch(()=>{})},et),b=(b+1)%dt,C+=ce,C<performance.now()-ce&&(C=performance.now()),r.current.timer=setTimeout(ne,Math.max(0,C-performance.now()))};ne()},fe=()=>{D(),Y.value?N():xe()};Q(()=>()=>N({silent:!0}),[]),Q(()=>{de.value.supported&&de.value.status!=="connected"&&yt().catch(()=>{})},[]),Q(()=>{P()},[m,s.padMode,s.selectedKit,S]),Q(()=>{const e=()=>{document.visibilityState==="visible"&&P({force:!0})};return document.addEventListener("visibilitychange",e),()=>document.removeEventListener("visibilitychange",e)},[s.padMode,s.selectedKit,S]);const le=()=>{w(!1)},Pe=()=>{if($){te(!1);return}if(a){le();return}N({silent:!0}),ot("transpose")},we=e=>{const t=c.value,o=t.padMode==="DRUM";if(!K(o))return;const p=j(q(t,e),t);ie(p,t.fixedVelocity,o).catch(()=>{}),setTimeout(()=>{oe(p,o).catch(()=>{})},80)},ke=e=>{if(!L())return;T();const t=c.value,o=j(e.note,t);ie(o,t.fixedVelocity,!1).catch(()=>{}),setTimeout(()=>{oe(o,!1).catch(()=>{})},120)},Ie=(e,t)=>{const o=c.value,p=o.padMode==="DRUM",b=K(p);if(b&&!Se(1))return be("paywall"),!1;p||T();const C=j(q(o,e),o);return ie(C,t,p).catch(()=>{}),b&&Me(1),!0},Xe=e=>{const t=c.value,o=t.padMode==="DRUM",p=j(q(t,e),t);oe(p,o).catch(()=>{})},Te=(e,t)=>{const o=c.value,p=o.padOrder[e],b=o.padOrder[t],C=Mt(o,e,t);C!==o&&(V(C),M(`\u6253\u9F13\uFF1A\u4EA4\u6362 ${p} \u2194 ${b}`,"muted"))},te=e=>{D(),re.value!==e&&(re.value=e,e&&le())},Fe=e=>{if(D(),c.value.padMode===e)return;const t=_({padMode:e});if(le(),e==="SFX")P({force:!0}),M(L()?"\u6253\u9F13\uFF1A\u97F3\u6548\u57AB\u6A21\u5F0F\uFF08\u5DF2\u53D1\u9001 SFX Kit GM\uFF09":"\u6253\u9F13\uFF1A\u97F3\u6548\u57AB\u6A21\u5F0F\uFF1B\u672A\u8FDE\u63A5\u666E\u901A MIDI\uFF0C\u97F3\u6548\u6682\u4E0D\u53D1\u58F0","muted");else{const o=R[t.selectedKit];P({force:!0}),M(K(!0)?`\u6253\u9F13\uFF1A\u9F13\u7EC4\u57AB\u6A21\u5F0F\uFF08\u5DF2\u53D1\u9001 ${o.label}\uFF09`:"\u6253\u9F13\uFF1A\u9F13\u7EC4\u57AB\u6A21\u5F0F\uFF1B\u672A\u8FDE\u63A5\u7434\uFF0C\u9F13\u7EC4\u5207\u6362\u672A\u53D1\u9001","muted")}},Ve=e=>{D(),_({selectedKit:e.id}),P({force:!0}),M(L()?`\u6253\u9F13\uFF1AGM2 \u9F13\u7EC4 ${e.label}\uFF08PC ${e.program}\uFF09`:"\u6253\u9F13\uFF1A\u672A\u8FDE\u63A5\uFF0C\u9F13\u7EC4\u5207\u6362\u672A\u53D1\u9001","muted")},Re=()=>{D();const e=c.value,t=e.padMode==="SFX"?R.SFX:R[e.selectedKit];P({force:!0}),M(e.padMode==="SFX"?"\u6253\u9F13\uFF1A\u5DF2\u91CD\u53D1 SFX \u9F13\u7EC4":K(!0)?`\u6253\u9F13\uFF1A\u5DF2\u91CD\u53D1 ${t.label} \u9F13\u7EC4`:"\u6253\u9F13\uFF1A\u672A\u8FDE\u63A5\u7434\uFF0C\u9F13\u7EC4\u672A\u53D1\u9001","muted")},Ke=(e,t)=>{D();const o=gt(c.value,e,t.id);V(o),M(`\u6253\u9F13\uFF1A${e} \u2192 ${t.chinese}\uFF08NOTE ${t.note}\uFF09`,"muted"),o.padMode==="SFX"&&ke(t)},Ae=()=>{D(),V(mt(c.value)),M("\u6253\u9F13\uFF1A10 \u4E2A\u97F3\u6548\u57AB\u5DF2\u6062\u590D\u9ED8\u8BA4","muted")},Ue=e=>{D();const t=Math.max(0,Math.min(15,e));lt(t),I.current=-1/0,v.current=-1/0,P({force:!0}),M(`\u6253\u9F13\uFF1A\u53D1\u58F0\u901A\u9053 \u2192 CH${t+1}`,"muted")},Oe=e=>{Z({...c.value,bpm:e})},Be=()=>{V(c.value)},Ee=e=>{Z({...c.value,fixedVelocity:e})},_e=e=>{const t=_({fixedVelocity:e});M(`\u6253\u9F13\uFF1A\u56FA\u5B9A/Loop \u529B\u5EA6 ${t.fixedVelocity}`,"muted")},Le=e=>{Z({...c.value,centerVelocity:Math.max(e,c.value.edgeVelocity)})},Ne=e=>{const t=_({centerVelocity:Math.max(e,c.value.edgeVelocity)});M(`\u6253\u9F13\uFF1A\u4E2D\u5FC3\u529B\u5EA6 ${t.centerVelocity}`,"muted")},Ge=e=>{Z({...c.value,edgeVelocity:Math.min(e,c.value.centerVelocity)})},He=e=>{const t=_({edgeVelocity:Math.min(e,c.value.centerVelocity)});M(`\u6253\u9F13\uFF1A\u8FB9\u7F18\u529B\u5EA6 ${t.edgeVelocity}`,"muted")},Ye=e=>{D(),_({velocityMode:e}),M(`\u6253\u9F13\uFF1A\u529B\u5EA6\u6A21\u5F0F ${e==="POSITION"?"\u4F4D\u7F6E\u529B\u5EA6":"\u56FA\u5B9A\u529B\u5EA6"}`,"muted")},qe=e=>{D(),_({transposeCompensation:e}),M(e?"\u6253\u9F13\uFF1A\u79FB\u8C03\u8865\u507F\u5DF2\u5F00\u542F":"\u6253\u9F13\uFF1A\u79FB\u8C03\u8865\u507F\u5DF2\u5173\u95ED","muted")},je=()=>{D(),V(ft(c.value)),M("\u6253\u9F13\uFF1A\u53D1\u9001\u5230\u5168\u90E8\u7434","muted"),P({force:!0})},We=(e,t)=>{D();const o=$e(),p=[...o.midi,...o.sx].map(C=>C.key),b=V(vt(c.value,e,t,p));M(b.sendAllTargets?"\u6253\u9F13\uFF1A\u53D1\u9001\u5230\u5168\u90E8\u7434":`\u6253\u9F13\uFF1A\u53D1\u9001\u76EE\u6807 \u2192 ${b.targetKeys.length} \u53F0\u7434`,"muted"),P({force:!0})},ze=()=>{const e=ht(c.value);V(e),M("\u6253\u9F13\uFF1A16 \u6B65 Loop \u5DF2\u6E05\u7A7A","muted"),d(!1)},Je=(e,t)=>{Z(e),t&&we(t)},Qe=()=>{V(c.value)},ve=(()=>{let e="";return $?(e=`16 \u6B65 LOOP \xB7 4/4 \xB7 1 \u5C0F\u8282 \xB7 ${s.bpm} BPM`,u&&(e+=" \xB7 \u97F3\u6548")):u?(e=`SFX PADS \xB7 SFX Kit GM \xB7 MIDI \xB7 CH ${S+1}`,s.transposeCompensation&&(e+=" \xB7 \u79FB\u8C03\u8865\u507F\u5F00")):(e=`DRUM PADS \xB7 MIDI / SX \xB7 CH ${S+1}`,s.transposeCompensation&&(e+=" \xB7 \u79FB\u8C03\u8865\u507F\u5F00")),s.sendAllTargets===!1&&(e+=` \xB7 \u53D1\u9001 ${bt().length} \u53F0\u7434`),f&&(e+=` \xB7 \u64AD\u653E\u4E2D ${h+1}/16`),e+=` \xB7 ${it().shortText}`,e})(),Ze=f?"success":s.transposeCompensation?"accent-alt":"";return i`
    <div class="sub-screen drum-screen">
      <div class="drum-header">
        ${$?i`<button type="button" class="back-btn drum-back" title="返回打击垫" onClick=${()=>te(!1)}>‹ 打击垫</button>`:n?null:i`<button type="button" class="back-btn" onClick=${Pe}>‹ 返回</button>`}
        <div class="drum-heading">
          <h1>打鼓</h1>
          <p class=${Ze} title=${ve}>${ve}</p>
        </div>
        <div class="drum-header-actions">
          <${F} label="鼓垫" selected=${!$} onClick=${()=>te(!1)} />
          <${F} label="16 步 Loop" selected=${$} onClick=${()=>te(!0)} />
          ${!$&&!f?i`
                <${E}
                  label=${u?"\u6362\u97F3\u6548":a?"\u5B8C\u6210":"\u6392\u5E8F"}
                  onClick=${()=>{D(),u?U(!0):w(e=>!e)}}
                />
              `:null}
          ${f?i`<${E} label="■ 停止" onClick=${fe} />`:null}
          <${Dt} connected=${y} />
          <${E} label="设置" onClick=${()=>{D(),X(!0)}} />
        </div>
      </div>

      ${a?i`<${Tt} />`:!y&&!$?i`<${kt} sfxMode=${u} />`:!$&&!x?i`<${It} />`:!$&&u&&!g?i`<${Xt} />`:null}

      ${$?i`
            <${wt}
              bpm=${s.bpm}
              playing=${f}
              onTogglePlay=${fe}
              onBpmPreview=${Oe}
              onBpmCommit=${Be}
              onClear=${()=>d(!0)}
            />
            <${st}
              state=${s}
              playing=${f}
              playhead=${h}
              onPreview=${Je}
              onCommit=${Qe}
            />
            <div class=${`drum-footer${!y||l?" danger":""}`}>
              ${y?l?"\u97F3\u6548 Loop \u53EA\u53D1\u9001\u666E\u901A MIDI\uFF1B\u5F53\u524D\u53EA\u6709 SX \u56DE\u73AF\uFF0C\u4E0D\u4F1A\u53D1\u58F0":"\u70B9\u6216\u62D6\u52A8\u65B9\u683C\u5FEB\u901F\u7F16\u6392 \xB7 \u6BCF 4 \u683C\u4E00\u62CD \xB7 \u5FAA\u73AF\u64AD\u653E \xB7 \u7F16\u6392\u4F1A\u81EA\u52A8\u4FDD\u5B58":"\u672A\u8FDE\u63A5\u7434\uFF1A\u53EF\u4EE5\u5148\u7F16\u6392\uFF0C\u64AD\u653E\u53EA\u8D70\u754C\u9762\u4E0D\u51FA\u58F0 \xB7 \u8FDE\u63A5 PA700 / SX \u540E\u81EA\u52A8\u53D1\u9001"}
            </div>
          `:i`
            <${xt}
              state=${s}
              editMode=${a}
              velocityMode=${s.velocityMode}
              fixedVelocity=${s.fixedVelocity}
              centerVelocity=${s.centerVelocity}
              edgeVelocity=${s.edgeVelocity}
              onPadDown=${Ie}
              onPadUp=${Xe}
              onSwap=${Te}
            />
            <div class="drum-footer ${u?"two-lines":""}">
              ${a?"\u6392\u5E8F\u6A21\u5F0F\uFF1A\u62D6\u52A8\u9F13\u57AB\u5230\u76EE\u6807\u9F13\u57AB\u4E0A\u677E\u624B\u4EA4\u6362 \xB7 \u70B9\u300C\u5B8C\u6210\u300D\u8FD4\u56DE\u6F14\u594F":f?"Loop \u6B63\u5728\u64AD\u653E \xB7 \u53EF\u4EE5\u76F4\u63A5\u5728\u9F13\u57AB\u4E0A\u8DDF\u7740\u6253 \xB7 \u70B9\u4E0A\u65B9\u300C\u25A0 \u505C\u6B62\u300D\u7ED3\u675F":u?"\u97F3\u6548\u57AB\uFF1A\u6309\u4E0B\u89E6\u53D1\u97F3\u6548 \xB7 \u70B9\u4E0A\u65B9\u300C\u6362\u97F3\u6548\u300D\u7ED9 10 \u4E2A\u57AB\u6362\u58F0\u97F3 \xB7 \u4F7F\u7528 PA700 \u7684 SFX Kit GM":"\u6309\u4E0B\u5373\u89E6\u53D1 \xB7 \u677E\u5F00\u53D1\u9001 Note Off \xB7 \u8BBE\u7F6E\u91CC\u53EF\u8C03\u529B\u5EA6\u548C\u9F13\u7EC4"}
            </div>
          `}

      ${k?i`
            <${Vt}
              state=${s}
              channel=${S}
              targets=${$e()}
              onClose=${()=>X(!1)}
              onOpenSfxEditor=${()=>{X(!1),U(!0)}}
              onChannelChange=${Ue}
              onPadModeChange=${Fe}
              onSelectKit=${Ve}
              onVelocityModeChange=${Ye}
              onVelocityPreview=${Ee}
              onVelocityCommit=${()=>_e(c.value.fixedVelocity)}
              onCenterPreview=${Le}
              onCenterCommit=${()=>Ne(c.value.centerVelocity)}
              onEdgePreview=${Ge}
              onEdgeCommit=${()=>He(c.value.edgeVelocity)}
              onCompensationChange=${qe}
              onResendKit=${Re}
              onTargetAll=${je}
              onTargetToggle=${We}
            />
          `:null}

      ${W?i`
            <${Rt}
              state=${s}
              onClose=${()=>U(!1)}
              onAssign=${Ke}
              onReset=${Ae}
            />
          `:null}

      ${z?i`
            <${tt}
              title="清空 16 步？"
              message="所有鼓垫的编排都会被删除，此操作不能撤销。"
              actions=${[{label:"\u53D6\u6D88",onClick:()=>d(!1)},{label:"\u6E05\u7A7A",danger:!0,onClick:ze}]}
            />
          `:null}
    </div>
  `}export{Qt as DrumScreen};
