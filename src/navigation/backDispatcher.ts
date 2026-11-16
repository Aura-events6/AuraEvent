import { BackHandler, Keyboard, Platform } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';

export interface OverlayRegistration {
  id: string;
  close: () => boolean | void | Promise<boolean | void>;
  hasUnsavedChanges?: () => boolean;
  onUnsavedChangesPrompt?: () => Promise<boolean>;
  priority?: number; // Higher numbers take precedence within the stack
}

class CentralBackDispatcher {
  private overlayStack: OverlayRegistration[] = [];
  private isKeyboardVisible: boolean = false;
  private lastBackPressTime: number = 0;
  private debounceMs: number = 300;
  private navigationRef: NavigationContainerRef<any> | null = null;
  private homeExitHandler: (() => void) | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.setupKeyboardListeners();
  }

  private setupKeyboardListeners() {
    Keyboard.addListener('keyboardDidShow', () => {
      this.isKeyboardVisible = true;
    });
    Keyboard.addListener('keyboardDidHide', () => {
      this.isKeyboardVisible = false;
    });
  }

  /**
   * Initializes the central back listener on Android hardware back press.
   * Must only be called once at root navigation mount.
   */
  public init(navigationRef: NavigationContainerRef<any>, onHomeExit?: () => void) {
    this.navigationRef = navigationRef;
    if (onHomeExit) {
      this.homeExitHandler = onHomeExit;
    }

    if (this.isInitialized || Platform.OS !== 'android') {
      return;
    }

    this.isInitialized = true;
    BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
  }

  public setHomeExitHandler(handler: (() => void) | null) {
    this.homeExitHandler = handler;
  }

  /**
   * Registers an overlay onto the LIFO overlay stack.
   * Returns an unregister cleanup function.
   */
  public registerOverlay(item: OverlayRegistration): () => void {
    // Remove if already present (idempotent registration)
    this.overlayStack = this.overlayStack.filter(o => o.id !== item.id);
    this.overlayStack.push(item);

    return () => {
      this.unregisterOverlay(item.id);
    };
  }

  public unregisterOverlay(id: string) {
    this.overlayStack = this.overlayStack.filter(o => o.id !== id);
  }

  public getOverlayCount(): number {
    return this.overlayStack.length;
  }

  /**
   * Core dispatch logic implementing the strict 5-rule resolution order:
   * Rule 1: Overlay stack not empty -> unwind top-most overlay (LIFO)
   * Rule 2: Keyboard open -> dismiss keyboard
   * Rule 3: Current screen is NOT Home AND history exists -> pop one screen
   * Rule 4: Current screen is NOT Home AND no history -> reset to Home
   * Rule 5: Current screen IS Home -> trigger exit confirmation dialog
   */
  public handleBackPress = (): boolean => {
    const now = Date.now();
    // Debounce rapid double-triggers
    if (now - this.lastBackPressTime < this.debounceMs) {
      return true; // Consumed to prevent duplicate pops
    }
    this.lastBackPressTime = now;

    // =========================================================================
    // RULE 1: OVERLAY STACK UNWIND (LIFO)
    // =========================================================================
    if (this.overlayStack.length > 0) {
      const topOverlay = this.overlayStack[this.overlayStack.length - 1];

      // Check for unsaved changes confirmation gate
      if (topOverlay.hasUnsavedChanges && topOverlay.hasUnsavedChanges()) {
        if (topOverlay.onUnsavedChangesPrompt) {
          topOverlay.onUnsavedChangesPrompt().then(confirmed => {
            if (confirmed) {
              this.unregisterOverlay(topOverlay.id);
              topOverlay.close();
            }
          });
          return true;
        }
      }

      // Pop and close the top-most overlay only
      this.unregisterOverlay(topOverlay.id);
      try {
        topOverlay.close();
      } catch (err) {
        console.warn('Error closing overlay during back dispatch:', err);
      }
      return true;
    }

    // =========================================================================
    // RULE 2: KEYBOARD DISMISSAL
    // =========================================================================
    if (this.isKeyboardVisible) {
      Keyboard.dismiss();
      this.isKeyboardVisible = false;
      return true;
    }

    // Check Navigation state
    if (!this.navigationRef || !this.navigationRef.isReady()) {
      return false;
    }

    const currentRoute = this.navigationRef.getCurrentRoute();
    const currentRouteName = currentRoute?.name;

    // Canonical Home Identification: 'Dashboard' tab in MainTabs, or 'MainTabs' root
    const isHomeScreen =
      currentRouteName === 'Dashboard' ||
      currentRouteName === 'MainTabs' ||
      currentRouteName === 'SuperAdminHalls';

    // =========================================================================
    // RULE 3: NOT HOME AND HAS HISTORY -> POP ONE SCREEN
    // =========================================================================
    if (!isHomeScreen && this.navigationRef.canGoBack()) {
      this.navigationRef.goBack();
      return true;
    }

    // =========================================================================
    // RULE 4: NOT HOME AND NO HISTORY (DEEP LINK / COLD START) -> RESET TO HOME
    // =========================================================================
    if (!isHomeScreen && !this.navigationRef.canGoBack()) {
      this.navigationRef.reset({
        index: 0,
        routes: [{ name: 'MainTabs', state: { routes: [{ name: 'Dashboard' }] } }],
      });
      return true;
    }

    // =========================================================================
    // RULE 5: IS HOME SCREEN -> SHOW EXIT CONFIRMATION DIALOG
    // =========================================================================
    if (isHomeScreen) {
      if (this.homeExitHandler) {
        this.homeExitHandler();
        return true;
      }
    }

    return true; // Never exit directly without confirmation
  };

  /**
   * Programmatic back invocation (e.g. for header back buttons or custom gestures)
   */
  public dispatchBack(): 'handled' | 'navigated' | 'exit_prompted' {
    const handled = this.handleBackPress();
    return handled ? 'handled' : 'navigated';
  }
}

export const backDispatcher = new CentralBackDispatcher();

