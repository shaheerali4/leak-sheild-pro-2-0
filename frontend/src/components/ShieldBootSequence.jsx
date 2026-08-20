import { useEffect } from "react";

const telemetry = [
  ["KEY EXCHANGE", "boot-label-a"],
  ["VAULT SEAL", "boot-label-b"],
  ["POLICY 0X7F", "boot-label-c"],
  ["NODE // 01", "boot-label-d"],
  ["CIPHER READY", "boot-label-e"],
  ["PERIMETER SYNC", "boot-label-f"]
];

export default function ShieldBootSequence({ onComplete }) {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(onComplete, reducedMotion ? 700 : 5600);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="boot-sequence" role="status" aria-label="LeakShield secure console is unlocking">
      <div className="boot-grid" aria-hidden="true" />
      <div className="boot-scanline" aria-hidden="true" />
      <div className="boot-vignette" aria-hidden="true" />

      <header className="boot-heading">
        <span>SECURE BOOT // LS_KERNEL_2.0</span>
        <strong>LeakShield Pro 2.0</strong>
        <small>PUBLIC DEFENSE CONTROL PLANE</small>
      </header>

      <div className="boot-crosshair" aria-hidden="true"><i /><i /><span /></div>

      <div className="boot-emblem" aria-hidden="true">
        <div className="boot-orbit boot-orbit-outer" />
        <div className="boot-orbit boot-orbit-inner" />
        <svg className="boot-shield" viewBox="0 0 260 300" fill="none">
          <path className="shield-half shield-half-left" d="M130 18C98 39 68 49 31 55v84c0 68 36 116 99 143V18Z" />
          <path className="shield-half shield-half-right" d="M130 18c32 21 62 31 99 37v84c0 68-36 116-99 143V18Z" />
          <path className="shield-trace" d="M130 18C98 39 68 49 31 55v84c0 68 36 116 99 143 63-27 99-75 99-143V55c-37-6-67-16-99-37Z" />
        </svg>
        <div className="boot-lock">
          <span className="lock-shackle" />
          <span className="lock-body"><i /></span>
        </div>
        <span className="boot-core" />
      </div>

      <div className="boot-progress" aria-hidden="true"><span /></div>
      <p className="boot-status"><span>AUTHENTICATING DEFENSE LAYERS</span><b>ACCESS GRANTED</b></p>

      <div className="boot-telemetry" aria-hidden="true">
        {telemetry.map(([label, className]) => <span className={className} key={label}>{label}</span>)}
      </div>
      <div className="boot-ticker boot-ticker-top" aria-hidden="true">LS20&nbsp;&nbsp; CIPHER&nbsp;&nbsp; KERNEL&nbsp;&nbsp; WATCH&nbsp;&nbsp; NULL&nbsp;&nbsp; TRACE&nbsp;&nbsp; RX&nbsp;&nbsp; VAULT&nbsp;&nbsp; SHIELD&nbsp;&nbsp; 0110&nbsp;&nbsp; 73A4</div>
      <div className="boot-ticker boot-ticker-bottom" aria-hidden="true">PERIMETER&nbsp;&nbsp; POLICY&nbsp;&nbsp; TOKEN&nbsp;&nbsp; VERIFY&nbsp;&nbsp; NODE&nbsp;&nbsp; DEFENSE&nbsp;&nbsp; HASH&nbsp;&nbsp; LOCK&nbsp;&nbsp; OPEN&nbsp;&nbsp; LS20</div>

      <button className="boot-skip" type="button" onClick={onComplete}>SKIP INTRO [ESC]</button>
      <div className="boot-door boot-door-left" aria-hidden="true" />
      <div className="boot-door boot-door-right" aria-hidden="true" />
    </div>
  );
}
