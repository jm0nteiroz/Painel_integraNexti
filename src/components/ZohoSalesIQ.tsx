import { useEffect } from "react";

const scriptId = "zsiqscript";

export function ZohoSalesIQ({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) {
      document.getElementById(scriptId)?.remove();
      document.querySelectorAll('[id^="zsiq"], .zsiq_floatmain').forEach((node) => node.remove());
      return;
    }

    if (document.getElementById(scriptId)) return;

    window.$zoho = window.$zoho || {};
    window.$zoho.salesiq = window.$zoho.salesiq || { ready() {} };

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://salesiq.zoho.com/widget?wc=siq33b509eb215d67dcc54866feddfec198262850b1218208583e5c09be67cd9128";
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [enabled]);

  return null;
}

declare global {
  interface Window {
    $zoho?: {
      salesiq?: {
        ready: () => void;
      };
    };
  }
}
