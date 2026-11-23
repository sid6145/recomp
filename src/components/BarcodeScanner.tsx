import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import { MaterialIcon } from './MaterialIcon';
import { Html5Qrcode } from 'html5-qrcode';
import { useHaptics } from '../hooks/useHaptics';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const haptics = useHaptics();

  // Preserve exact Barcode Scanner Camera Lifecycle
  useEffect(() => {
    if (!isOpen) return;

    setScanError(null);
    setIsInitializing(true);
    const viewportId = 'barcode-scanner-viewport';

    const timer = setTimeout(() => {
      try {
        const html5QrCode = new Html5Qrcode(viewportId);
        scannerRef.current = html5QrCode;

        html5QrCode
          .start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 240, height: 240 },
              aspectRatio: 1.0,
            },
            async (decodedText) => {
              try {
                if (html5QrCode.isScanning) {
                  await html5QrCode.stop();
                  html5QrCode.clear();
                }
              } catch (err) {
                console.warn('[BarcodeScanner] Error stopping scanner on scan:', err);
              }
              haptics.success();
              onScanSuccess(decodedText);
              onClose();
            },
            () => {
              // Frame-by-frame non-match is normal
            }
          )
          .then(() => {
            setIsInitializing(false);
          })
          .catch((err) => {
            console.error('[BarcodeScanner] Camera initialization failed:', err);
            setScanError(
              'Camera unavailable or permission denied. You can enter the barcode manually below.'
            );
            setIsInitializing(false);
          });
      } catch (err) {
        console.error('[BarcodeScanner] Instantiation error:', err);
        setScanError('Failed to initialize barcode scanner.');
        setIsInitializing(false);
      }
    }, 120);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current
            .stop()
            .then(() => scannerRef.current?.clear())
            .catch(() => {});
        }
      }
    };
  }, [isOpen, onClose, onScanSuccess, haptics]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;

    haptics.tick();
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current
        .stop()
        .then(() => scannerRef.current?.clear())
        .catch(() => {});
    }
    haptics.success();
    onScanSuccess(clean);
    onClose();
  };

  const handleClose = async () => {
    haptics.tick();
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.warn('[BarcodeScanner] Close error:', err);
      }
    }
    onClose();
  };

  const handleToggleTorch = async () => {
    haptics.tick();
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        const scannerAny = scannerRef.current as unknown as {
          applyVideoConstraints: (constraints: unknown) => Promise<void>;
        };
        await scannerAny.applyVideoConstraints({
          advanced: [{ torch: !isTorchOn }],
        });
        setIsTorchOn((prev) => !prev);
      } catch (e) {
        console.warn('[BarcodeScanner] Torch not supported:', e);
      }
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
        {/* Backdrop Scrim (rgba(0,0,0,0.32)) */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
        />

        {/* M3 Modal Bottom Sheet */}
        <m.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-md rounded-t-[28px] sm:rounded-[28px] bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden z-10 border-t sm:border border-[var(--md-outline-variant)]/30"
          role="dialog"
          aria-modal="true"
        >
          {/* Centered 32px × 4px Drag Handle Pill */}
          <div className="w-full flex justify-center pt-3 pb-1 shrink-0 cursor-grab">
            <div className="w-8 h-1 rounded-full bg-[var(--md-outline-variant)] opacity-60" />
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--md-outline-variant)]/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center">
                  <MaterialIcon name="barcode_scanner" size={18} />
                </div>
                <h3 className="text-base font-bold font-display text-[var(--md-on-surface)]">
                  Barcode Scanner
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--md-on-surface-variant)] hover:bg-[var(--md-on-surface)]/10 transition-colors m3-state-layer cursor-pointer"
                title="Close scanner"
              >
                <MaterialIcon name="close" size={20} />
              </button>
            </div>

            {/* Camera Viewport Inside rounded-[24px] Viewfinder with M3 Corner Brackets */}
            <div className="relative overflow-hidden rounded-[24px] bg-black aspect-square flex items-center justify-center border border-[var(--md-outline-variant)]/40 shadow-inner">
              <div id="barcode-scanner-viewport" className="w-full h-full" />

              {/* M3 Corner Brackets */}
              <div className="pointer-events-none absolute inset-6 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-3 border-l-3 border-[var(--md-primary)] rounded-tl-lg" />
                  <div className="w-6 h-6 border-t-3 border-r-3 border-[var(--md-primary)] rounded-tr-lg" />
                </div>
                {/* Animated Horizontal Laser Scan Line */}
                <div className="w-full h-0.5 bg-[var(--md-primary)] animate-pulse shadow-[0_0_12px_var(--md-primary)]" />
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-3 border-l-3 border-[var(--md-primary)] rounded-bl-lg" />
                  <div className="w-6 h-6 border-b-3 border-r-3 border-[var(--md-primary)] rounded-br-lg" />
                </div>
              </div>

              {/* Torch Toggle Pill */}
              <button
                type="button"
                onClick={handleToggleTorch}
                className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-display flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 m3-state-layer"
                title="Toggle Torch"
              >
                <MaterialIcon name={isTorchOn ? 'flash_on' : 'flash_off'} size={16} />
                <span>Torch</span>
              </button>

              {isInitializing && (
                <div className="absolute inset-0 bg-[var(--md-surface-container-high)]/90 flex flex-col items-center justify-center gap-2 text-[var(--md-on-surface-variant)] text-xs font-display">
                  <MaterialIcon name="refresh" size={24} className="animate-spin text-[var(--md-primary)]" />
                  <span>Starting Camera...</span>
                </div>
              )}
            </div>

            <p className="text-xs text-center text-[var(--md-on-surface-variant)] font-sans">
              Align barcode within corner brackets to auto-detect food.
            </p>

            {/* Error Message */}
            {scanError && (
              <div className="p-3 rounded-[16px] bg-[var(--md-error-container)] text-[var(--md-on-error-container)] text-xs flex items-center gap-2">
                <MaterialIcon name="error" size={18} />
                <span>{scanError}</span>
              </div>
            )}

            {/* Manual Barcode Input Fallback */}
            <form onSubmit={handleManualSubmit} className="pt-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter barcode number..."
                    className="w-full h-12 bg-[var(--md-surface-container)] text-[var(--md-on-surface)] rounded-full px-4 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)] placeholder-[var(--md-on-surface-variant)]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="h-12 px-5 rounded-full text-xs font-display font-bold bg-[var(--md-primary)] text-[var(--md-on-primary)] disabled:opacity-40 cursor-pointer shadow-sm active:scale-95 m3-state-layer"
                >
                  Lookup
                </button>
              </div>
            </form>
          </div>
        </m.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
