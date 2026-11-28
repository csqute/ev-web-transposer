import{useRef as g,useState as $}from"preact/hooks";import{html as V,haptic as X}from"./components.js";import{padDistanceFraction as Y,velocityFromPadDistance as k}from"../core/drums/model.js";function F(e){switch(e){case"KICK":return"pad-kick";case"SNARE":case"CRASH":case"RIDE":return"pad-accent-alt";case"CLOSED_HAT":case"OPEN_HAT":return"pad-success";default:return"pad-danger"}}function U({padId:e,index:s,title:o,subtitle:m,note:h,editMode:n,isDragging:P,isHoverTarget:C,velocityMode:D,fixedVelocity:i,centerVelocity:E,edgeVelocity:R,onDown:T,onUp:b,onDragStart:O,onDragMove:S,onDragEnd:w}){const[u,p]=$(!1),[y,A]=$(i),a=g(!1),c=g(!1),I=t=>{if(t.button!==void 0&&t.button!==0)return;t.preventDefault(),X(18),p(!0),a.current=!0;try{t.currentTarget.setPointerCapture(t.pointerId)}catch{}if(n){O(s);return}const r=t.currentTarget.getBoundingClientRect(),d=Y(t.clientX-r.left,t.clientY-r.top,r.width,r.height),H=D==="POSITION"?k(d,E,R):i,f=Math.max(1,Math.min(127,H));A(f),c.current=T(f)!==!1},N=t=>{!a.current||!n||(t.preventDefault(),S(s,t.clientX,t.clientY))},l=(t,r=!1)=>{if(a.current){a.current=!1,p(!1);try{t.currentTarget.releasePointerCapture(t.pointerId)}catch{}n?w(s,t.clientX,t.clientY):c.current&&(c.current=!1,b())}},_=n?"MOVE":u?`VEL ${y}`:`NOTE ${h}`;return V`
    <div
      class=${`drum-pad ${F(e)}${u?" pressed":""}${P?" dragging":""}${C?" hover-target":""}`}
      onPointerDown=${I}
      onPointerMove=${N}
      onPointerUp=${t=>l(t)}
      onPointerCancel=${t=>l(t,!0)}
      data-pad=${e}
    >
      <span class="pad-ring pad-ring-outer"></span>
      <span class="pad-ring pad-ring-inner"></span>
      <span class=${`drum-pad-title${o.length>12?" long":""}`}>${o}</span>
      <span class="drum-pad-sub">${m}</span>
      <span class="drum-pad-badge">${_}</span>
    </div>
  `}export{U as DrumPad,F as padAccentClass};
