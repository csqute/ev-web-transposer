import{html as i,StatusDot as c}from"./components.js";import{midi as s}from"../app/store.js";import{connectionText as o}from"../core/midi/engine.js";function m(){const n=s.value,t=n.devices.some(e=>e.sendable||e.echoable);return i`
    <div class="connection-inline">
      <${c} active=${t} danger=${!t} />
      <span class="connection-text" title=${o(n)}>${o(n)}</span>
    </div>
  `}export{m as ConnectionInline};
