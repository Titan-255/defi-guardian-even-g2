import {
  waitForEvenAppBridge,
  TextContainerProperty,
  CreateStartUpPageContainer,
  TextContainerUpgrade,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk';

export type EvenEventHandler = (type: 'CLICK' | 'DOUBLE_CLICK' | 'SCROLL_UP' | 'SCROLL_DOWN' | 'EXIT') => void;

class EvenBridgeService {
  private bridge: any = null;
  private isConnected = false;
  private listeners: EvenEventHandler[] = [];
  private unsubscribeNative: (() => void) | null = null;
  private isPageCreated = false;

  async initialize(): Promise<boolean> {
    try {
      // Allow up to 2 seconds for EvenAppBridge to attach (present in Even Hub WebView & simulator)
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
      const bridgePromise = waitForEvenAppBridge();
      
      const res = await Promise.race([bridgePromise, timeoutPromise]);
      if (res) {
        this.bridge = res;
        this.isConnected = true;
        console.log('[EvenBridge] Connected to official Even Hub SDK Bridge!');
        this.setupEventListeners();
        await this.createInitialContainers();
        return true;
      } else {
        console.log('[EvenBridge] Running in browser preview mode (Bridge not detected)');
        return false;
      }
    } catch (err) {
      console.warn('[EvenBridge] Bridge initialization caught exception:', err);
      return false;
    }
  }

  get isBridgeActive(): boolean {
    return this.isConnected;
  }

  private async createInitialContainers() {
    if (!this.bridge || this.isPageCreated) return;

    try {
      const mainContainer = new TextContainerProperty({
        xPosition: 0,
        yPosition: 0,
        width: 576,
        height: 250,
        borderWidth: 0,
        borderColor: 5,
        paddingLength: 4,
        containerID: 1,
        containerName: 'main_hud',
        content: 'DEFI GUARDIAN\nStarting Crypto Intelligence HUD...',
        isEventCapture: 1,
      });

      const navContainer = new TextContainerProperty({
        xPosition: 0,
        yPosition: 254,
        width: 576,
        height: 30,
        borderWidth: 0,
        borderColor: 5,
        paddingLength: 4,
        containerID: 2,
        containerName: 'nav_bar',
        content: 'Tap: Next  |  Swipe: Nav  |  Double-Tap: Exit',
        isEventCapture: 0,
      });

      const res = await this.bridge.createStartUpPageContainer(
        new CreateStartUpPageContainer({
          containerTotalNum: 2,
          textObject: [mainContainer, navContainer],
        })
      );
      this.isPageCreated = res === 0;
      console.log('[EvenBridge] StartUpPageContainer created result:', res);
    } catch (e) {
      console.error('[EvenBridge] Failed to create startup page container:', e);
    }
  }

  private eventTypeOf(envelope?: { eventType?: OsEventTypeList }): OsEventTypeList | null {
    if (!envelope) return null;
    return envelope.eventType ?? OsEventTypeList.CLICK_EVENT;
  }

  private setupEventListeners() {
    if (!this.bridge) return;

    this.unsubscribeNative = this.bridge.onEvenHubEvent((event: any) => {
      const sysType = this.eventTypeOf(event?.sysEvent);
      const textType = this.eventTypeOf(event?.textEvent);

      // Double click -> standard G2 exit
      if (sysType === OsEventTypeList.DOUBLE_CLICK_EVENT || textType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
        this.emit('DOUBLE_CLICK');
        this.bridge.shutDownPageContainer(1);
        return;
      }

      // Scroll gestures
      if (textType === OsEventTypeList.SCROLL_TOP_EVENT) {
        this.emit('SCROLL_UP');
        return;
      }
      if (textType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
        this.emit('SCROLL_DOWN');
        return;
      }

      // Single click
      if (sysType === OsEventTypeList.CLICK_EVENT || textType === OsEventTypeList.CLICK_EVENT) {
        this.emit('CLICK');
        return;
      }

      // Exit events
      if (sysType === OsEventTypeList.SYSTEM_EXIT_EVENT || sysType === OsEventTypeList.ABNORMAL_EXIT_EVENT) {
        this.emit('EXIT');
        this.cleanup();
      }
    });
  }

  async updateDisplay(mainContent: string, navContent: string) {
    if (!this.bridge || !this.isPageCreated) return;

    try {
      await this.bridge.textContainerUpgrade(
        new TextContainerUpgrade({
          containerID: 1,
          containerName: 'main_hud',
          content: mainContent.slice(0, 1000),
        })
      );

      await this.bridge.textContainerUpgrade(
        new TextContainerUpgrade({
          containerID: 2,
          containerName: 'nav_bar',
          content: navContent.slice(0, 500),
        })
      );
    } catch (err) {
      console.warn('[EvenBridge] Failed to update container text:', err);
    }
  }

  subscribe(handler: EvenEventHandler): () => void {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter((h) => h !== handler);
    };
  }

  private emit(type: 'CLICK' | 'DOUBLE_CLICK' | 'SCROLL_UP' | 'SCROLL_DOWN' | 'EXIT') {
    this.listeners.forEach((fn) => fn(type));
  }

  cleanup() {
    if (this.unsubscribeNative) {
      this.unsubscribeNative();
      this.unsubscribeNative = null;
    }
  }
}

export const evenBridge = new EvenBridgeService();
