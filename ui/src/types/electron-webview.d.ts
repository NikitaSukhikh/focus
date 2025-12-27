/* eslint-disable no-unused-vars */
export {};

declare class HTMLWebViewElement extends HTMLElement {
  src: string;
  reload(): void;
  loadURL(_url: string): void;
}

declare global {
  namespace React {
    interface WebViewHTMLAttributes<T> extends HTMLAttributes<T> {
      allowpopups?: string;
      src?: string;
      partition?: string;
      preload?: string;
    }

    interface IntrinsicElements {
      webview: DetailedHTMLProps<WebViewHTMLAttributes<HTMLWebViewElement>, HTMLWebViewElement>;
    }
  }
}
