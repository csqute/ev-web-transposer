import{html as l,SmallButton as i,BarButton as a}from"../ui/components.js";import{StatusBar as P}from"../ui/StatusBar.js";import{ConnectionInline as d}from"../ui/ConnectionInline.js";import{PianoKeyboard as y}from"../ui/PianoKeyboard.js";import{KeyGrid as w}from"../ui/KeyGrid.js";import{MainControlBar as x}from"../ui/MainControlBar.js";import{APP_NAME as B,APP_VERSION as N}from"../app/version.js";import{hasUses as T,licenseView as M,openDialog as u,route as o,settings as $,updateSettings as v}from"../app/store.js";import{navigate as O}from"../app/router.js";import{toggleFullscreen as A}from"../app/fullscreen.js";import{isConnected as D,sendTranspose as E}from"../core/midi/engine.js";import{noteLabel as m,offsetForTap as _,signedOffset as f,wrapOffset as F}from"../core/midi/notes.js";function b(c,r){const n=$.value.offset,t=Math.max(-12,Math.min(12,c));if(t!==n){if(D()&&!T(1)){u("paywall");return}v({offset:t}),E(t,{consume:!0,reason:r}).catch(()=>{})}}function Q({embedded:c=!1,onNavigate:r=null}){const n=M(),t=$.value.offset,C=$.value.step,k=$.value.interfaceStyle,g=n.text,h=`balance${n.className?` ${n.className}`:""}`,s=e=>r?r(e):O(e),p=e=>{b(_(t,e),"\u79FB\u8C03")},S=e=>{b(F(t+e),"\u79FB\u8C03")};return l`
    <div class=${`main-screen${c?" embedded":""}`}>
      ${c?l`
            <div
              class="embedded-nav"
              onPointerDown=${e=>e.stopPropagation()}
              onClick=${e=>e.stopPropagation()}
            >
              <${d} />
              <${a} label="歌单" active=${o.value==="setlist"} onClick=${()=>s("setlist")} />
              <${a}
                label="音色"
                active=${["sounds","sounds-2","sounds-3"].includes(o.value)}
                onClick=${()=>s("sounds")}
              />
              <${a} label="打鼓" active=${o.value==="drums"} onClick=${()=>s("drums")} />
              <${a} label="调音台" active=${o.value==="mixer"} onClick=${()=>s("mixer")} />
              <${a} label="通道" active=${o.value==="midi-config"} onClick=${()=>s("midi-config")} />
              <${a} label="工作室" active=${o.value==="studio"} onClick=${()=>s("studio")} />
              <${a} label="设置" onClick=${()=>u("settings")} />
            </div>
            <div
              class="embedded-compact"
              onPointerDown=${e=>e.stopPropagation()}
              onClick=${e=>e.stopPropagation()}
            >
              <${d} />
              <${a}
                label="通道"
                active=${o.value==="midi-config"}
                onClick=${()=>s("midi-config")}
              />
              <${a}
                label="工作室"
                className="compact-studio"
                active=${o.value==="studio"}
                onClick=${()=>s("studio")}
              />
              <div class="compact-current">
                <div class="compact-current-line">
                  <span class="compact-current-label">当前</span>
                  <span class="compact-current-value">${f(t)}</span>
                  <span class="compact-current-note">（${m(t)}）</span>
                </div>
                <div class="compact-current-bar" aria-hidden="true">
                  <i style=${{width:`${(t+12)/24*100}%`}}></i>
                </div>
              </div>
            </div>
          `:l`
      <div class="topbar">
        <${d} />
        <${P} />
        <span class=${h}>${g}</span>
        <div class="titleblock">
          <h1>${B}</h1>
          <span class="version">v${N}</span>
        </div>
        <div class="top-actions">
          <${i} label="歌单" onClick=${()=>s("setlist")} />
          <${i} label="音色" onClick=${()=>s("sounds")} />
          <${i} label="打鼓" onClick=${()=>s("drums")} />
          <${i} label="调音台" onClick=${()=>s("mixer")} />
          <${i} label="通道" onClick=${()=>s("midi-config")} />
          <${i} label="工作室" onClick=${()=>s("studio")} />
          <${i} label="设置" onClick=${()=>u("settings")} />
          <button
            type="button"
            class="icon-btn"
            title="全屏 / 专注模式"
            aria-label="全屏或专注模式"
            onClick=${()=>A()}
          >⛶</button>
        </div>
      </div>
      `}

      <div class="current-row">
        <div class="current-left">
          <div class="current-line">
            <span class="current-label">当前</span>
            <span class="current-offset">${f(t)}</span>
            <span class="current-note">（${m(t)}）</span>
          </div>
          <div class="offset-bar" aria-hidden="true">
            <div class="offset-fill" style=${{width:`${(t+12)/24*100}%`}}></div>
          </div>
        </div>
      </div>

      <div class="keyboard-area">
        ${k==="LARGE_BUTTONS"?l`<${w} offset=${t} onSelect=${p} />`:l`<${y} offset=${t} onSelect=${p} />`}
      </div>

      <${x}
        step=${C}
        onTranspose=${S}
        onStepChange=${e=>v({step:e})}
      />
    </div>
  `}export{Q as MainScreen};
