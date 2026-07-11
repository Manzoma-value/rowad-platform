// Server-side QR code helpers. Both APIs return a self-contained SVG string
// so the admin can drop them straight into <img src={qrSvgDataUri}> without
// any client-side lib. Uses the `qrcode` npm package under the hood.
import QRCode from "qrcode";

const DEFAULTS: QRCode.QRCodeToStringOptions = {
  type: "svg",
  errorCorrectionLevel: "M",
  margin: 1,
  width: 320,
  color: { dark: "#1A1A1A", light: "#FFFFFF" },
};

/** Generate the raw SVG markup for a QR encoding `text`. Cheap enough
 *  to call in a route handler and stream inline. */
export async function qrSvg(text: string, opts?: Partial<QRCode.QRCodeToStringOptions>): Promise<string> {
  return QRCode.toString(text, { ...DEFAULTS, ...opts });
}

/** Generate a data-URI PNG so the caller can use it as an <img src>. */
export async function qrDataUri(text: string, opts?: Partial<QRCode.QRCodeToDataURLOptions>): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: { dark: "#1A1A1A", light: "#FFFFFF" },
    ...opts,
  });
}
