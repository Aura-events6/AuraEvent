import { useEffect, useRef } from 'react';
import { backDispatcher } from '../navigation/backDispatcher';

export interface UseBackOverlayOptions {
  id?: string;
  hasUnsavedChanges?: () => boolean;
  onUnsavedChangesPrompt?: () => Promise<boolean>;
  priority?: number;
}

/**
 * Declarative hook for any modal, dropdown, sheet, or overlay component.
 * Registers the overlay on the central BackDispatcher stack when open,
 * and automatically unregisters when closed or unmounted.
 */
export function useBackOverlay(
  isOpen: boolean,
  onClose: () => boolean | void | Promise<boolean | void>,
  options?: UseBackOverlayOptions
) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const overlayIdRef = useRef(
    options?.id || `overlay_${Math.random().toString(36).substring(2, 10)}`
  );

  useEffect(() => {
    if (!isOpen) return;

    const overlayId = overlayIdRef.current;
    const unregister = backDispatcher.registerOverlay({
      id: overlayId,
      close: () => closeRef.current(),
      hasUnsavedChanges: optionsRef.current?.hasUnsavedChanges,
      onUnsavedChangesPrompt: optionsRef.current?.onUnsavedChangesPrompt,
      priority: optionsRef.current?.priority,
    });

    return () => {
      unregister();
    };
  }, [isOpen]);
}

