import{useState as a}from"preact/hooks";import{html as l,AppDialog as y,SmallButton as o,AlertDialog as D,Hint as v}from"../ui/components.js";import{closeDialog as P,deletePreset as R,hasUses as T,midi as w,openDialog as L,presets as M,savePreset as O,settings as s,showToast as f,updatePreset as S,updateSettings as x}from"../app/store.js";import{isConnected as A,sendTranspose as B}from"../core/midi/engine.js";import{noteLabel as V,signedOffset as E}from"../core/midi/notes.js";import{PROTOCOL_LABELS as H}from"../core/midi/protocols.js";function z(){const[r,m]=a(""),[u,i]=a(""),[$,p]=a(""),[g,n]=a(""),t=M.value,c=w.value.devices.find(e=>e.sendable),b=()=>{const e=r.trim()||`\u9884\u8BBE ${t.length+1}`;O({name:e,offset:s.value.offset,step:s.value.step,protocol:s.value.protocolMode,midiChannel:s.value.midiChannel,deviceModel:(c==null?void 0:c.modelKey)||""}),m(""),f(`\u5DF2\u4FDD\u5B58\uFF1A${e}`)},C=e=>{if(x({offset:e.offset,step:e.step,protocolMode:e.protocol,midiChannel:e.midiChannel}),A()&&!T(1)){L("paywall");return}B(e.offset,{consume:!0,reason:"\u9884\u8BBE"}).catch(()=>{}),f(`\u5DF2\u5E94\u7528\uFF1A${e.name}`)},h=e=>{i(e.id),p(e.name)},k=()=>{const e=$.trim();e&&S(u,{name:e}),i("")},d=t.find(e=>e.id===g)||null;return l`
    <${y} title="预设" onClose=${P}>
      <div class="preset-form">
        <label class="field-label">新预设名称</label>
        <div class="preset-save-row">
          <input
            class="learn-input"
            value=${r}
            onInput=${e=>m(e.currentTarget.value)}
            placeholder=${`\u9884\u8BBE ${t.length+1}`}
            maxlength="24"
          />
          <button type="button" class="primary-btn" onClick=${b}>保存当前</button>
        </div>
        <${v}>保存当前移调、步值、默认协议和 MIDI 通道。应用预设会发送一次移调并扣 1 次。</${v}>
      </div>

      <div class="preset-list">
        ${t.length===0?l`<p class="hint">还没有预设。</p>`:null}
        ${t.map(e=>l`
          <div class="preset-row">
            <div class="preset-main">
              <div class="preset-name">${e.name}</div>
              <div class="preset-meta">
                ${E(e.offset)}（${V(e.offset)}） ·
                步值 ${e.step} · ${H[e.protocol]||e.protocol}
              </div>
              ${u===e.id?l`
                  <div class="preset-rename">
                    <input
                      class="learn-input"
                      value=${$}
                      onInput=${I=>p(I.currentTarget.value)}
                      maxlength="24"
                    />
                    <${o} label="保存" onClick=${k} />
                    <${o} label="取消" onClick=${()=>i("")} />
                  </div>
                `:null}
            </div>
            <div class="preset-actions">
              <button type="button" class="dialog-action primary" onClick=${()=>C(e)}>应用</button>
              <${o} label="改名" onClick=${()=>h(e)} />
              <${o} label="删除" onClick=${()=>n(e.id)} />
            </div>
          </div>
        `)}
      </div>

      ${d?l`
        <${D}
          title="删除预设"
          message=${`\u786E\u5B9A\u5220\u9664\u300C${d.name}\u300D\uFF1F`}
          actions=${[{label:"\u5220\u9664",danger:!0,onClick:()=>{R(d.id),n("")}},{label:"\u53D6\u6D88",onClick:()=>n("")}]}
          onClose=${()=>n("")}
        />
      `:null}
    <//>
  `}export{z as PresetDialog};
