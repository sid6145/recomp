import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, AlertCircle, Barcode, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useHaptics } from '../hooks/useHaptics';
import { AgenticTransition } from '../utils/motionPresets';

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

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const haptics = useHaptics();

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

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="barcode-scanner-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-2xl"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            transition={AgenticTransition}
            className="relative w-full max-w-sm rounded-3xl border border-white/5 bg-neutral-900/95 backdrop-blur-2xl p-5 sm:p-6 space-y-4 shadow-2xl text-neutral-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#00FF41]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-100 font-mono">
                  Barcode Scanner
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors flex items-center justify-center cursor-pointer"
                title="Close scanner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Camera Viewport */}
            <div className="relative overflow-hidden rounded-2xl bg-black border border-white/5 aspect-square flex items-center justify-center">
              <div id="barcode-scanner-viewport" className="w-full h-full" />

              {/* Viewfinder crosshairs & animated laser line */}
              <div className="pointer-events-none absolute inset-8 border-2 border-dashed border-[#00FF41]/60 rounded-2xl flex flex-col items-center justify-center">
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#00FF41] to-transparent animate-pulse shadow-[0_0_12px_rgba(0,255,65,0.8)]" />
              </div>

              {isInitializing && (
                <div className="absolute inset-0 bg-neutral-950/80 flex flex-col items-center justify-center gap-2 text-neutral-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00FF41]" />
                  <span className="font-mono">Opening Camera...</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-center text-neutral-400 font-sans">
              Align barcode within frame to auto-detect packaged food items.
            </p>

            {/* Error Message */}
            {scanError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{scanError}</span>
              </div>
            )}

            {/* Manual Barcode Fallback */}
            <form onSubmit={handleManualSubmit} className="pt-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Barcode className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Or enter barcode number..."
                    className="w-full min-h-[44px] bg-neutral-950 border border-white/5 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-[#00FF41]/60 focus:ring-1 focus:ring-[#00FF41]/40"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-[#00FF41] hover:bg-[#00FF41]/90 text-neutral-950 disabled:opacity-40 cursor-pointer shadow-md transition-all active:scale-95 flex items-center justify-center"
                >
                  Lookup
                </button>
              </div>
            </form>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={handleClose}
              className="w-full min-h-[44px] py-2.5 rounded-xl text-xs font-mono font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer flex items-center justify-center"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
};
