import{useEffect as z,useLayoutEffect as re,useRef as H,useState as O}from"preact/hooks";import{html as s,Toast as ce,StatusDot as le,SmallButton as N,AppDialog as j,BarIconButton as A}from"../ui/components.js";import{StatusBar as ue}from"../ui/StatusBar.js";import{MainScreen as de}from"../screens/MainScreen.js";import{MixerScreen as pe}from"../screens/MixerScreen.js";import{DrumScreen as $e}from"../screens/DrumScreen.js";import{SoundPickerScreen as X}from"../screens/SoundPickerScreen.js";import{SoundChainScreen as q}from"../screens/SoundChainScreen.js";import{SetListScreen as fe}from"../screens/SetListScreen.js";import{MidiConfigScreen as ge}from"../screens/MidiConfigScreen.js";import{StudioScreen as U}from"../screens/StudioScreen.js";import{PlaceholderScreen as me}from"../screens/PlaceholderScreen.js";import{SettingsDialog as he}from"../dialogs/SettingsDialog.js";import{SupportDialog as ve}from"../dialogs/SupportDialog.js";import{PaywallDialog as we}from"../dialogs/PaywallDialog.js";import{SuccessDialog as be}from"../dialogs/SuccessDialog.js";import{PlaceholderDialog as Se}from"../dialogs/PlaceholderDialog.js";import{PresetDialog as Pe}from"../dialogs/PresetDialog.js";import{layout as c,licenseView as ye,midi as J,openDialog as ke,route as T,saveLayout as d,setFocusMode as Q,showToast as Y,ui as x}from"./store.js";import{navigate as $}from"./router.js";import{toggleFullscreen as Me}from"./fullscreen.js";import{isAppleTouchDevice as De}from"../core/midi/access.js";import{APP_NAME as Ie,APP_VERSION as Ce}from"./version.js";import{PANE_SCREENS as Z,PANE_TITLES as F,withPaneAdded as ee,withPaneMoved as Ae,withPaneRemoved as Le,withPanesSwapped as Ee,withPaneScreen as W}from"./panes.js";const Ne="https://apps.apple.com/app/id6757226617",Te=320,_e=340;function Re(){const o=De();return s`
    <div class="midi-banner" role="status">
      <div class="midi-banner-text">
        <strong>这个浏览器没有 Web MIDI</strong>
        <span>
          ${o?"iPad/iPhone \u7684 Safari \u4E0D\u652F\u6301\uFF1B\u8BF7\u7528 MIDIWeb Browser \u6253\u5F00\u672C\u9875\u3002":"\u8BF7\u7528 Chrome \u6216 Edge \u6253\u5F00\u672C\u9875\uFF08\u9700 HTTPS\uFF09\u3002"}
        </span>
      </div>
      <div class="midi-banner-actions">
        <button type="button" class="banner-btn" onClick=${async()=>{try{await navigator.clipboard.writeText(window.location.href),Y("\u7F51\u5740\u5DF2\u590D\u5236\uFF0C\u8BF7\u5230 MIDIWeb Browser \u91CC\u7C98\u8D34\u6253\u5F00")}catch{Y("\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u590D\u5236\u5730\u5740\u680F\u7F51\u5740")}}}>复制网址</button>
        ${o?s`<a class="banner-btn link" href=${Ne} target="_blank" rel="noreferrer">MIDIWeb Browser</a>`:null}
      </div>
    </div>
  `}function Be(){const o=x.value.dialog;return s`
    ${o==="settings"?s`<${he} />`:null}
    ${o==="support"?s`<${ve} />`:null}
    ${o==="paywall"?s`<${we} />`:null}
    ${o==="placeholder"?s`<${Se} />`:null}
    ${o==="presets"?s`<${Pe} />`:null}
    <${be} />
  `}function Oe({screen:o,embedded:a=!1,onNavigate:i=null}){switch(o){case"transpose":return s`<${de} embedded=${a} onNavigate=${i} />`;case"mixer":return s`<${pe} embedded=${a} />`;case"drums":return s`<${$e} embedded=${a} />`;case"midi-config":return s`<${ge} embedded=${a} />`;case"sounds":return s`<${X} embedded=${a} pane=${0} />`;case"sounds-2":return s`<${X} embedded=${a} pane=${1} />`;case"sounds-3":return s`<${X} embedded=${a} pane=${2} />`;case"chain":return s`<${q} embedded=${a} pane=${0} />`;case"chain-2":return s`<${q} embedded=${a} pane=${1} />`;case"chain-3":return s`<${q} embedded=${a} pane=${2} />`;case"setlist":return s`<${fe} embedded=${a} />`;case"studio":return s`<${U} embedded=${a} mode="studio" />`;case"studio-pattern":return s`<${U} embedded=${a} mode="pattern" />`;default:return s`<${me} screen=${o} />`}}function xe({screen:o,onNavigate:a}){const i=H(null),[p,h]=O({width:0,height:0});if(re(()=>{const u=i.current;if(!u)return;let b=0;const P=()=>{cancelAnimationFrame(b),b=requestAnimationFrame(()=>{if(!u.isConnected)return;const _=u.getBoundingClientRect(),R=Math.round(_.width*100)/100,M=Math.round(_.height*100)/100;h(L=>L.width===R&&L.height===M?L:{width:R,height:M})})};P();const y=typeof ResizeObserver!="undefined"?new ResizeObserver(P):null;return y==null||y.observe(u),window.addEventListener("resize",P),window.addEventListener("orientationchange",P),()=>{cancelAnimationFrame(b),y==null||y.disconnect(),window.removeEventListener("resize",P),window.removeEventListener("orientationchange",P)}},[]),o==="studio"||o==="studio-pattern")return s`
      <div class="pane-body studio-pane">
        <${U}
          embedded=${!0}
          mode=${o==="studio-pattern"?"pattern":"studio"}
        />
      </div>
    `;const f=p.width>1&&p.height>1,S=f?Math.min(1,p.width/Te,p.height/_e):1,w=f?{"--pane-zoom":String(S),"--pane-design-w":`${Math.round(p.width/S*100)/100}px`,"--pane-design-h":`${Math.round(p.height/S*100)/100}px`}:void 0,g=f&&p.height<500;return s`
    <div class=${`pane-body${o==="transpose"?" main-pane":""}${g?" pane-compact":""}`}>
      <div class="pane-scale-host" ref=${i}>
        <div class="pane-scaled" style=${w}>
          <${Oe}
            screen=${o}
            embedded=${!0}
            onNavigate=${a}
          />
        </div>
      </div>
    </div>
  `}function Fe({index:o,onClose:a,onSelect:i,onMove:p,onRemove:h,onSettings:f,onFocus:S}){const w=c.value,g=w.panes[o];return s`
    <${j} title=${`\u7A97\u683C \xB7 ${F[g]||g}`} onClose=${a}>
      <div class="pane-dialog">
        <h3 class="section-title">显示页面</h3>
        <div class="pane-page-grid">
          ${Z.map(u=>s`
            <button
              type="button"
              class=${`pane-page-option${u===g?" current":""}${w.panes.includes(u)&&u!==g?" used":""}`}
              onClick=${()=>i(u)}
            >
              <strong>${F[u]}</strong>
              <span>${u===g?"\u5F53\u524D\u7A97\u683C":w.panes.includes(u)?"\u5DF2\u6253\u5F00":"\u53EF\u6DFB\u52A0"}</span>
            </button>
          `)}
        </div>
        <div class="pane-dialog-actions">
          <${N} label="左移" disabled=${o<=0} onClick=${()=>p(-1)} />
          <${N} label="右移" disabled=${o>=w.panes.length-1} onClick=${()=>p(1)} />
          <${N} label="专注此窗格" onClick=${S} />
          <${N} label="设置" onClick=${f} />
          <${N} label="关闭窗格" disabled=${w.panes.length<=1} onClick=${h} />
        </div>
        <p class="hint">
          最多 4 栏（4 栏时排成 2×2）。音色选择和音色链各有 1–3 三个独立窗格，
          可以分别发送到不同琴。点其他窗格即可切换焦点；按住窗格标题拖动可交换位置。
        </p>
      </div>
    <//>
  `}function We({onClose:o,onAdd:a}){const i=c.value,p=Z.filter(h=>!i.panes.includes(h));return s`
    <${j} title="添加窗格" onClose=${o}>
      <div class="pane-dialog">
        <h3 class="section-title">选择新窗格的页面</h3>
        <p class="hint">
          音色选择 1/2/3 和音色链 1/2/3 是相互独立的窗格，可以同时打开并分别发送到三台琴。
          音色链按 KORG / MODX / SX 分链库，每个窗格自己选用哪一条。
        </p>
        <div class="pane-page-grid">
          ${p.map(h=>s`
            <button type="button" class="pane-page-option" onClick=${()=>a(h)}>
              <strong>${F[h]}</strong>
              <span>添加</span>
            </button>
          `)}
        </div>
      </div>
    <//>
  `}function ze(){const o=c.value,[a,i]=O(-1),[p,h]=O(!1),[f,S]=O(null),w=H(!1),g=H(null),u=ye(),b=J.value.devices.filter(e=>e.sendable||e.echoable).length,P=u.text,y=e=>{e!==c.value.focused&&(d({...c.value,focused:e}),$(c.value.panes[e]))},_=e=>{const n=c.value,t=n.panes.indexOf(e);if(t>=0){d({...n,focused:t}),$(e);return}M(n.panes[n.focused]),d(W(n,n.focused,e)),$(e)},R=e=>{const n=c.value,t=e==="sounds"?["sounds","sounds-2","sounds-3"]:[e],r=n.panes.findIndex(l=>t.includes(l));if(r>=0){d({...n,focused:r}),$(n.panes[r]);return}const v=n.panes.map((l,k)=>({item:l,index:k})).filter(({item:l})=>l!=="transpose").map(({index:l})=>l);if(!v.length&&n.panes.length<4){d(ee(n,e)),$(e);return}const D=v.length?v[v.length-1]:n.focused;M(n.panes[D]),d(W(n,D,e)),$(e)},M=e=>{const n=e==="studio"?"studio":e==="studio-pattern"?"pattern":"";n&&document.querySelectorAll("iframe.studio-frame").forEach(t=>{var r;try{(r=t.contentWindow)==null||r.postMessage({type:"ev-studio:peer-gone",mode:n},window.location.origin)}catch{}})},L=(e,n)=>{const t=c.value,r=t.panes.indexOf(n);if(r>=0&&r!==e){d({...t,focused:r}),$(n),i(-1);return}M(t.panes[e]),d(W(t,e,n)),$(n),i(-1)},ne=e=>{d(ee(c.value,e)),$(e),h(!1)},te=e=>{M(c.value.panes[e]);const n=Le(c.value,e);d(n),$(n.panes[n.focused]),i(-1)},oe=(e,n)=>{d(Ae(c.value,e,n))},se=(e,n)=>{const t=Ee(c.value,e,n);t!==c.value&&(d(t),$(t.panes[t.focused]))},ae=e=>{const n=c.value;e<0||e>=n.panes.length||(d({...n,focused:e}),$(n.panes[e]),i(-1),Q(!0))};z(()=>{const e=n=>{var C;if(n.origin!==window.location.origin)return;const t=(C=n.data)==null?void 0:C.type;if(t!=="ev-studio:focus"&&t!=="ev-studio:expand")return;const r=[...document.querySelectorAll("iframe.studio-frame")].find(m=>m.contentWindow===n.source);if(!r)return;const v=r.closest(".workspace-pane"),l=[...document.querySelectorAll(".workspace-pane")].indexOf(v);if(l<0)return;const k=c.value,I=k.panes[l];I!=="studio"&&I!=="studio-pattern"||(k.focused!==l&&d({...k,focused:l}),T.value!==I&&$(I),t==="ev-studio:expand"&&(Q(!0),Y("\u5DF2\u653E\u5927\u6B4C\u66F2\u5DE5\u4F5C\u5BA4\uFF1B\u70B9\u9876\u90E8 \u26F6 \u9000\u51FA\u4E13\u6CE8\u6A21\u5F0F",2600)))};return window.addEventListener("message",e),()=>window.removeEventListener("message",e)},[]),z(()=>()=>{var e;return(e=g.current)==null?void 0:e.call(g)},[]);const ie=(e,n)=>{if(e.pointerType==="mouse"&&e.button!==0||e.target.closest("button"))return;const t=n,r=e.clientX,v=e.clientY;let D=!1,l=t;const k=()=>{window.removeEventListener("pointermove",I),window.removeEventListener("pointerup",C),window.removeEventListener("pointercancel",C),document.body.classList.remove("pane-dragging"),g.current=null},I=m=>{var K;if(m.pointerId!==e.pointerId)return;if(!D){if(Math.hypot(m.clientX-r,m.clientY-v)<8)return;D=!0,document.body.classList.add("pane-dragging"),S({from:t,target:t})}m.preventDefault();const E=document.elementFromPoint(m.clientX,m.clientY),V=(K=E==null?void 0:E.closest)==null?void 0:K.call(E,".workspace-pane");if(!V)return;const B=[...document.querySelectorAll(".workspace-pane")].indexOf(V);B>=0&&B!==l&&(l=B,S({from:t,target:B}))},C=m=>{(m==null?void 0:m.pointerId)!==void 0&&m.pointerId!==e.pointerId||(k(),D&&l!==t&&se(t,l),S(null))};window.addEventListener("pointermove",I,{passive:!1}),window.addEventListener("pointerup",C),window.addEventListener("pointercancel",C),g.current=k};z(()=>{const e=c.value,n=window.location.hash,t=n===""||n==="#"||n==="#/",r=e.panes.indexOf(T.value);if(!w.current){w.current=!0;const v=e.panes[e.focused];if(t&&T.value==="transpose"&&v!=="transpose"){$(v);return}}r<0?d(W(e,e.focused,T.value)):r!==e.focused&&d({...e,focused:r})},[T.value]);const G=o.panes.length===1&&o.panes[0]==="transpose";return s`
    <div class=${`workspace${G?" single-main":""}`}>
      <div class="workspace-bar">
        <div class="workspace-left">
          <${ue} />
          <span class=${`workspace-balance${u.className?` ${u.className}`:""}`}>${P}</span>
        </div>
        <button
          type="button"
          class="workspace-brand"
          title="回到主界面"
          onClick=${()=>_("transpose")}
        >
          <strong>${Ie}</strong>
          <span>v${Ce}</span>
        </button>
        <span class="workspace-conn" title=${b?`\u5DF2\u8FDE\u63A5 ${b} \u53F0\u7434`:"\u672A\u8FDE\u63A5\u7434"}>
          <${le} active=${b>0} danger=${b===0} />
          <span>${b>0?`\u5DF2\u8FDE\u63A5 ${b} \u53F0`:"\u672A\u8FDE\u63A5"}</span>
        </span>
        <div class="workspace-actions">
          ${G?s`
                <${A}
                  label="页面与设置"
                  title="页面与设置"
                  onClick=${()=>i(0)}
                >⋯</${A}>
              `:null}
          <${A}
            label="全屏或专注模式"
            title="全屏 / 专注模式"
            onClick=${()=>Me()}
          >⛶</${A}>
          <${A}
            label="添加窗格"
            title="添加窗格"
            disabled=${o.panes.length>=4}
            onClick=${()=>h(!0)}
          >＋</${A}>
        </div>
      </div>

      <div
        class=${`workspace-panes${x.value.focusMode?" focus":""}`}
        style=${{"--pane-count":String(o.panes.length)}}
        data-pane-count=${o.panes.length}
      >
        ${o.panes.map((e,n)=>s`
          <div
            key=${e}
            class=${`workspace-pane${n===o.focused?" focused":""}${(f==null?void 0:f.from)===n?" dragging":""}${f&&f.target===n&&f.target!==f.from?" drop-target":""}`}
            data-screen=${e}
            onPointerDown=${()=>y(n)}
          >
            <div
              class="pane-head"
              title="按住拖动可交换窗格位置"
              onPointerDown=${t=>ie(t,n)}
            >
              <span class="pane-grip" aria-hidden="true">⠿</span>
              <span class="pane-title">${F[e]}</span>
              ${n===o.focused?s`<span class="pane-focus">当前</span>`:null}
              <button
                type="button"
                class="pane-menu-btn"
                title="窗格选项"
                aria-label="窗格选项"
                onPointerDown=${t=>{t.pointerType==="mouse"&&t.button!==0||(t.preventDefault(),i(n))}}
                onClick=${t=>{t.stopPropagation(),i(n)}}
              >⋯</button>
            </div>
            <${xe}
              screen=${e}
              onNavigate=${e==="transpose"?R:null}
            />
          </div>
        `)}
      </div>
    </div>

    ${a>=0&&a<o.panes.length?s`
          <${Fe}
            index=${a}
            onClose=${()=>i(-1)}
            onSelect=${e=>L(a,e)}
            onMove=${e=>oe(a,e)}
            onRemove=${()=>te(a)}
            onFocus=${()=>ae(a)}
            onSettings=${()=>{i(-1),ke("settings")}}
          />
        `:null}
    ${p&&o.panes.length<4?s`<${We} onClose=${()=>h(!1)} onAdd=${ne} />`:null}
  `}function fn(){const o=x.value.focusMode;return s`
    <div class=${`app${o?" focus-mode":""}`}>
      ${J.value.supported?null:s`<${Re} />`}
      <${ze} />
      <${Be} />
      <${ce} toast=${x.value.toast} />
    </div>
  `}export{fn as App};
