import{useEffect as L,useRef as O,useState as o}from"preact/hooks";import{html as s,AppDialog as P,AlertDialog as k,Section as C,Chip as _,Stepper as fe,Toggle as me,LogView as he,SmallButton as n}from"../ui/components.js";import{clearLog as be,closeDialog as ge,exportBackupJson as D,importBackupJson as Ce,logLines as K,midi as ke,openDialog as z,setInterfaceStyle as we,setKeepAfterVoiceChange as Me,setMidiChannel as Ie,setProtocolMode as xe,setTheme as ye,settings as Te,showToast as f,licenseView as Oe,setDeviceMode as De}from"../app/store.js";import{BACKUP_MAX_TEXT_BYTES as Ee}from"../core/backup.js";import{QrCollector as Ae,encodeQrFrames as Se,parseQrFrame as Be,renderQrToCanvas as Re,startCameraScanner as Le}from"../core/qr.js";import{MIDI_MODE_OPTIONS as Pe,PROTOCOL_LABELS as G,SX_MODE_OPTIONS as _e}from"../core/midi/protocols.js";import{refreshDevices as qe,sendTestNote as Qe}from"../core/midi/engine.js";import{APP_BUILD as Fe,APP_VERSION as Ne}from"../app/version.js";import{INTERFACE_LABELS as Ue,THEME_LABELS as je,THEME_ORDER as He}from"../app/theme.js";const Ve=["AUTO","UNIVERSAL","RPN","YAMAHA_MODX_M","YAMAHA_MODX","YAMAHA_MONTAGE","ALL"];function Z(l){var a;(a=navigator.clipboard)!=null&&a.writeText?navigator.clipboard.writeText(l).then(()=>f("\u5DF2\u590D\u5236"),()=>f("\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u62E9")):f("\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u81EA\u52A8\u590D\u5236")}function Xe(){const l=new Date,a=i=>String(i).padStart(2,"0");return`${l.getFullYear()}${a(l.getMonth()+1)}${a(l.getDate())}-${a(l.getHours())}${a(l.getMinutes())}`}function Ye(l){return l.text?l.text():new Promise((a,i)=>{const v=new FileReader;v.onload=()=>a(String(v.result||"")),v.onerror=()=>i(v.error||new Error("\u8BFB\u53D6\u5931\u8D25")),v.readAsText(l)})}function nt(){const l=Te.value,a=Oe(),i=ke.value,v=i.devices.filter(e=>!e.isVirtual),q=i.devices.filter(e=>e.isVirtual),[x,w]=o(null),[E,ee]=o(""),[te,Q]=o(!1),[se,A]=o(!1),[S,le]=o(""),[F,M]=o(""),N=O(null),[m,y]=o(!1),[$,B]=o("show"),[c,U]=o([]),[R,I]=o(0),[T,h]=o(!1),[j,u]=o(""),[H,V]=o(null),[ne,ae]=o(0),X=O(null),Y=O(null),W=O(null),oe=async()=>{await Qe()||f("\u6CA1\u6709\u53EF\u53D1\u9001\u7684 MIDI \u8F93\u51FA")},ie=()=>{const e=K.value.map(t=>`${t.time} ${t.text}`).join(`
`);Z(e||"\u6682\u65E0\u65E5\u5FD7")},ce=()=>{ee(D()),Q(!0)},re=()=>{const e=E||D();try{const t=new Blob([e],{type:"application/json"}),p=URL.createObjectURL(t),r=document.createElement("a");r.href=p,r.download=`Ev-Transposer-backup-${Xe()}.json`,document.body.appendChild(r),r.click(),r.remove(),setTimeout(()=>URL.revokeObjectURL(p),1e3),f("\u5DF2\u5BFC\u51FA\u5907\u4EFD")}catch{f("\u4E0B\u8F7D\u5931\u8D25\uFF0C\u8BF7\u6539\u7528\u590D\u5236\u5907\u4EFD")}},$e=()=>{Z(E||D())},ue=async e=>{var r;const t=e.currentTarget,p=(r=t.files)==null?void 0:r[0];if(t.value="",!!p){if(p.size>Ee){M("\u5907\u4EFD\u6587\u4EF6\u592A\u5927\uFF08\u8D85\u8FC7 2 MB\uFF09");return}try{const d=await Ye(p);w({text:d,source:p.name||"\u6587\u4EF6"})}catch(d){M(`\u8BFB\u53D6\u5931\u8D25\uFF1A${(d==null?void 0:d.message)||d}`)}}},pe=()=>{if(!x)return;const e=Ce(x.text);w(null),M(e.message)},de=async()=>{y(!0),B("show"),h(!1),U([]),I(0),V(null),u("\u6B63\u5728\u751F\u6210\u4E8C\u7EF4\u7801\u2026");try{const e=await Se(D());U(e.frames),V(e),u("")}catch(e){y(!1),M(`\u4E8C\u7EF4\u7801\u751F\u6210\u5931\u8D25\uFF1A${(e==null?void 0:e.message)||e}\u3002\u8BF7\u6539\u7528\u6587\u4EF6\u5BFC\u51FA\u3002`)}},ve=()=>{y(!1),h(!1)};return L(()=>{if(!m||$!=="show"||T||c.length<=1)return;const e=setInterval(()=>{I(t=>(t+1)%c.length)},1e3);return()=>clearInterval(e)},[m,$,T,c]),L(()=>{if(!m||$!=="show")return;const e=c[R],t=X.current;e&&t&&Re(e,t,600)},[m,$,c,R]),L(()=>{if(!m||$!=="scan")return;let e=!1,t=null;const p=new Ae,r=Y.current,d=W.current;if(!(!r||!d))return u("\u6B63\u5728\u6253\u5F00\u6444\u50CF\u5934\u2026"),(async()=>{try{t=await Le({video:r,canvas:d,onFrame:async b=>{const J=Be(b);if(!J||e)return;const g=await p.accept(J);e||(g.status==="progress"?u(`\u5DF2\u626B\u63CF ${g.received} / ${g.total} \u5E27`):g.status==="invalid"?u(g.reason):g.status==="complete"&&(e=!0,t==null||t(),y(!1),w({text:g.json,source:"\u4E8C\u7EF4\u7801"})))},onError:b=>u(b)}),e?t==null||t():u("\u5BF9\u51C6\u53E6\u4E00\u53F0\u8BBE\u5907\u5C4F\u5E55\u4E0A\u7684\u4E8C\u7EF4\u7801\u2026")}catch(b){u((b==null?void 0:b.message)||"\u65E0\u6CD5\u6253\u5F00\u6444\u50CF\u5934\uFF0C\u8BF7\u6539\u7528\u6587\u4EF6\u5BFC\u5165")}})(),()=>{e=!0,t==null||t()}},[m,$,ne]),s`
    <${P} title="设置" onClose=${ge}>
      <${C} title="快捷入口">
        <div class="button-row">
          <${n} label="预设" onClick=${()=>z("presets")} />
          <${n} label="次数与客服" onClick=${()=>z("support")} />
        </div>
        <div class="support-line">
          ${`\u5F53\u524D\uFF1A${a.text}${a.periodActive&&a.untilText?`\uFF08\u81F3 ${a.untilText}\uFF09`:""}`}
        </div>
      <//>

      <${C}
        title="备份与恢复"
        hint="导出预设、音色链（含 MODX 快照）、打鼓 loop、歌单、音色表、MODX 音色表/整理、调音台、外观和 MIDI 设置。不含激活次数/时长卡，可跨设备；安卓和网页版使用同一格式。"
      >
        <div class="button-row">
          <${n} label="导出备份" onClick=${ce} />
          <${n} label="导入文件" onClick=${()=>{var e;return(e=N.current)==null?void 0:e.click()}} />
          <${n} label="粘贴备份" onClick=${()=>A(!0)} />
          <${n} label="二维码" onClick=${de} />
        </div>
        <input
          ref=${N}
          type="file"
          accept=".json,application/json"
          style="display:none"
          onChange=${ue}
        />
        <p class="hint">
          导入会整体覆盖备份里存在的模块，未包含的模块保持不变；
          不会改动激活次数、时长卡、永久解锁或设备码，也不会发送 MIDI。
        </p>
      <//>

      <${C} title="外观">
        <div class="field-label">界面</div>
        <div class="chip-row">
          ${Object.entries(Ue).map(([e,t])=>s`
            <${_}
              label=${t}
              selected=${l.interfaceStyle===e}
              onClick=${()=>we(e)}
            />
          `)}
        </div>
        <div class="field-label spaced">主题</div>
        <div class="chip-row">
          ${He.map(e=>s`
            <${_}
              label=${je[e]}
              selected=${l.theme===e}
              onClick=${()=>ye(e)}
            />
          `)}
        </div>
      <//>

      <${C}
        title="MIDI"
        hint="自动模式按琴名选择协议；每台琴可以在下面的「连接的琴」里单独改模式。"
      >
        <div class="field-label">默认协议（新设备）</div>
        <div class="chip-row wrap">
          ${Ve.map(e=>s`
            <${_}
              label=${G[e]}
              selected=${l.protocolMode===e}
              onClick=${()=>xe(e)}
            />
          `)}
        </div>
        <${fe}
          label="MIDI 通道（0 = CH1）"
          value=${l.midiChannel}
          min=${0}
          max=${15}
          onChange=${Ie}
        />
        <${me}
          label="换音色后保持移调"
          checked=${l.keepAfterVoiceChange}
          onChange=${Me}
        />
      <//>

      <${C} title="连接的琴">
        ${v.length===0?s`<p class="hint">未发现设备。接上琴的 USB 后会自动识别。</p>`:v.map(e=>s`
            <div class="device-row">
              <div class="device-main">
                <div class="device-name">${e.displayName}</div>
                <div class="device-meta">
                  ${e.sendable?"\u53EF\u53D1\u9001":"\u4EC5\u63A5\u6536"} · 发送口 ${e.outputCount} · 接收口 ${e.inputCount}
                </div>
              </div>
              <select
                class="device-mode"
                value=${e.mode}
                title="这台琴的模式"
                onChange=${t=>{De(e.key,t.currentTarget.value),qe(!0),f("\u5DF2\u5207\u6362\u8FD9\u53F0\u7434\u7684\u6A21\u5F0F")}}
              >
                ${(e.isSx?_e:Pe).map(t=>s`
                  <option value=${t}>${G[t]||t}</option>
                `)}
              </select>
            </div>
          `)}
        ${q.length?s`<p class="hint">另有 ${q.length} 个软件/虚拟端口已忽略（MIDIWeb、网络 MIDI 等）。</p>`:null}
        <div class="button-row">
          <${n} label="发送测试" onClick=${oe} disabled=${!i.supported} />
        </div>
        ${i.supported?null:s`<p class="callout">这个浏览器没有 Web MIDI。iPad 请用 MIDIWeb Browser 打开本页；电脑/安卓请用 Chrome 或 Edge。</p>`}
        ${i.error?s`<p class="callout">${i.error}</p>`:null}
      <//>

      <${C} title="诊断">
        <${he} lines=${K.value.slice(0,12)} />
        <div class="button-row">
          <${n} label="复制日志" onClick=${ie} />
          <${n} label="清空日志" onClick=${be} />
        </div>
        <p class="hint diagnostics">
          Web MIDI：${i.supported?"\u53EF\u7528":"\u4E0D\u53EF\u7528"} ·
          SysEx：${i.sysexEnabled?"\u5DF2\u5F00\u542F":"\u672A\u77E5/\u5173\u95ED"} ·
          UA：${navigator.userAgent}
        </p>
      <//>

      <${C} title="关于">
        <p class="hint">
          Ev移调器 ${Fe} 版 v${Ne}。网页版授权支持按次、日卡/周卡/月卡、
          自定义天数和永久解锁；有效期内不扣次数，到期后恢复剩余次数。
          iPad 不支持 BLE 翻页，请用安卓版完成 forScore 翻页。
        </p>
        <p class="hint">
          网页版无法校验安装包签名，激活码只能起到防误用/防随意分享的作用。
        </p>
      <//>

      ${te?s`
        <${k}
          title="导出备份"
          message="可以下载文件，或复制下面的文本到另一台设备。"
          actions=${[{label:"\u5173\u95ED",onClick:()=>Q(!1)},{label:"\u590D\u5236",onClick:$e},{label:"\u4E0B\u8F7D",primary:!0,onClick:re}]}
        >
          <textarea
            class="backup-text"
            readonly
            value=${E}
            onFocus=${e=>e.currentTarget.select()}
          ></textarea>
        </${k}>
      `:null}

      ${se?s`
        <${k}
          title="粘贴备份"
          message="把另一台设备复制来的备份文本粘贴到这里。"
          actions=${[{label:"\u53D6\u6D88",onClick:()=>A(!1)},{label:"\u4E0B\u4E00\u6B65",primary:!0,onClick:()=>{if(!S.trim()){f("\u8BF7\u5148\u7C98\u8D34\u5907\u4EFD\u6587\u672C");return}w({text:S,source:"\u7C98\u8D34\u7684\u6587\u672C"}),A(!1)}}]}
        >
          <textarea
            class="backup-text"
            value=${S}
            placeholder="粘贴备份 JSON…"
            onInput=${e=>le(e.currentTarget.value)}
          ></textarea>
        </${k}>
      `:null}

      ${x?s`
        <${k}
          title="导入备份？"
          message=${`\u6765\u6E90\uFF1A${x.source}\u3002\u5907\u4EFD\u91CC\u5B58\u5728\u7684\u6A21\u5757\u4F1A\u6574\u4F53\u8986\u76D6\u5F53\u524D\u6570\u636E\uFF1B\u6FC0\u6D3B\u6B21\u6570\u3001\u65F6\u957F\u5361\u3001\u6C38\u4E45\u89E3\u9501\u548C\u8BBE\u5907\u7801\u4E0D\u53D7\u5F71\u54CD\uFF0C\u4E5F\u4E0D\u4F1A\u53D1\u9001 MIDI\u3002`}
          actions=${[{label:"\u53D6\u6D88",onClick:()=>w(null)},{label:"\u5BFC\u5165",primary:!0,onClick:pe}]}
        />
      `:null}

      ${F?s`
        <${k}
          title="备份与恢复"
          message=${F}
          actions=${[{label:"\u77E5\u9053\u4E86",primary:!0,onClick:()=>M("")}]}
        />
      `:null}
    <//>

    ${m?s`
      <${P} title="二维码备份" onClose=${ve}>
        <div class="button-row">
          <${n}
            label="显示二维码"
            active=${$==="show"}
            onClick=${()=>{B("show"),h(!1)}}
          />
          <${n}
            label="扫码导入"
            active=${$==="scan"}
            onClick=${()=>B("scan")}
          />
        </div>
        ${$==="show"?s`
          <p class="hint">
            另一台设备：设置 → 备份与恢复 → 二维码 → 扫码导入，对准二维码。
            数据量较大会自动分成多帧循环显示。
          </p>
          <p class="hint">
            ${H?`\u6570\u636E\u91CF ${Math.ceil(H.rawBytes/1024)} KB \xB7 \u7B2C ${R+1} / ${c.length} \u5E27 \xB7 \u6BCF\u5E27 1 \u79D2 \xB7 \u4E00\u8F6E\u7EA6 ${(c.length*1).toFixed(1)} \u79D2`:j}
          </p>
          <div class="button-row">
            ${c.length>1?s`<${n} label=${T?"\u7EE7\u7EED":"\u6682\u505C"} onClick=${()=>h(!T)} />`:null}
            <${n} label="上一帧" onClick=${()=>{h(!0),I(e=>(e-1+c.length)%c.length)}} />
            <${n} label="下一帧" onClick=${()=>{h(!0),I(e=>(e+1)%c.length)}} />
            <${n} label="重新开始" onClick=${()=>{I(0),h(!1)}} />
          </div>
          <div class="qr-canvas-wrap">
            <canvas ref=${X} class="qr-canvas"></canvas>
          </div>
          <p class="hint">
            扫码端进度没满时，点「暂停」后用上一帧/下一帧停在未扫到的帧上。
          </p>
        `:s`
          <p class="hint">
            把另一台设备的二维码对准摄像头；可以任意顺序扫描，重复帧会忽略。
            如果浏览器不允许摄像头，请改用文件或粘贴导入。
          </p>
          <video ref=${Y} class="qr-video" playsinline muted></video>
          <canvas ref=${W} style="display:none"></canvas>
          <p class="hint">${j}</p>
          <div class="button-row">
            <${n} label="重置扫描" onClick=${()=>{ae(e=>e+1),u("\u5BF9\u51C6\u53E6\u4E00\u53F0\u8BBE\u5907\u5C4F\u5E55\u4E0A\u7684\u4E8C\u7EF4\u7801\u2026")}} />
          </div>
        `}
      </${P}>
    `:null}
  `}export{nt as SettingsDialog};
