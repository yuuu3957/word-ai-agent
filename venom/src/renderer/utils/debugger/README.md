# Venom Debugger

Venom Debugger 是一個用來協助開發者在開發過程中能夠更方便地觀察 Venom 的工具。

## Get Started

在你的專案中引入 Venom Debugger，並使用以下方式來監控 Venom 相關物件。

針對單一物件監控時，其子物件也會自動被監控。
例如，當你監控一個 SubscribedHost 時，其下的 SubscribedHomElements 與 HomElement 也會被自動監控。

```typescript
import VenomDebugger from './utils/debugger';

// 針對整個 Venom 實例進行監控
const venom = await Venom.create();
const debugVenom = VenomDebugger.attach(venom);

// 針對單一 SubscribedHost 進行監控
const subscribedHost = await debugVenom.getSubscribedHost(descriptor);
const debugSubscribedHost = VenomDebugger.attachSubscribedHost(subscribedHost);

// 針對單一 SubscribedHomElements 進行監控
const subscribedHomElements =
  await subscribedHost.getElementsByDescriptor(descriptor);
const debugSubscribedHomElements = VenomDebugger.attachSubscribedHomElements(
  subscribedHomElements,
);

// 針對單一 Host 進行監控
const hosts = await venom.getHosts(descriptor);
const debugHosts = hosts.map((host) => VenomDebugger.attachHost(host));

// 針對單一 HomElement 進行監控
const homElement = await subscribedHomElements.item(0);
const debugHomElement = VenomDebugger.attachHomElement(homElement);
```

## Features

Venom Debugger 提供以下功能：

- 監控 Venom 函式呼叫

  - 以下所有函式呼叫皆會在 Debugger 面板及 Console 顯示呼叫資訊
  - [Venom](./index.ts) ([HOM Docs](http://140.115.59.175:8082/HostObjectModel/v3.2.0/classes/Venom.html))
  - [SubscribedHost](./subscribedHost/index.ts) ([HOM Docs](http://140.115.59.175:8082/HostObjectModel/v3.2.0/classes/SubscribedHost.html))
  - [SubscribedHomElements](./subscribedHomElements/index.ts) ([HOM Docs](http://140.115.59.175:8082/HostObjectModel/v3.2.0/classes/SubscribedHomElements.html))
  - [Host](./host/index.ts) ([HOM Docs](http://140.115.59.175:8082/HostObjectModel/v3.2.0/classes/Host.html))
  - [HomElement](./homElement/index.ts) ([HOM Docs](http://140.115.59.175:8082/HostObjectModel/v3.2.0/classes/HomElement.html))

- 監控 SubscribedHost 與 SubscribedHomElements 的事件
  - 當開發者註冊任一 `onXXXChanged` 時，Debugger 會自動監控並於 Debugger 面板及 Console 顯示事件觸發資訊
  - 針對 `onBoundingBoxChanged` 事件，在畫面上顯示對應的邊框位置
