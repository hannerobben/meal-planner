export class ScreenSizeUtil {
    public static setViewportHeight() {
        document.documentElement.style.setProperty('--vh', `${window.innerHeight}px`);
    }

    public static watchViewPortChange(): void {
        new ResizeObserver(() => {
            ScreenSizeUtil.setViewportHeight();
        }).observe(document.documentElement);
    }
}
