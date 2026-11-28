import{html as e,AlertDialog as a}from"../ui/components.js";import{closeDialog as l,ui as t}from"../app/store.js";function m(){const o=t.value.dialogPayload||{};return e`
    <${a}
      title=${o.title||"\u63D0\u793A"}
      message=${o.message||""}
      actions=${[{label:"\u77E5\u9053\u4E86",primary:!0,onClick:()=>l()}]}
      onClose=${l}
    />
  `}export{m as PlaceholderDialog};
