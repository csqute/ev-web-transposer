import{useEffect as j,useState as ae}from"preact/hooks";import{html as c,SmallButton as E,AppDialog as oe,Chip as T,haptic as v}from"../ui/components.js";import{Fader as ce}from"../ui/Fader.js";import{navigate as re}from"../app/router.js";import{addLog as M,consumeUse as B,hasUses as U,licenseView as de,midi as q,mixerChannels as $,mixerTargets as x,openDialog as H,previewMixerChannel as ue,saveMixerChannels as w,saveMixerTargets as D,showToast as z,updateMixerChannel as J}from"../app/store.js";import{MIXER_CHANNELS as N,allMuted as Q,channelsForTarget as _,resetChannels as pe,styleAtMax as me}from"../core/mixer/model.js";import{currentMixerTargets as K,listForTarget as W,mixerDeviceLists as Z,targetsFor as $e}from"../core/mixer/targets.js";import{connectMidi as fe,sendCcToDevices as R,sendMessagesToDevice as ve}from"../core/midi/engine.js";import{xgVolumeRequest as he}from"../core/sxreg/xg.js";import{readXgVolumes as ge}from"../core/sxreg/volumes.js";const A={MIDI:"\u666E\u901A MIDI \u7434",SX:"SX \u56DE\u73AF\u7434"},xe={MIDI:"\u9ED8\u8BA4\uFF1A1 / 2 / 3 / 4 / 10 / 11 / 9",SX:"\u9ED8\u8BA4\uFF1A\u53F31=1 / \u53F32=2 / \u53F33=3 / \u5DE6=4 / \u9F13=9 / \u6253\u51FB\u4E50=10 / \u8D1D\u65AF=11"};function L(n,r){return r==="SX"?n.group==="SX":n.group!=="SX"}function Ie(n){return n.duplicate?`${n.displayName} #${n.ordinal}`:n.displayName}function ye({count:n}){return c`
    <span
      class=${`mixer-conn${n>0?" on":""}`}
      title=${n>0?`\u6B63\u5728\u63A7\u5236 ${n} \u53F0\u7434`:"\u672A\u9009\u62E9\u8BBE\u5907"}
    >
      <span class="mixer-conn-dot"></span>
      ${n>0?`\u53D7\u63A7 ${n} \u53F0`:"\u672A\u9009\u62E9\u8BBE\u5907"}
    </span>
  `}function Ce({target:n,channels:r}){const h=r.filter(f=>f.definition.group==="KEYBOARD_SET").length,X=r.filter(f=>f.definition.group==="STYLE").length,I=r.filter(f=>!f.definition.style).length,i=r.filter(f=>f.definition.style).length;return c`
    <div class="mixer-legend">
      ${n==="MIDI"?c`
            <span class="legend-item"><span class="legend-dot accent"></span>组合音色 · ${h} 个通道</span>
            <span class="legend-item"><span class="legend-dot accent-alt"></span>STYLE 伴奏 · ${X} 个通道</span>
          `:c`
            <span class="legend-item"><span class="legend-dot accent"></span>SX 键盘 · ${I} 个通道（左 / 右 1–3）</span>
            <span class="legend-item"><span class="legend-dot accent-alt"></span>SX 伴奏 · ${i} 个通道（鼓 / 打击乐 / 贝斯）</span>
          `}
      <span class="legend-spacer"></span>
      <span class="legend-hint">上下拖动推子 · 点按 ON/OFF 开关静音</span>
    </div>
  `}function Me({value:n,onChange:r}){return c`
    <div class="mixer-channel-stepper">
      <button
        type="button"
        class="stepper-btn"
        disabled=${n<=0}
        onClick=${()=>r(Math.max(0,n-1))}
      >−</button>
      <span class="stepper-value">${n+1}</span>
      <button
        type="button"
        class="stepper-btn"
        disabled=${n>=15}
        onClick=${()=>r(Math.min(15,n+1))}
      >＋</button>
    </div>
  `}function be({target:n,lists:r,config:h,channels:X,onClose:I,onTargetChange:i,onDeviceToggle:f,onSelectAll:y,onClear:b,onChannelChange:F,onResetChannels:O,onReadVolumes:V}){const g=W(r,n),C=n==="SX"?h.sxAll:h.midiAll,k=n==="SX"?h.sxKeys:h.midiKeys,G=C?g.length:g.filter(d=>k.includes(d.key)).length;return c`
    <${oe} title="调音台设置" onClose=${I}>
      <div class="mixer-settings">
        <h3 class="section-title">控制目标</h3>
        <div class="chip-row">
          <${T}
            label=${`\u666E\u901A MIDI (${r.midiDevices.length})`}
            selected=${n==="MIDI"}
            onClick=${()=>i("MIDI")}
          />
          <${T}
            label=${`SX \u56DE\u73AF (${r.sxDevices.length})`}
            selected=${n==="SX"}
            onClick=${()=>i("SX")}
          />
        </div>
        <p class="hint">可同时控制多台琴；切换目标只影响调音台，不改变每台琴的演奏模式。</p>

        <div class="mixer-divider-line"></div>

        <div class="mixer-settings-row">
          <h3 class="section-title">控制设备</h3>
          <span class="settings-row-spacer"></span>
          <${T} label="全选" selected=${C} onClick=${y} />
          <${T} label="清空" selected=${!C&&k.length===0} onClick=${b} />
        </div>

        ${g.length===0?c`
              <p class="hint">
                ${n==="MIDI"?"\u672A\u8FDE\u63A5\u666E\u901A MIDI \u7434\u3002\u8FDE\u63A5\u540E\u5728\u4E3B\u754C\u9762\u9009\u62E9\u79FB\u8C03\u6A21\u5F0F\uFF0C\u518D\u56DE\u5230\u8FD9\u91CC\u3002":"\u672A\u8FDE\u63A5 SX \u56DE\u73AF\u7434\u3002\u63A5\u597D USB TO HOST \u5E76\u5728\u4E3B\u754C\u9762\u628A\u8BE5\u7434\u8BBE\u4E3A\u300C\u56DE\u73AF\u6A21\u5F0F\uFF08\u96C5\u9A6C\u54C8SX\uFF09\u300D\u3002"}
              </p>
            `:c`
              <div class="mixer-device-list">
                ${g.map(d=>{const S=C||k.includes(d.key);return c`
                    <${T}
                      label=${Ie(d)}
                      selected=${S}
                      title=${d.outputName||d.displayName}
                      onClick=${()=>f(d,!S)}
                    />
                  `})}
              </div>
            `}
        ${g.length>0?c`
              <p class="hint">
                ${C?`\u5F53\u524D\u63A7\u5236\u5168\u90E8 ${g.length} \u53F0\u7434\u3002\u53D6\u6D88\u300C\u5168\u9009\u300D\u540E\u53EF\u5355\u72EC\u52FE\u9009\u3002`:`\u5DF2\u9009 ${G} \u53F0\u7434\u3002`}
              </p>
            `:null}

        <div class="mixer-divider-line"></div>

        <h3 class="section-title">通道映射</h3>
        <p class="hint">
          ${n==="MIDI"?"\u6BCF\u4E2A\u63A8\u5B50\u53D1\u9001 MIDI CC#7\uFF08Channel Volume\uFF09\u3002KORG PA700 \u51FA\u5382\u9ED8\u8BA4\u7684 MIDI IN \u901A\u9053\u5982\u4E0B\uFF1B\u5982\u679C\u4F60\u5728\u7434\u4E0A\u6539\u8FC7\u901A\u9053\uFF0C\u8BF7\u5728\u8FD9\u91CC\u6539\u6210\u4E00\u81F4\u3002":"SX \u6BCF\u8DEF\u63A8\u5B50\u4E5F\u53D1\u9001 CC#7\uFF08Channel Volume\uFF09\u3002\u9ED8\u8BA4\u6309\u53F3\u624B 1/2/3 = \u901A\u9053 1/2/3\u3001\u5DE6\u624B = \u901A\u9053 4\uFF1B\u9F13\uFF08Rhythm 1\uFF09= \u901A\u9053 9\u3001\u6253\u51FB\u4E50\uFF08Rhythm 2\uFF09= \u901A\u9053 10\u3001\u8D1D\u65AF = \u901A\u9053 11\uFF1B\u8BF7\u4E0E\u4F60\u7434\u4E0A\u7684 MIDI \u8BBE\u7F6E\u4FDD\u6301\u4E00\u81F4\u3002"}
        </p>

        <div class="mixer-channel-list">
          ${X.map(d=>c`
            <div class="mixer-channel-row">
              <span class=${`legend-dot ${d.definition.style?"accent-alt":"accent"}`}></span>
              <span class="mixer-channel-name">${d.definition.full}</span>
              <span class="mixer-channel-sub">${d.definition.subtitle}</span>
              <${Me}
                value=${d.channel}
                onChange=${S=>F(d.definition.id,S)}
              />
            </div>
          `)}
        </div>

        <div class="mixer-settings-row mixer-reset-row">
          <${E}
            label=${n==="MIDI"?"\u6062\u590D PA700 \u9ED8\u8BA4\u901A\u9053":"\u6062\u590D SX \u9ED8\u8BA4\u901A\u9053"}
            onClick=${O}
          />
          <span class="settings-row-spacer"></span>
          <span class="hint">${xe[n]}</span>
        </div>

        ${n==="SX"?c`
              <div class="mixer-settings-row">
                <${E} label="从琴上读回当前音量" onClick=${V} />
              </div>
              <p class="hint">
                进入页面时会自动读回；推子和静音只在有修改时才发送，
                不会一接上琴就把琴的音量改成 App 的旧值。
              </p>
            `:null}

        <p class="hint mixer-settings-foot">
          ${n==="MIDI"?"\u63A8\u5B50\u6CA1\u6709\u53CD\u5E94\u65F6\uFF1A\u5728\u7434\u4E0A\u8FDB\u5165 Global \u203A MIDI \u203A MIDI IN Channels\uFF0C\u786E\u8BA4 Drum\u3001Percussion\u3001Bass\u3001Upper 1\u20133\u3001Lower \u5BF9\u5E94\u5230\u8FD9\u91CC\u663E\u793A\u7684\u901A\u9053\uFF1B\u5E76\u786E\u8BA4 Global \u203A MIDI \u203A Filters \u6CA1\u6709\u5C4F\u853D Control Change\u3002":"\u63A8\u5B50\u6CA1\u6709\u53CD\u5E94\u65F6\uFF1A\u786E\u8BA4 SX \u7684\u53F3\u624B 1/2/3 / \u5DE6\u624B\u548C Style \u5404\u8F68 MIDI \u63A5\u6536\u901A\u9053\u4E0E\u8FD9\u91CC\u4E00\u81F4\uFF1BLocal Control Off \u53EA\u5173\u95ED\u7434\u952E\u76F4\u63A5\u53D1\u58F0\uFF0C\u4E0D\u4F1A\u963B\u6B62 CC#7 \u8C03\u97F3\u91CF\u3002"}
        </p>
      </div>
    <//>
  `}function Ke({embedded:n=!1}){const[r,h]=ae(!1),X=de(),I=x.value,i=I.target,f=Z(),y=$e(I,i,f),b=_($.value,i),F=Q($.value,i),O=X.text,V=`${i}|${y.map(e=>{var l,t;return`${e.key}:${((t=(l=e.output)==null?void 0:l.port)==null?void 0:t.id)||e.outputName}`}).join("|")}`;j(()=>{q.value.supported&&q.value.status!=="connected"&&fe().catch(()=>{})},[]);const g=async()=>{if(i!=="SX"||!y.length)return;const e=y[0],l=_($.value,i),t=await ge(e,l.map(a=>a.channel),async a=>{for(const p of a)await ve(e,[he(p)])});if(!t.size){M("\u8C03\u97F3\u53F0\uFF1A\u26A0\uFE0F \u6CA1\u8BFB\u56DE SX \u97F3\u91CF\uFF08\u7434\u53EF\u80FD\u4E0D\u652F\u6301 XG \u53C2\u6570\u8BF7\u6C42\uFF09","warn");return}const s={...$.value};let o=0;for(const a of l){const p=t.get(a.channel);if(p===void 0)continue;const m=s[a.definition.id];m&&(m.volume!==p||m.muted)&&(s[a.definition.id]={...m,volume:p,muted:!1},o+=1)}if(!o)return;w(s);const u=l.filter(a=>t.has(a.channel)).map(a=>`${a.definition.short}=${t.get(a.channel)}`).join(" ");M(`\u8C03\u97F3\u53F0\uFF1A\u5DF2\u4ECE ${e.displayName} \u8BFB\u56DE\u97F3\u91CF ${u}`,"ok")};j(()=>{if(i!=="SX"||!y.length)return;let e=!1;return(async()=>{e||await g()})().catch(()=>{}),()=>{e=!0}},[V]);const C=e=>{e!==i&&(v(),D({...x.value,target:e}),M(`\u8C03\u97F3\u53F0\uFF1A\u5207\u6362\u76EE\u6807 \u2192 ${A[e]}`,"muted"))},k=(e,l)=>{v();const t=x.value,s=i==="MIDI"?t.midiKeys:t.sxKeys,o=W(Z(),i),u=i==="MIDI"?t.midiAll:t.sxAll,a=new Set(u?o.map(m=>m.key):s);l?a.add(e.key):a.delete(e.key);const p=o.length>0&&o.every(m=>a.has(m.key));i==="MIDI"?D({...t,midiAll:p,midiKeys:[...a]}):D({...t,sxAll:p,sxKeys:[...a]})},G=()=>{v();const e=x.value;D(i==="MIDI"?{...e,midiAll:!0}:{...e,sxAll:!0})},d=()=>{v();const e=x.value;i==="MIDI"?D({...e,midiAll:!1,midiKeys:[]}):D({...e,sxAll:!1,sxKeys:[]})},S=(e,l)=>{v();const t=N.find(o=>o.id===e);!t||!L(t,i)||!$.value[e]||(J(e,{channel:l}),M(`\u8C03\u97F3\u53F0\uFF1A${t.full} \u2192 \u901A\u9053 ${l+1}`,"muted"))},ee=()=>{v(),w(pe($.value,i)),z(`${A[i]}\u5DF2\u6062\u590D\u9ED8\u8BA4\u901A\u9053`),M(`\u8C03\u97F3\u53F0\uFF1A\u5DF2\u6062\u590D ${A[i]} \u9ED8\u8BA4\u901A\u9053`,"muted")},P=(e,l,t)=>{const s=$.value[e];w($.value),s&&t.length>0&&!s.muted&&s.volume!==l&&B(1)},te=(e,l,t,s)=>{const o=x.value,u=N.find(le=>le.id===e);if(!u||!L(u,o.target))return!1;const a=$.value[e];if(!a)return!1;const p=K(o),m=Math.max(0,Math.min(127,l));return!t&&m!==s&&a.volume===s&&p.length>0&&!a.muted&&!U(1)?(H("paywall"),!1):a.volume===m?(t&&P(e,s,p),!0):(ue(e,{volume:m}),a.muted||R(p,a.channel,7,m).catch(()=>{}),t&&P(e,s,p),!0)},ne=e=>{const l=N.find(u=>u.id===e);if(!l||!L(l,x.value.target))return;const t=$.value[e];if(!t)return;const s=K();if(s.length>0&&!U(1)){H("paywall");return}const o=!t.muted;J(e,{muted:o}),s.length>0&&(R(s,t.channel,7,o?0:t.volume).catch(()=>{}),B(1))},se=()=>{v();const e=x.value,t=!Q($.value,e.target),s=K(e);if(s.length>0&&!U(1)){H("paywall");return}const o={...$.value};for(const u of N)L(u,e.target)&&(o[u.id]={...o[u.id],muted:t});w(o);for(const u of _(o,e.target))R(s,u.channel,7,t?0:u.volume).catch(()=>{});s.length>0&&B(1),M(t?`\u8C03\u97F3\u53F0\uFF1A${A[e.target]} \u5168\u90E8\u901A\u9053\u9759\u97F3`:`\u8C03\u97F3\u53F0\uFF1A${A[e.target]} \u5168\u90E8\u901A\u9053\u6062\u590D`,"muted")},ie=()=>{v();const e=x.value.target,l=me($.value,e);w(l);const t=K();for(const s of N){if(!s.style||!L(s,e))continue;const o=l[s.id];R(t,o.channel,7,127).catch(()=>{})}z("\u9F13 / \u6253\u51FB\u4E50 / \u8D1D\u65AF\u5DF2\u62C9\u6EE1 127"),M("\u8C03\u97F3\u53F0\uFF1A\u9F13 / \u6253\u51FB\u4E50 / \u8D1D\u65AF\u5DF2\u4E00\u952E\u62C9\u6EE1 127","muted")},Y=i==="SX"?"SX\uFF1A\u8FDB\u5165\u9875\u9762\u4ECE\u7434\u4E0A\u8BFB\u56DE\u97F3\u91CF\uFF0C\u4E0D\u4F1A\u81EA\u52A8\u6539\u7434 \xB7 \u53EA\u6709\u63A8\u5B50/\u9759\u97F3\u6709\u4FEE\u6539\u624D\u53D1\u9001 \xB7 \u901A\u9053\u5728\u8BBE\u7F6E\u91CC\u6539":"\u8FDB\u5165\u9875\u9762\u4E0D\u4F1A\u81EA\u52A8\u53D1\u9001 \xB7 \u53EA\u6709\u63A8\u5B50/\u9759\u97F3\u6709\u4FEE\u6539\u624D\u53D1\u9001 \xB7 \u63A8\u5B50\u9700\u63A8\u8FC7\u5F53\u524D\u503C\u70B9\u624D\u5F00\u59CB\u53D8\u5316\uFF08\u9632\u8DF3\u53D8\uFF09";return c`
    <div class="sub-screen mixer-screen">
      <div class="mixer-header">
        ${n?null:c`<button type="button" class="back-btn" onClick=${()=>re("transpose")}>‹ 返回</button>`}
        <div class="mixer-heading">
          <h1>通道调音台</h1>
          <p>${A[i]} · CC#7 音量 · ${O}</p>
        </div>
        <div class="mixer-header-actions">
          <${ye} count=${y.length} />
          <button type="button" class="mixer-boost" onClick=${ie}>节奏拉满</button>
          <${E} label=${F?"\u5168\u90E8\u6062\u590D":"\u5168\u90E8\u9759\u97F3"} onClick=${se} />
          <${E} label="设置" onClick=${()=>{v(),h(!0)}} />
        </div>
      </div>

      <${Ce} target=${i} channels=${b} />

      <div class="mixer-faders">
        ${b.map((e,l)=>c`
          ${l===4?c`<div class="mixer-strip-divider"></div>`:null}
          <div class=${`mixer-strip ${e.definition.style?"style":"keyboard"}${e.muted?" muted":""}`}>
            <span class="mixer-strip-color"></span>
            <div class="mixer-strip-name">${e.definition.short}</div>
            <div class="mixer-strip-sub" title=${`${e.definition.subtitle} \xB7 CH${e.channel+1}`}>
              ${e.definition.subtitle} · CH${e.channel+1}
            </div>
            <div class="mixer-volume">
              <span class="mixer-volume-value">${e.volume}</span><span class="mixer-volume-max">/127</span>
            </div>
            <${ce}
              value=${e.volume}
              muted=${e.muted}
              onVolume=${(t,s,o)=>te(e.definition.id,t,s,o)}
              onToggleMute=${()=>ne(e.definition.id)}
            />
          </div>
        `)}
        ${Array.from({length:Math.max(0,7-b.length)},()=>c`
          <div class="mixer-strip-spacer"></div>
        `)}
      </div>

      <div class="mixer-footnote" title=${Y}>${Y}</div>

      ${r?c`
            <${be}
              target=${i}
              lists=${f}
              config=${I}
              channels=${b}
              onClose=${()=>h(!1)}
              onTargetChange=${C}
              onDeviceToggle=${k}
              onSelectAll=${G}
              onClear=${d}
              onChannelChange=${S}
              onResetChannels=${ee}
              onReadVolumes=${()=>{v(),g().catch(()=>{})}}
            />
          `:null}
    </div>
  `}export{Ke as MixerScreen};
