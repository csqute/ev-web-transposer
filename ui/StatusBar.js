import{useEffect as u,useState as o}from"preact/hooks";import{html as g}from"./components.js";function h(l){const i=String(l.getHours()).padStart(2,"0"),n=String(l.getMinutes()).padStart(2,"0");return`${i}:${n}`}function m(){const[l,i]=o(()=>h(new Date)),[n,v]=o(null),[f,d]=o(!1);u(()=>{const t=setInterval(()=>i(h(new Date)),1e3);return()=>clearInterval(t)},[]),u(()=>{let t=null,c=!1;const s=()=>{c||!t||(v(Math.round(t.level*100)),d(!!t.charging))};return navigator.getBattery&&navigator.getBattery().then(e=>{var r,a;c||(t=e,s(),(r=e.addEventListener)==null||r.call(e,"levelchange",s),(a=e.addEventListener)==null||a.call(e,"chargingchange",s))}).catch(()=>{}),()=>{var e,r;c=!0,t&&((e=t.removeEventListener)==null||e.call(t,"levelchange",s),(r=t.removeEventListener)==null||r.call(t,"chargingchange",s))}},[]);const p=n!==null&&n<20;return g`
    <div class="statusbar" aria-label="时钟和电量">
      <span class="status-time">${l}</span>
      <span class=${`status-battery${p?" low":""}`}>
        ${f?"\u26A1 ":""}${n===null?"--":`${n}%`}
      </span>
    </div>
  `}export{m as StatusBar};
