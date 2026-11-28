import{useEffect as S,useRef as d,useState as f}from"preact/hooks";import{html as n}from"../ui/components.js";import{licenseView as P}from"../app/store.js";import{StudioGate as U}from"./StudioGate.js";const x=(()=>{try{const r=window.location.hostname;return(r==="localhost"||r==="127.0.0.1"||r==="::1")&&!new URLSearchParams(window.location.search).has("paywall")}catch{return!1}})();function M({embedded:r=!1,mode:m="studio"}){const o=P();return!x&&!o.unlimited&&!o.periodActive?n`<${U} embedded=${r} />`:n`<${D} embedded=${r} mode=${m} />`}const C={studio:"./song-studio/index.html?embed=1&mode=studio",pattern:"./song-studio/index.html?embed=1&mode=pattern"};function D({embedded:r=!1,mode:m="studio"}){const o=m==="pattern"?"pattern":"studio",L=C[o],R=d(null),a=d(!1),s=d(0),i=d(0),v=d(0),[$,T]=f(!("serviceWorker"in navigator)),[l,h]=f(!1),[E,u]=f(!1),[p,y]=f(!1),[b,g]=f(0);S(()=>{a.current=l},[l]),S(()=>{if($)return;let e=!1;const t=()=>{e||T(!0)},c=setTimeout(t,2500);try{navigator.serviceWorker.ready.then(t).catch(t)}catch{t()}return()=>{e=!0,clearTimeout(c)}},[$]),S(()=>{const e=navigator.serviceWorker;if(!(e!=null&&e.addEventListener))return;const t=()=>{a.current||v.current>=2||(v.current+=1,clearTimeout(s.current),s.current=setTimeout(()=>{a.current||g(c=>c+1)},500))};return e.addEventListener("controllerchange",t),()=>{e.removeEventListener("controllerchange",t),clearTimeout(s.current)}},[]),S(()=>{if(l){u(!1);return}const e=setTimeout(()=>u(!0),8e3);return()=>clearTimeout(e)},[l,b,$]);const W=()=>{clearTimeout(s.current),i.current=0,v.current=0,h(!1),y(!1),u(!1),T(!0),g(e=>e+1)},k=()=>{var t;let e=null;try{e=(t=R.current)==null?void 0:t.contentWindow}catch{e=null}if(e!=null&&e.__studio){a.current=!0,i.current=0,v.current=0,h(!0),y(!1),u(!1);return}if(i.current<3){const c=i.current;i.current+=1,clearTimeout(s.current),s.current=setTimeout(()=>{var w,_;(_=(w=R.current)==null?void 0:w.contentWindow)!=null&&_.__studio?(a.current=!0,h(!0),y(!1),u(!1)):g(A=>A+1)},700+c*900);return}h(!1),u(!0),y(!0)};return n`
    <div class=${`sub-screen studio-screen${r?" embedded":""}`}>
      ${l?null:n`
            <div class="studio-loading">
              <div>${p?"\u6B4C\u66F2\u5DE5\u4F5C\u5BA4\u542F\u52A8\u5931\u8D25":"\u6B4C\u66F2\u5DE5\u4F5C\u5BA4\u52A0\u8F7D\u4E2D\u2026"}</div>
              ${p?n`<div class="studio-loading-hint">点下面的按钮重新加载；已经连接过 MIDI 的话设置会保留。</div>`:null}
              ${E||p?n`
                    <button type="button" class="small-btn" onClick=${W}>
                      ${p?"\u91CD\u65B0\u542F\u52A8\u5DE5\u4F5C\u5BA4":"\u91CD\u65B0\u52A0\u8F7D"}
                    </button>
                  `:null}
            </div>
          `}
      ${$?n`
            <iframe
              key=${b}
              ref=${R}
              class="studio-frame"
              data-studio-mode=${o}
              src=${L}
              title=${o==="pattern"?"Ev Song Studio Pattern \u7A97\u683C":"Ev Song Studio \u6B4C\u66F2\u5DE5\u4F5C\u5BA4"}
              allow="midi; camera"
              onLoad=${k}
            ></iframe>
          `:null}
    </div>
  `}export{M as StudioScreen};
