import{html as l,AlertDialog as e}from"../ui/components.js";import{closeDialog as o,openDialog as i}from"../app/store.js";function a(){return l`
    <${e}
      title="次数不足"
      message="每次成功移调、推子手势、打鼓、歌单/音色发送等扣 1 次；设置、测试音、换鼓组、同步调音台免费。激活码可以增加次数、开通日卡/周卡/月卡或升级永久；如果时长卡仍在有效期内却被要求充值，请检查设备系统时间是否被调早。"
      actions=${[{label:"\u8F93\u5165\u6FC0\u6D3B\u7801 / \u8054\u7CFB\u5BA2\u670D",primary:!0,onClick:()=>i("support")},{label:"\u53D6\u6D88",onClick:()=>o()}]}
      onClose=${o}
    />
  `}export{a as PaywallDialog};
