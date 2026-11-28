import{useState as f}from"preact/hooks";import{html as s,AppDialog as I,AlertDialog as E,SmallButton as D,haptic as v}from"../ui/components.js";import{navigate as L}from"../app/router.js";import{applyChannelPreset as O,clearStudioTrackChannel as F,currentChannelMap as U,deleteChannelPreset as j,midiChannelPresets as B,renameChannelPreset as z,saveCurrentChannelPreset as K,setChannelRole as X,setStudioMuteUnassigned as Y,setStudioTrackChannel as q,showToast as g,studioMuteUnassigned as G,studioTrackChannels as J}from"../app/store.js";import{CHANNEL_FAMILIES as Q,CHANNEL_PRESET_MAX_NAME as A,FACTORY_PRESET_ID as V,STUDIO_TRACK_COUNT as W,channelFamily as Z,factoryChannelPreset as P,normalizeStudioTracks as H,presetSummary as nn,rolesForFamily as T,studioTrackChannel as ln}from"../core/channels/model.js";function N(a,n=null){return a?a.control?"control":a.style?"style":"accent":n!=null?"studio":"unused"}function an({channel:a,role:n,extraRoles:$,studioTrack:e=null,onClick:i}){const u=$.map(h=>h.shortLabel||h.label);e!==null&&n&&u.push(`\u5DE5\u4F5C\u7AD9${e+1}`);const r=n?s`
        <span class="channel-role-full">${n.label}</span>
        <span class="channel-role-compact">${n.shortLabel||n.label}</span>
      `:e!==null?s`
          <span class="channel-role-full">工作站 · 轨道 ${e+1}</span>
          <span class="channel-role-compact">工作站${e+1}</span>
        `:"\u672A\u4F7F\u7528",p=n?n.detail:e!==null?`\u5DE5\u4F5C\u7AD9\u7B2C ${e+1} \u8F68\u4ECE CH ${a+1} \u53D1\u58F0`:"\u8FD9\u4E2A\u901A\u9053\u4E0D\u53D1\u9001\u4EFB\u4F55\u529F\u80FD";return s`
    <button
      type="button"
      class=${`channel-cell ${N(n,e)}`}
      data-channel=${a}
      onClick=${i}
    >
      <span class="channel-cell-top">
        <span class="channel-cell-number">CH ${a+1}</span>
        ${u.length>0?s`<span class="channel-cell-shared">＋${u.join("\u3001")}</span>`:null}
      </span>
      <span class="channel-cell-role">${r}</span>
      <span class="channel-cell-detail">${p}</span>
    </button>
  `}function en({channel:a,familyId:n,channelMap:$,studioTracks:e,onPick:i,onPickStudio:u,onClearStudio:r,onClose:p}){const h=T(n),t=h.find(o=>$[o.id]===a),m=Object.keys(H(e)).map(Number).find(o=>e[o]===a);return s`
    <${I} title=${`CH ${a+1} \xB7 \u9009\u62E9\u529F\u80FD`} onClose=${p}>
      <p class="channel-dialog-hint">
        ${t?`\u5F53\u524D\u662F\u300C${t.label}\u300D\u3002\u9009\u62E9\u5176\u4ED6\u529F\u80FD\u4F1A\u4E0E\u5B83\u4E92\u6362\u901A\u9053\u3002`:`\u9009\u62E9\u540E\uFF0C\u8FD9\u4E2A\u529F\u80FD\u4F1A\u79FB\u5230 CH ${a+1}\u3002`}
      </p>
      <div class="channel-role-list">
        ${h.map(o=>{var C;const b=(C=$[o.id])!=null?C:o.defaultChannel,d=b===a;return s`
            <button
              type="button"
              class=${`channel-role-row ${N(o)}${d?" selected":""}`}
              data-role=${o.id}
              onClick=${()=>i(o.id)}
            >
              <span class="channel-role-bar"></span>
              <span class="channel-role-text">
                <span class="channel-role-name">${o.label}</span>
                <span class="channel-role-detail">${o.detail}</span>
              </span>
              <span class="channel-role-channel">
                ${d?"\u5F53\u524D":`CH ${b+1}`}
              </span>
            </button>
          `})}
      </div>
      ${n==="MIDI"?s`
            <h3 class="section-title channel-studio-title">工作站轨道</h3>
            <p class="channel-dialog-hint">
              选一轨把它的声音放到 CH ${a+1}。工作站轨道和上面的移调器功能
              是两套分配，可以共用同一个通道；同一轨再选别的通道会自动换过去。
            </p>
            ${m!==void 0?s`
                  <div class="channel-studio-current">
                    <span>当前通道：工作站 · 轨道 ${m+1}</span>
                    <button
                      type="button"
                      class="small-btn danger"
                      onClick=${()=>r(m)}
                    >取消分配</button>
                  </div>
                `:null}
            <div class="channel-role-list">
              ${Array.from({length:W},(o,b)=>{const d=ln(e,b),C=d===a;return s`
                  <button
                    type="button"
                    class=${`channel-role-row studio${C?" selected":""}`}
                    data-studio-track=${b}
                    onClick=${()=>u(b)}
                  >
                    <span class="channel-role-bar"></span>
                    <span class="channel-role-text">
                      <span class="channel-role-name">工作站 · 轨道 ${b+1}</span>
                      <span class="channel-role-detail">
                        ${d===null?"\u8FD8\u6CA1\u6709\u5206\u914D\u901A\u9053":`\u8F93\u51FA\u5230 CH ${d+1}`}
                      </span>
                    </span>
                    <span class="channel-role-channel">
                      ${C?"\u5F53\u524D":d===null?"\u672A\u5206\u914D":`CH ${d+1}`}
                    </span>
                  </button>
                `})}
            </div>
          `:null}
    <//>
  `}function sn({preset:a,onClose:n}){const[$,e]=f(a.name),[i,u]=f(""),r=()=>{z(a.id,$)?(v(),g("\u9884\u8BBE\u5DF2\u6539\u540D"),n()):u("\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A\uFF0C\u4E5F\u4E0D\u80FD\u548C\u5DF2\u6709\u9884\u8BBE\u91CD\u540D")};return s`
    <${I} title="重命名预设" onClose=${n}>
      <p class="channel-dialog-hint">给「${a.name}」换一个名字。</p>
      <input
        class="channel-name-input"
        value=${$}
        maxLength=${A}
        onInput=${p=>{e(p.currentTarget.value),u("")}}
        placeholder="例如：现场 A"
      />
      ${i?s`<p class="channel-dialog-error">${i}</p>`:null}
      <div class="channel-dialog-actions">
        <${D} label="取消" onClick=${n} />
        <${D} label="保存" onClick=${r} />
      </div>
    <//>
  `}function tn({onClose:a,onRename:n,onDelete:$}){const e=B.value,i=[P(),...e],[u,r]=f(""),p=t=>{v(),O(t),g(`\u5DF2\u5E94\u7528\u9884\u8BBE\u300C${t.name}\u300D`)},h=()=>{K(u)&&(v(),r(""),g("\u5DF2\u4FDD\u5B58\u5F53\u524D\u901A\u9053\u914D\u7F6E"))};return s`
    <${I} title="MIDI 总配置预设" onClose=${a} wide=${!0}>
      <p class="channel-dialog-hint">
        预设会保存三个页签的全部通道和工作站轨道分配；「自动屏蔽」开关保持当前设置。应用预设不会发送 MIDI，也不会扣次数。
      </p>
      <h3 class="section-title">应用预设</h3>
      <div class="channel-preset-list">
        ${i.map(t=>s`
          <div
            class="channel-preset-row"
            data-preset=${t.id}
          >
            <div class="channel-preset-text">
              <span class="channel-preset-name">${t.name}</span>
              <span class="channel-preset-summary">${nn(t)}</span>
            </div>
            <div class="channel-preset-actions">
              <button
                type="button"
                class="small-btn"
                onClick=${()=>p(t)}
              >应用</button>
              ${t.id===V?null:s`
                    <button
                      type="button"
                      class="small-btn"
                      onClick=${()=>n(t)}
                    >改名</button>
                    <button
                      type="button"
                      class="small-btn danger"
                      onClick=${()=>$(t)}
                    >删除</button>
                  `}
            </div>
          </div>
        `)}
      </div>
      <h3 class="section-title">保存当前配置</h3>
      <div class="channel-save-row">
        <input
          class="channel-name-input"
          value=${u}
          maxLength=${A}
          onInput=${t=>r(t.currentTarget.value)}
          placeholder="预设名称，例如：现场 A"
        />
        <button type="button" class="small-btn" onClick=${h}>保存</button>
      </div>
      <p class="channel-dialog-hint">
        保存和已有预设同名的配置会更新那个预设。最多 30 个。
      </p>
      <div class="channel-dialog-actions">
        <button
          type="button"
          class="small-btn"
          onClick=${()=>p(P())}
        >恢复出厂默认</button>
      </div>
    <//>
  `}function pn({embedded:a=!1}){var M;const[n,$]=f("MIDI"),[e,i]=f(-1),[u,r]=f(!1),[p,h]=f(null),[t,m]=f(null),o=Z(n),b=T(n),d=U(),C=H(J.value),y={};for(const l of b){const c=(M=d[l.id])!=null?M:l.defaultChannel;y[c]||(y[c]=[]),y[c].push(l)}const S={};for(const[l,c]of Object.entries(C))S[c]=Number(l);const R=l=>{const c=b.find(k=>k.id===l);v(),X(l,e),g(`${(c==null?void 0:c.label)||l} \u2192 CH ${e+1}`),i(-1)},_=l=>{v(),q(l,e),g(`\u5DE5\u4F5C\u7AD9 \xB7 \u8F68\u9053 ${l+1} \u2192 CH ${e+1}`),i(-1)},x=l=>{v(),F(l),g(`\u5DE5\u4F5C\u7AD9 \xB7 \u8F68\u9053 ${l+1} \u5DF2\u53D6\u6D88\u5206\u914D`)};return s`
    <div class="sub-screen midi-config-screen">
      <div class="channel-header">
        ${a?null:s`<button
              type="button"
              class="back-btn"
              onClick=${()=>L("transpose")}
            >‹ 返回</button>`}
        <div class="channel-heading">
          <h1>MIDI 总配置</h1>
          <p>16 个 MIDI 通道 · 每个功能占用一个通道</p>
        </div>
        <${D} label="预设" onClick=${()=>{v(),r(!0)}} />
      </div>

      <div class="channel-family-row">
        ${Q.map(l=>s`
          <button
            type="button"
            class=${`channel-tab${l.id===n?" active":""}`}
            data-family=${l.id}
            onClick=${()=>$(l.id)}
          >${l.label}</button>
        `)}
        <span class="channel-family-hint">${o.hint}</span>
      </div>

      <div class="channel-grid">
        ${Array.from({length:16},(l,c)=>{var k,w;return s`
          <${an}
            key=${c}
            channel=${c}
            role=${((k=y[c])==null?void 0:k[0])||null}
            extraRoles=${(y[c]||[]).slice(1)}
            studioTrack=${n==="MIDI"&&(w=S[c])!=null?w:null}
            onClick=${()=>i(c)}
          />
        `})}
      </div>

      ${n==="MIDI"?s`
            <label class="switch-row channel-studio-switch">
              <span class="channel-studio-switch-text">
                <span class="channel-studio-switch-title">
                  工作站自动屏蔽未分配通道的轨道
                </span>
                <span class="channel-studio-switch-hint">
                  开启后，没在这里分配通道的工作站轨道会从工作室隐藏并禁用，不播放、不同步音色
                </span>
              </span>
              <input
                type="checkbox"
                checked=${G.value}
                onChange=${l=>Y(l.currentTarget.checked)}
              />
              <span class="switch-track" aria-hidden="true"></span>
            </label>
          `:null}

      <div class="channel-hint">
        点任意通道选择功能或工作站轨道 · 目标通道已有功能时会互换 · 预设保存全部通道
      </div>

      ${e>=0?s`
            <${en}
              channel=${e}
              familyId=${n}
              channelMap=${d}
              studioTracks=${C}
              onPick=${R}
              onPickStudio=${_}
              onClearStudio=${x}
              onClose=${()=>i(-1)}
            />
          `:null}

      ${u?s`
            <${tn}
              onClose=${()=>r(!1)}
              onRename=${l=>{r(!1),h(l)}}
              onDelete=${l=>m(l)}
            />
          `:null}

      ${p?s`
            <${sn}
              preset=${p}
              onClose=${()=>h(null)}
            />
          `:null}

      ${t?s`
            <${E}
              title="删除预设"
              message=${`\u5220\u9664\u300C${t.name}\u300D\uFF1F\u5F53\u524D\u901A\u9053\u5206\u914D\u4E0D\u4F1A\u6539\u53D8\u3002`}
              onClose=${()=>m(null)}
              actions=${[{label:"\u53D6\u6D88",onClick:()=>m(null)},{label:"\u5220\u9664",danger:!0,onClick:()=>{j(t.id),m(null),g("\u9884\u8BBE\u5DF2\u5220\u9664")}}]}
            />
          `:null}
    </div>
  `}export{pn as MidiConfigScreen};
