<p align="center">
  <a href="https://paybill.ke" target="_blank">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://paybill.ke/logo-wordmark--dark.png">
      <img src="https://paybill.ke/logo-wordmark--light.png" width="180" alt="Paybill Kenya Logo">
    </picture>
  </a>
</p>

# URA EFRIS System-to-System Integration SDK (JavaScript)

![JavaScript](https://img.shields.io/badge/JavaScript-ES2020%2B-F7DF1E?logo=javascript)
![Node.js](https://img.shields.io/badge/Node.js-16%2B-339933?logo=node.js)
![License](https://img.shields.io/badge/License-MIT-green)
![URA EFRIS](https://img.shields.io/badge/URA-EFRIS-2E8B57)
![NPM](https://img.shields.io/badge/NPM-Compatible-CB3837?logo=npm)
![Production Ready](https://img.shields.io/badge/Status-Production_Ready-success)

A production-ready **JavaScript SDK** for integrating with the Uganda Revenue Authority (URA) **EFRIS** (Electronic Fiscal Receipting and Invoicing System) via the **System-to-System (S2S)** interface.

Built in accordance with official URA EFRIS technical specifications, encryption standards, device registration workflows, and Offline Mode Enabler requirements.

---

## Official URA EFRIS Documentation

📄 **Step-by-Step Guide – System-to-System Integration (v1.1)**  
https://efris.ura.go.ug/site/manualDownload/downloadManualById?id=569326253531712032&language=

📄 **Offline-Mode Enabler – Hardware & Software Requirements**  
https://efris.ura.go.ug/site/manualDownload/downloadManualById?id=779571457750410225&language=

📄 **Offline-Mode Enabler – Installation Guide**  
https://efris.ura.go.ug/site/manualDownload/downloadManualById?id=537308370255165978&language=

📄 **Interface Requirements for Information Management and Fiscalisation**  
https://efris.ura.go.ug/site/manualDownload/downloadManualById?id=173517733139059055&language=

📄 **EFRIS Thumbprint & Device Registration Guide**  
https://efris.ura.go.ug/site/manualDownload/downloadManualById?id=102729662704726203&language=

📄 **EFRIS Interface Design v23.7 Guide**  
https://efris.ura.go.ug/site/manualDownload/downloadManualById?id=299638647648159087&language=

---

> ⚠️ **Important Notice**  
> This SDK implements the **URA EFRIS System-to-System (S2S)** integration model.  
> Proper onboarding, certificate provisioning, and device registration with URA are required before production use.

---

## Features

✅ System-to-System (S2S) API integration  
✅ AES/RSA payload encryption & digital signatures  
✅ URA-compliant request/response handling  
✅ Device & taxpayer authentication helpers  
✅ Timezone-safe timestamp utilities (EAT / UTC)  
✅ Offline Mode Enabler compatibility  
✅ Axios / Fetch compatible HTTP layer  
✅ Robust error handling & validation  

---

## Installation

Install via **npm**:

```bash
npm install ura-efris-sdk
````

or via **yarn**:

```bash
yarn add ura-efris-sdk
```

---

## Author

**Bartile Emmanuel**
📧 [support@paybill.dev](mailto:support@paybill.dev) | 📱 +254 757 807 150
*Lead Developer, Paybill Kenya*

📘 URA EFRIS Documentation (Paybill):
[https://paybill.ke/docs/ura-efris](https://paybill.ke/docs/ura-efris)

---

## License

MIT © 2025–2026 Paybill Kenya Limited

🇺🇬 **Supporting Digital Tax Compliance in Uganda**
🇰🇪 Proudly engineered by Paybill Kenya Limited
